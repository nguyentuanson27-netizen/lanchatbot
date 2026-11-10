import { normalizeCatalogToken } from "@lana/business-tools";

// Owner decision 2026-10-18: southern destinations share MIEN-NAM transit.
// Province/legacy identities: NQ 202/2025/QH15; source links in review93-fix-20261018/SOURCES.md.
// This is an exact administrative-component lookup, not free-text geography inference.
const southernGroups = [
  ["HO-CHI-MINH", "HCM", "TPHCM", "BINH-DUONG", "BA-RIA-VUNG-TAU"],
  ["DONG-NAI", "BINH-PHUOC"], ["TAY-NINH", "LONG-AN"],
  ["DONG-THAP", "TIEN-GIANG"], ["VINH-LONG", "BEN-TRE", "TRA-VINH"],
  ["AN-GIANG", "KIEN-GIANG"], ["CAN-THO", "HAU-GIANG", "SOC-TRANG"],
  ["CA-MAU", "BAC-LIEU"],
];
const southern = new Map(southernGroups.flatMap(group => group.map(name => [name, group[0]!] as const)));
const otherProvinces = new Set([
  "HA-NOI", "HAI-PHONG", "HUE", "DA-NANG", "CAO-BANG", "DIEN-BIEN", "HA-TINH", "LAI-CHAU", "LANG-SON",
  "NGHE-AN", "QUANG-NINH", "THANH-HOA", "SON-LA", "TUYEN-QUANG", "LAO-CAI", "THAI-NGUYEN", "PHU-THO",
  "BAC-NINH", "HUNG-YEN", "NINH-BINH", "QUANG-TRI", "QUANG-NGAI", "GIA-LAI", "KHANH-HOA", "LAM-DONG",
  "DAK-LAK", "HA-GIANG", "YEN-BAI", "BAC-KAN", "VINH-PHUC", "HOA-BINH", "BAC-GIANG", "THAI-BINH",
  "HAI-DUONG", "HA-NAM", "NAM-DINH", "QUANG-BINH", "THUA-THIEN-HUE", "QUANG-NAM", "KON-TUM",
  "BINH-DINH", "NINH-THUAN", "DAK-NONG", "BINH-THUAN", "PHU-YEN",
]);
function administrativeName(part: string) {
  const name = normalizeCatalogToken(part).replaceAll("_", "-");
  for (const prefix of ["THANH-PHO-", "TINH-", "TP-"]) if (name.startsWith(prefix)) return name.slice(prefix.length);
  return name;
}
export function southernDestination(address: string): "MATCH" | "CONFLICT" | "UNKNOWN" {
  const parts = address.split(/[,;\n]/).map(administrativeName).filter(Boolean);
  if (parts.at(-1) === "VIET-NAM" || parts.at(-1) === "VN") parts.pop();
  const destination = southern.get(parts.at(-1) ?? "");
  if (!destination) return "UNKNOWN";
  for (const part of parts.slice(0, -1)) {
    const known = southern.get(part);
    if ((known && known !== destination) || otherProvinces.has(part)) return "CONFLICT";
  }
  return "MATCH";
}

