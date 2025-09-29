"use client";
import { useEffect, useMemo, useState } from "react";
import { KEYS, loadJson, saveJson } from "@/lib/storage";
import { usePersistentState } from "@/lib/usePersistent";
import { v4 as uuidv4 } from "uuid";

type Article = {
  id: string;
  title: string;
  category: "FAQs" | "Guides" | "Tutorials";
  body: string;
  helpful: number;
  notHelpful: number;
};

const SAMPLE_ARTICLES: Article[] = [
  { id: "a1", title: "Reset Starbucks App Password", category: "FAQs", body: "Open the app → Settings → Reset Password.", helpful: 12, notHelpful: 1 },
  { id: "a2", title: "Reload Starbucks Card Online", category: "Guides", body: "Visit starbucks.com/card → Sign in → Reload.", helpful: 8, notHelpful: 0 },
  { id: "a3", title: "Report Store Experience", category: "Tutorials", body: "Use the Help → Feedback form in the app.", helpful: 5, notHelpful: 2 },
];

export default function SelfServicePage() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = usePersistentState<Article[]>(KEYS.articles, SAMPLE_ARTICLES);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<"All" | Article["category"]>("All");

  useEffect(() => { setHydrated(true); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return articles.filter((a) =>
      (category === "All" || a.category === category) &&
      (a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
    );
  }, [query, articles, category]);

  const vote = (id: string, helpful: boolean) => {
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, helpful: a.helpful + (helpful ? 1 : 0), notHelpful: a.notHelpful + (!helpful ? 1 : 0) } : a));
    if (helpful) {
      const prevented = loadJson<number>(KEYS.prevention, 0) + 1;
      saveJson(KEYS.prevention, prevented);
    } else {
      // Create a ticket stub for follow-up in Tickets/SLA
      const tickets = loadJson<any[]>(KEYS.tickets, []);
      tickets.unshift({ id: uuidv4(), title: `Follow-up on article ${id}`, customerId: "c1", status: "Open", priority: "Medium", createdAt: new Date().toISOString(), notes: [] });
      saveJson(KEYS.tickets, tickets);
    }
  };

  if (!hydrated) return <div className="space-y-6" />;

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-semibold text-[var(--sb-dark)]">Self-Service Portal</h1>
        <span className="sb-badge">Knowledge Base</span>
      </div>

      <div className="sb-card p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="sb-input sm:col-span-2" placeholder="Search articles..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="sb-input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
            {(["All", "FAQs", "Guides", "Tutorials"] as const).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((a) => (
          <article key={a.id} className="sb-card p-4">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{a.title}</h2>
                <span className="sb-badge">{a.category}</span>
              </div>
            </header>
            <p className="mt-2 text-sm">{a.body}</p>
            <div className="flex items-center gap-2 mt-3">
              <button className="sb-btn" onClick={() => vote(a.id, true)}>Helpful ({a.helpful})</button>
              <button className="sb-btn bg-[var(--sb-brown)]" onClick={() => vote(a.id, false)}>Not helpful ({a.notHelpful})</button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No results found.</p>
        )}
      </div>
    </div>
  );
}


