/**
 * Canonicalizes Vietnamese text without erasing the distinctions that can
 * change a business decision. Critical Vietnamese confirmation forms remain
 * distinct strings after normalization.
 */
export function normalizeVietnameseNfc(text: string): string {
  return text.normalize("NFC");
}

/**
 * Produces a recall key for search-like matching only.
 *
 * This intentionally loses Vietnamese tone and letter distinctions (for
 * example, several distinct confirmation forms all fold to `dung`). Callers must not
 * use this value by itself to make confirmation, rejection, payment, or other
 * sensitive business decisions.
 */
export function foldVietnameseForRecall(text: string): string {
  return normalizeVietnameseNfc(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0111/giu, "d")
    .toLowerCase();
}
