"use client";

import { useEffect, useMemo, useState } from "react";
import { CHOG_NFT, CHOG_TOKEN, MONAD, SUPPLY, RUN_MS, archetype, stats } from "@/lib/chain";
import { chogBalance, connectMonad, ownerOf, short } from "@/lib/eth";
import { loadRuns, upsert, type Run } from "@/lib/runs";

export default function Page() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState("313");
  const [owner, setOwner] = useState<string | null>(null);
  const [balance, setBalance] = useState("—");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [now, setNow] = useState(Date.now());
  const [demo, setDemo] = useState(false);

  const id = Number(tokenId);
  const valid = Number.isInteger(id) && id >= 0 && id < SUPPLY;
  const face = valid ? archetype(id) : null;
  const roll = valid ? stats(id) : null;
  const run = runs.find((r) => r.tokenId === id) ?? null;
  const owns = Boolean(account && owner && account.toLowerCase() === owner.toLowerCase());
  const canPossess = valid && (owns || demo);
  const left = run ? Math.max(0, run.startedAt + RUN_MS - now) : 0;

  useEffect(() => {
    setRuns(loadRuns());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!valid) return;
    setOwner(null);
    ownerOf(CHOG_NFT, id).then(setOwner).catch((e) => setError(e.message));
  }, [id, valid]);

  const clock = useMemo(() => {
    const s = Math.floor(left / 1000);
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
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
    if (!canPossess) return;
    const who = account || "demo";
    setRuns(upsert({
      tokenId: id,
      owner: owner || who,
      startedAt: Date.now(),
      heat: roll?.chaos ?? 50,
      scars: [{ at: Date.now(), note: demo && !owns ? "demo possess" : "possessed", by: who }],
      alive: true,
    }));
  }

  function challenge() {
    if (!run?.alive || left <= 0) return;
    const hit = Math.random() > 0.45;
    setRuns(upsert({
      ...run,
      heat: Math.max(0, Math.min(100, run.heat + (hit ? 8 : -6))),
      alive: hit || run.heat >= 30,
      scars: [
        { at: Date.now(), note: hit ? "took the hit, kept the body" : "slipped", by: account || "anon" },
        ...run.scars,
      ].slice(0, 6),
    }));
  }

  return (
    <main className="shell">
      <header className="nav">
        <div className="brand"><i /> POSSESS</div>
        <div className="nav-actions">
          <button className={demo ? "on" : ""} onClick={() => setDemo((v) => !v)}>
            {demo ? "Demo on" : "Demo off"}
          </button>
          <button className="primary" onClick={onConnect} disabled={busy}>
            {account ? short(account) : busy ? "Connecting" : "Connect"}
          </button>
        </div>
      </header>

      <section className="hero">
        <p className="kicker">Chog Genesis · Monad</p>
        <h1>The NFT is the save file.</h1>
        <p className="lede">Token id seeds the body. Scars stick to that id. Sell it and the next owner inherits the run.</p>
      </section>

      <section className="stage">
        <article className="body">
          <div className="face" data-arch={face?.name || "none"}>
            <span>{valid ? `#${id}` : "—"}</span>
            <strong>{face?.name || "No body"}</strong>
            <em>{face?.line || "Ids run 0–1968"}</em>
          </div>
          <div className="stats">
            <div><b>{roll?.nerve ?? "—"}</b><span>nerve</span></div>
            <div><b>{roll?.chaos ?? "—"}</b><span>chaos</span></div>
            <div><b>{roll?.grit ?? "—"}</b><span>grit</span></div>
          </div>
          <div className="ownerline">
            <span>Owner</span>
            <b>{owner ? short(owner) : valid ? "reading…" : "—"}</b>
          </div>
          <p className={owns ? "ok" : "lock"}>
            {owns ? "You hold this body." : demo ? "Demo only. Real Possess stays locked without the NFT." : "You do not hold this body."}
          </p>
          {run && <p className="clock">{run.alive && left > 0 ? `${clock} · heat ${run.heat}` : "Run dead. Revive costs $CHOG."}</p>}
          <div className="scars">
            {(run?.scars || []).map((s) => <div key={s.at}>{s.note}<span>{short(s.by)}</span></div>)}
          </div>
        </article>

        <aside className="panel">
          <label>Token id</label>
          <input value={tokenId} inputMode="numeric" onChange={(e) => setTokenId(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <button className="primary block" disabled={!canPossess} onClick={possess}>Possess</button>
          <button className="block" disabled={!run?.alive || left <= 0} onClick={challenge}>Challenge</button>
          {error && <p className="err">{error}</p>}
          <div className="meta">
            <span>$CHOG {balance}</span>
            <span>{MONAD.name} {MONAD.id}</span>
          </div>
          <div className="board">
            {runs.length === 0 && <p className="empty">No runs yet.</p>}
            {runs.map((r) => (
              <button key={r.tokenId} onClick={() => setTokenId(String(r.tokenId))}>
                <span>#{r.tokenId} · {archetype(r.tokenId).name}</span>
                <b>{r.alive ? "live" : "dead"}</b>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
