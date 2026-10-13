export function pad32(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

export async function rpc(method: string, params: unknown[]) {
  const res = await fetch("https://rpc.monad.xyz", {
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
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const chainId = (await eth.request({ method: "eth_chainId" })) as string;
  if (chainId !== "0x8f") {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x8f" }],
    }).catch(async () => {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x8f",
          chainName: "Monad",
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls: ["https://rpc.monad.xyz"],
          blockExplorerUrls: ["https://monadscan.com"],
        }],
      });
    });
  }
  return accounts[0];
}

export function short(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
