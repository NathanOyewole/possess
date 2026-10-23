import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
import { MONAD, CHOG_NFT } from "./chain";

export const POSSESS_ADDRESS = (process.env.NEXT_PUBLIC_POSSESS_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

const abi = parseAbi([
  "function ownerOf(uint256) view returns (address)",
  "function possess(uint256 tokenId)",
  "function challenge(uint256 tokenId, bool hit)",
  "function runs(uint256) view returns (uint64 startedAt, uint16 heat, bool alive)",
  "function scarCount(uint256) view returns (uint256)",
]);

export const publicClient = createPublicClient({
  transport: http(MONAD.rpc),
});

export async function readRun(tokenId: number) {
  try {
    const r = await publicClient.readContract({
      address: POSSESS_ADDRESS,
      abi,
      functionName: "runs",
      args: [BigInt(tokenId)],
    });
    const [startedAt, heat, alive] = r as [bigint, number, boolean];
    return { startedAt: Number(startedAt) * 1000, heat: Number(heat), alive };
  } catch {
    return null;
  }
}

export async function readScarCount(tokenId: number) {
  try {
    const n = await publicClient.readContract({
      address: POSSESS_ADDRESS,
      abi,
      functionName: "scarCount",
      args: [BigInt(tokenId)],
    });
    return Number(n);
  } catch {
    return 0;
  }
}

export function encodePossess(tokenId: number) {
  return encodeFunctionData({ abi, functionName: "possess", args: [BigInt(tokenId)] });
}

export function encodeChallenge(tokenId: number, hit: boolean) {
  return encodeFunctionData({ abi, functionName: "challenge", args: [BigInt(tokenId), hit] });
}

export async function sendTx(data: `0x${string}`): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet");
  const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
  if (!accounts?.length) throw new Error("Connect wallet first");
  const hash = await eth.request({
    method: "eth_sendTransaction",
    params: [{ from: accounts[0], to: POSSESS_ADDRESS, data }],
  });
  return hash as string;
}

export async function waitForReceipt(hash: string): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    const r = await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
    if (r) return r.status === "success";
    await new Promise((res) => setTimeout(res, 2000));
  }
  return false;
}
