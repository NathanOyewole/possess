"use client";

import { useEffect, useMemo, useState } from "react";
import { CHOG_NFT, CHOG_TOKEN, MONAD, SUPPLY, RUN_MS, archetype, stats } from "@/lib/chain";
import { chogBalance, connectMonad, ownerOf, short } from "@/lib/eth";
import { loadRuns, upsert, type Run } from "@/lib/runs";

export default function Page() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState("313");
  const [owner, setOwner] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("—");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [now, setNow] = useState(Date.now());

  const id = Number(tokenId);
  const valid = Number.isInteger(id) && id >= 0 && id < SUPPLY;
  const face = valid ? archetype(id) : null;
  const roll = valid ? stats(id) : null;
  const run = runs.find((r) => r.tokenId === id) ?? null;
  const owns = account && owner && account.toLowerCase() === owner.toLowerCase();
  const left = run ? Math.max(0, run.startedAt + RUN_MS - now) : 0;

  useEffect(() => {
    setRuns(loadRuns());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!valid) return;
    ownerOf(CHOG_NFT, id)
      .then(setOwner)
      .catch((e) => setError(e.message));
  }, [id, valid]);

  const clock = useMemo(() => {
    const s = Math.floor(left / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }, [left]);

  async function onConnect() {
    setError("");
    setBusy(true);
    try {
      const addr = await connectMonad();
      setAccount(addr);
      const bal = await chogBalance(CHOG_TOKEN, addr);
      setBalance((Number(bal / 10n ** 15n) / 1000).toFixed(2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "connect failed");
    } finally {
      setBusy(false);
    }
  }

  function possess() {
    if (!owns || !account || !valid) return;
    const next: Run = {
      tokenId: id,
      owner: account,
      startedAt: Date.now(),
      heat: roll?.chaos ?? 50,
      scars: [{ at: Date.now(), note: "possessed", by: account }],
      alive: true,
    };
    setRuns(upsert(next));
  }

  function challenge() {
    if (!run || !run.alive) return;
    const hit = Math.random() > 0.45;
    const next: Run = {
      ...run,
      heat: Math.min(100, run.heat + (hit ? 8 : -6)),
      alive: hit ? run.alive : run.heat < 30 ? false : run.alive,
      scars: [
        { at: Date.now(), note: hit ? "took the hit, kept the body" : "slipped", by: account || "anon" },
        ...run.scars,
      ].slice(0, 8),
    };
    setRuns(upsert(next));
  }

  return (
    <main className="wrap">
      <header className="top">
        <div className="mark"><span className="dot" /> POSSESS</div>
        <button onClick={onConnect} disabled={busy}>
          {account ? short(account) : "Connect Monad"}
        </button>
      </header>

      <h1>The NFT is the save file.</h1>
      <p className="lede">
        A Chog is not a picture here. Token id seeds the body. Scars write back to that id.
        Sell it mid-run and the next owner inherits the session. No Chog, no character.
      </p>
      <div className="row">
        <input value={tokenId} onChange={(e) => setTokenId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
        <button className="primary" disabled={!owns || !valid} onClick={possess}>Possess</button>
        <button disabled={!run?.alive || left <= 0} onClick={challenge}>Challenge</button>
      </div>
      {error && <p className="err">{error}</p>}

      <section className="grid">
        <article className="card">
          <div className="kicker">{valid ? `Chog #${id}` : "Bad id"}</div>
          <h2 style={{ margin: "8px 0 0" }}>{face ? face.name : "—"}</h2>
          <p className="lede">{face ? face.line : "Ids run 0–1968."}</p>
          {roll && (
            <div className="stats">
              <div className="stat"><b>{roll.nerve}</b><span>nerve</span></div>
              <div className="stat"><b>{roll.chaos}</b><span>chaos</span></div>
              <div className="stat"><b>{roll.grit}</b><span>grit</span></div>
            </div>
          )}
          <p className="fine">
            Owner {owner ? short(owner) : "…"}. {owns ? "You hold this body." : "You do not hold this body. Possess stays locked."}
          </p>
          {run && (
            <>
              <p>{run.alive && left > 0 ? `Run live · ${clock} left · heat ${run.heat}` : "Run dead. Revive costs $CHOG."}</p>
              {run.scars.map((s) => (
                <div className="scar" key={s.at}>{s.note} · {short(s.by)}</div>
              ))}
            </>
          )}
        </article>
        <aside className="card">
          <div className="kicker">Why it fails without the NFT</div>
          <p className="fine">
            Stats, scars, and the clock are keyed to token id, not the wallet. ownerOf on Chog Genesis is the gate.
            $CHOG balance is the revive lever. Yours: {balance}.
          </p>
          <div className="board">
            {runs.length === 0 && <div className="pill"><span>No bodies yet</span><span>—</span></div>}
            {runs.map((r) => (
              <button key={r.tokenId} className="pill" onClick={() => setTokenId(String(r.tokenId))}>
                <span>#{r.tokenId} · {archetype(r.tokenId).name}</span>
                <span>{r.alive ? "live" : "dead"}</span>
              </button>
            ))}
          </div>
          <p className="fine">
            Genesis {CHOG_NFT.slice(0, 8)}… · $CHOG {CHOG_TOKEN.slice(0, 8)}… · {MONAD.name} {MONAD.id}
          </p>
        </aside>
      </section>
    </main>
  );
}
