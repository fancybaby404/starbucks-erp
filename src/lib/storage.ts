export function loadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const KEYS = {
  tickets: "sb_tickets",
  customers: "sb_customers",
  articles: "sb_articles",
  threads: "sb_threads",
  slaRules: "sb_sla_rules",
  slaTickets: "sb_sla_tickets",
  prevention: "sb_prevented_count",
} as const;


