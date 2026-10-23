import { MONAD } from "./chain";

export function pad32(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

export async function rpc(method: string, params: unknown[]) {
  const res = await fetch(MONAD.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "rpc error");
  return data.result as string;
}

export async function ownerOf(contract: string, tokenId: number) {
  const data = "0x6352211e" + pad32(tokenId.toString(16));
  const result = await rpc("eth_call", [{ to: contract, data }, "latest"]);
  if (!result || result === "0x") return null;
  return "0x" + result.slice(-40);
}

function hexToUtf8(hex: string) {
  const clean = hex.replace(/^0x/, "");
  let out = "";
  for (let i = 0; i < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code) out += String.fromCharCode(code);
  }
  return out;
}

export async function tokenMeta(contract: string, tokenId: number) {
  const data = "0xc87b56dd" + pad32(tokenId.toString(16));
  const result = await rpc("eth_call", [{ to: contract, data }, "latest"]);
  if (!result || result === "0x") return null;
  const raw = hexToUtf8(result);
  const uri = raw.includes("ipfs://") || raw.includes("http") ? raw.slice(raw.search(/ipfs:\/\/|https?:\/\//)) : raw;
  const url = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const image = String(json.image || "").replace("ipfs://", "https://ipfs.io/ipfs/");
  return { name: json.name as string, image, traits: (json.attributes || []) as { trait_type: string; value: string }[] };
}

export async function chogBalance(token: string, account: string) {
  const data = "0x70a08231" + pad32(account.slice(2));
  const result = await rpc("eth_call", [{ to: token, data }, "latest"]);
  return BigInt(result || "0x0");
}

type Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function getEthereum(): Ethereum | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Ethereum }).ethereum ?? null;
}

export async function connectMonad() {
  const eth = getEthereum();
  if (!eth) throw new Error("No wallet. Install Rabby, MetaMask, or Phantom.");
  let accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("Wallet connected but no account. Unlock it and try again.");
  let chainId = (await eth.request({ method: "eth_chainId" })) as string;
  if (chainId !== MONAD.hex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: MONAD.hex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: MONAD.hex,
            chainName: MONAD.name,
            nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
            rpcUrls: [MONAD.rpc],
            blockExplorerUrls: [MONAD.explorer],
          }],
        });
      } else if (code === 4001) {
        throw new Error("You rejected the network switch.");
      } else {
        throw err;
      }
    }
    chainId = (await eth.request({ method: "eth_chainId" })) as string;
    if (chainId !== MONAD.hex) throw new Error(`Still not on ${MONAD.name}. Switch the network in your wallet.`);
    accounts = (await eth.request({ method: "eth_accounts" })) as string[];
  }
  return accounts[0];
}

export function short(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
