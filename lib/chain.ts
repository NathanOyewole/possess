export const MONAD = {
  id: 143,
  hex: "0x8f",
  name: "Monad",
  rpc: "https://rpc.monad.xyz",
  explorer: "https://monadscan.com",
  symbol: "MON",
};

export const CHOG_NFT = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763";
export const CHOG_TOKEN = "0x350035555E10d9AfAF1566AaebfCeD5BA6C27777";
export const SUPPLY = 1969;
export const RUN_MS = 24 * 60 * 60 * 1000;

export const ARCHETYPES = [
  { name: "Gremlin", line: "steals the bit, leaves the scar" },
  { name: "Oracle", line: "sees the sell before you do" },
  { name: "Bruiser", line: "wins ugly, stays ugly" },
  { name: "Ghost", line: "present, then not" },
  { name: "Jester", line: "the joke is the weapon" },
  { name: "Warden", line: "keeps what others drop" },
] as const;

export function archetype(tokenId: number) {
  return ARCHETYPES[tokenId % ARCHETYPES.length];
}

export function stats(tokenId: number) {
  const n = tokenId * 1103515245 + 12345;
  const roll = (shift: number) => 40 + ((n >>> shift) % 51);
  return {
    nerve: roll(0),
    chaos: roll(5),
    grit: roll(11),
  };
}
