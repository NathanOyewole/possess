"use client";

import { useEffect, useMemo, useState } from "react";
import { CHOG_NFT, CHOG_TOKEN, MONAD, SUPPLY, RUN_MS, archetype, stats } from "@/lib/chain";
import { chogBalance, connectMonad, ownerOf, short, tokenMeta } from "@/lib/eth";
import { loadRuns, upsert, type Run } from "@/lib/runs";
import {
  POSSESS_ADDRESS,
  readRun,
  encodePossess,
  encodeChallenge,
  encodeRevive,
  sendTx,
  waitForReceipt,
} from "@/lib/contract";

export default function Page() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState("313");
  const [owner, setOwner] = useState<string | null>(null);
  const [balance, setBalance] = useState("—");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [now, setNow] = useState(Date.now());
  const [demo, setDemo] = useState(false);
  const [meta, setMeta] = useState<{ name: string; image: string } | null>(null);
  const [striking, setStriking] = useState(false);
  const [marker, setMarker] = useState(0);
  const [strikeResult, setStrikeResult] = useState<"hit" | "miss" | null>(null);
  const [onChain, setOnChain] = useState(false);

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
    setMeta(null);
    setOnChain(false);
    ownerOf(CHOG_NFT, id).then(setOwner).catch((e) => setError(e.message));
    tokenMeta(CHOG_NFT, id).then(setMeta).catch(() => setMeta(null));
    readRun(id).then((r) => {
      if (r && r.startedAt > 0) {
        setOnChain(true);
        setRuns((prev) => {
          const filtered = prev.filter((x) => x.tokenId !== id);
          return [
            { tokenId: id, owner: owner || "on-chain", startedAt: r.startedAt, heat: r.heat, alive: r.alive, scars: [] },
            ...filtered,
          ];
        });
      }
    });
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
      setBalance((Number(bal / BigInt(1e15)) / 1000).toFixed(2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function possess() {
    if (!canPossess) return;
    setError("");
    setBusy(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      const data = encodePossess(id);
      const hash = await sendTx(data);
      setTxHash(hash);
      const ok = await waitForReceipt(hash);
      if (!ok) throw new Error("Transaction failed");
      const r = await readRun(id);
      if (r && r.startedAt > 0) {
        setOnChain(true);
        const who = account || "demo";
        setRuns(
          upsert({
            tokenId: id,
            owner: owner || who,
            startedAt: r.startedAt,
            heat: r.heat,
            alive: r.alive,
            scars: [{ at: Date.now(), note: demo && !owns ? "demo possess" : "possessed", by: who }],
          })
        );
      }
      setTxStatus("success");
    } catch (e) {
      setTxStatus("failed");
      setError(e instanceof Error ? e.message : "possess failed");
    } finally {
      setBusy(false);
    }
  }

  function openChallenge() {
    if (!run?.alive || left <= 0) return;
    setStrikeResult(null);
    setMarker(0);
    setStriking(true);
    const start = Date.now();
    const duration = 2000;
    const iv = setInterval(() => {
      const t = (Date.now() - start) % duration;
      setMarker(Math.round((t / duration) * 100));
    }, 30);
    // auto-miss after one full sweep
    setTimeout(() => {
      clearInterval(iv);
      setStriking(false);
      setStrikeResult("miss");
      doChallenge(false);
    }, duration);
    // store interval id to clear on strike
    (window as any).__strikeIv = iv;
  }

  async function doChallenge(hit: boolean) {
    setError("");
    setBusy(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      const data = encodeChallenge(id, hit);
      const hash = await sendTx(data);
      setTxHash(hash);
      const ok = await waitForReceipt(hash);
      if (!ok) throw new Error("Transaction failed");
      const r = await readRun(id);
      if (r) {
        setRuns(
          upsert({
            ...run!,
            heat: r.heat,
            alive: r.alive,
            scars: [{ at: Date.now(), note: hit ? "took the hit, kept the body" : "slipped", by: account || "anon" }, ...(run?.scars || [])].slice(0, 6),
          })
        );
      }
      setTxStatus("success");
    } catch (e) {
      setTxStatus("failed");
      setError(e instanceof Error ? e.message : "challenge failed");
    } finally {
      setBusy(false);
    }
  }

  async function revive() {
    if (!run || run.alive) return;
    setError("");
    setBusy(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      const data = encodeRevive(id);
      const hash = await sendTx(data);
      setTxHash(hash);
      const ok = await waitForReceipt(hash);
      if (!ok) throw new Error("Transaction failed");
      const r = await readRun(id);
      if (r) {
        setRuns(
          upsert({
            ...run,
            startedAt: r.startedAt,
            heat: r.heat,
            alive: r.alive,
            scars: [{ at: Date.now(), note: "revived", by: account || "anon" }, ...run.scars].slice(0, 6),
          })
        );
      }
      setTxStatus("success");
    } catch (e) {
      setTxStatus("failed");
      setError(e instanceof Error ? e.message : "revive failed");
    } finally {
      setBusy(false);
    }
  }

  function strike() {
    const iv = (window as any).__strikeIv;
    if (iv) clearInterval(iv);
    const hit = marker >= 35 && marker <= 65;
    setStrikeResult(hit ? "hit" : "miss");
    setStriking(false);
    doChallenge(hit);
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
        <p className="kicker">Chog Genesis · Monad · on-chain state</p>
        <h1>The NFT is the save file.</h1>
        <p className="lede">Token id seeds the body. Scars stick to that id on-chain. Sell it and the next owner inherits the run.</p>
      </section>

      <section className="steps">
        <div><b>1</b><span>Connect on Monad</span></div>
        <div><b>2</b><span>Type a Chog id you own</span></div>
        <div><b>3</b><span>Possess starts the 24h run on-chain. Challenge writes a scar.</span></div>
      </section>

      <section className="stage">
        <article className="body">
          <div className="face" data-arch={face?.name || "none"} style={meta?.image ? { backgroundImage: `url(${meta.image})` } : undefined}>
            <span>{valid ? `#${id}` : "—"}</span>
            <strong>{meta?.name || face?.name || "No body"}</strong>
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
            {onChain && <span className="onchain-badge">on-chain</span>}
          </div>
          <p className={owns ? "ok" : "lock"}>
            {owns ? "You hold this body. Possess to start a 24h run on-chain." : demo ? "Demo only. Turn it off to see the real lock." : "You do not hold this body. Possess stays locked."}
          </p>
          {run && <p className="clock">{run.alive && left > 0 ? `${clock} left · heat ${run.heat}` : "Run dead. Revive with $CHOG coming next."}</p>}
          <div className="scars">
            {(run?.scars || []).map((s) => <div key={s.at}>{s.note}<span>{short(s.by)}</span></div>)}
          </div>
          {txHash && (
            <p className="tx">
              tx: <a href={`https://monadscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">{short(txHash)}</a> · {txStatus}
            </p>
          )}
        </article>

        <aside className="panel">
          <label>Token id</label>
          <input value={tokenId} inputMode="numeric" onChange={(e) => setTokenId(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <button className="primary block" disabled={!canPossess || busy} onClick={possess}>
            {busy && txStatus === "pending" ? "Mining…" : owns ? "Possess (on-chain)" : demo ? "Possess (demo)" : "Need this Chog"}
          </button>
          <button className="block" disabled={!run?.alive || left <= 0 || busy} onClick={openChallenge}>Challenge (strike)</button>
          {!run?.alive && run && <button className="primary block" disabled={busy} onClick={revive}>Revive with $CHOG</button>}
          {striking && (
            <div className="strike-overlay">
              <div className="strike-bar">
                <div className="strike-zone" />
                <div className="strike-marker" style={{ left: `${marker}%` }} />
              </div>
              <button className="primary block" onClick={strike}>STRIKE</button>
              <p className="hint">Hit the green zone (35–65%).</p>
            </div>
          )}
          {strikeResult && !striking && <p className={strikeResult === "hit" ? "ok" : "lock"}>{strikeResult === "hit" ? "Hit! Heat +8" : "Miss. Heat -6"}</p>}
          {error && <p className="err">{error}</p>}
          <p className="hint">Type any id. The card loads that Chog. Possess only unlocks if you own it. State is written on-chain.</p>
          <div className="meta">
            <span>$CHOG {balance}</span>
            <span>{MONAD.name} {MONAD.id}</span>
            <span>contract {short(POSSESS_ADDRESS)}</span>
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

