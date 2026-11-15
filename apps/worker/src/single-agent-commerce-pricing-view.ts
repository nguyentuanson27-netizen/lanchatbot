// Quotes and granted concessions establish amounts, never an absolute best price.
// The current policy engine exposes no decision proving a negotiated price floor.
export const unestablishedPriceFloor = () => ({status:"NOT_ESTABLISHED" as const,amountVnd:null});
