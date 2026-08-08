export function shouldRefreshPolicyRoute(
  hash: string,
  policyRootPresent: boolean,
): boolean {
  if (!policyRootPresent) return false;
  const route = hash.replace(/^#\/?/, "").split("?", 1)[0] || "overview";
  return route === "policy";
}

export function installPolicyRouteSync(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window.addEventListener("hashchange", () => {
    if (!shouldRefreshPolicyRoute(
      window.location.hash,
      Boolean(document.querySelector("[data-policy-root]")),
    )) return;
    // main.ts intentionally ignores hash changes that stay on the same route.
    // Policy cursor navigation changes only the query string, so reuse the
    // existing manual refresh path after the URL has settled.
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>("#manual-refresh")?.click();
    }, 0);
  });
}

installPolicyRouteSync();
