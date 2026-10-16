# POSSESS

Chogathon. The Chog Genesis NFT is the save file.

https://usepossess.vercel.app

## What it does

Type a token id. The card loads that Chog. Stats are seeded from the id. Possess starts a 24h run. Challenge writes a scar. Sell the NFT and the next owner inherits the same id. No Chog, no character.

## Why the NFT is essential

`ownerOf` on Chog Genesis is the gate. Remove the NFT and Possess stays locked. The run is keyed to the token id, not the wallet.

## Contracts

- Chog Genesis: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763`
- $CHOG: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`
- Possess (deploy): `contracts/Possess.sol` on Monad, chain id 143

## Run

```bash
pnpm install
pnpm dev
```

Demo on lets you click the loop without holding a Chog. Leave it off for the real gate.

## Submission line

POSSESS: your Chog NFT is the save file. Traits seed a 24h chaos run, and selling the NFT hands the run to the buyer.
