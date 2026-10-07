export type Scar = { at: number; note: string; by: string };

export type Run = {
  tokenId: number;
  owner: string;
  startedAt: number;
  heat: number;
  scars: Scar[];
  alive: boolean;
};

const KEY = "possess.runs.v1";

export function loadRuns(): Run[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRuns(runs: Run[]) {
  localStorage.setItem(KEY, JSON.stringify(runs));
}

export function upsert(run: Run) {
  const runs = loadRuns().filter((r) => r.tokenId !== run.tokenId);
  runs.unshift(run);
  saveRuns(runs);
  return runs;
}
