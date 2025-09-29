"use client";
import { useEffect, useMemo, useState } from "react";
import { KEYS, loadJson } from "@/lib/storage";
import { usePersistentState } from "@/lib/usePersistent";

type Rule = {
  id: string;
  name: string;
  responseMins: number;
  resolutionMins: number;
};

type TicketSummary = {
  id: string;
  title: string;
  createdAt: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  ruleId: string;
  escalated?: boolean;
};

const SAMPLE_RULES: Rule[] = [
  { id: "r1", name: "Default", responseMins: 60, resolutionMins: 480 },
  { id: "r2", name: "Priority High", responseMins: 15, resolutionMins: 120 },
];

export default function SlaPage() {
  const [rules, setRules] = usePersistentState<Rule[]>(KEYS.slaRules, SAMPLE_RULES);
  const [tickets, setTickets] = usePersistentState<TicketSummary[]>(KEYS.slaTickets, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Import tickets from main tickets store as the monitored set
    const imported = loadJson<any[]>(KEYS.tickets, []);
    if (imported?.length) setTickets(imported as TicketSummary[]);
    setHydrated(true);
  }, []);

  useEffect(() => {}, []);

  const [newRule, setNewRule] = useState({ name: "", responseMins: 30, resolutionMins: 240 });

  const addRule = () => {
    if (!newRule.name.trim()) return;
    setRules([...rules, { id: crypto.randomUUID(), ...newRule }]);
    setNewRule({ name: "", responseMins: 30, resolutionMins: 240 });
  };

  const now = Date.now();
  const report = useMemo(() => {
    const byRule = new Map<string, { total: number; escalations: number }>();
    for (const r of rules) byRule.set(r.id, { total: 0, escalations: 0 });
    tickets.forEach((t) => {
      const agg = byRule.get(t.ruleId) ?? { total: 0, escalations: 0 };
      agg.total += 1;
      if (t.escalated) agg.escalations += 1;
      byRule.set(t.ruleId, agg);
    });
    return Array.from(byRule.entries()).map(([ruleId, v]) => ({
      ruleId,
      rule: rules.find((r) => r.id === ruleId)?.name ?? "Unknown",
      ...v,
      compliance: v.total === 0 ? 100 : Math.round(((v.total - v.escalations) / v.total) * 100),
    }));
  }, [rules, tickets]);

  // Simulate auto-escalation by scanning tickets each render
  useEffect(() => {
    const updated = tickets.map((t) => {
      const rule = rules.find((r) => r.id === t.ruleId);
      if (!rule || t.status === "Resolved" || t.status === "Closed") return t;
      const ageMins = (now - new Date(t.createdAt).getTime()) / 60000;
      const limit = t.priority === "High" ? rule.responseMins : rule.resolutionMins; // simplistic
      if (ageMins > limit && !t.escalated) {
        return { ...t, escalated: true };
      }
      return t;
    });
    if (JSON.stringify(updated) !== JSON.stringify(tickets)) setTickets(updated);
  }, [tickets, rules, now]);

  if (!hydrated) {
    return <div className="space-y-6" />;
  }

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-semibold text-[var(--sb-dark)]">SLA Tracking</h1>
        <span className="sb-badge">Compliance</span>
      </div>

      <div className="sb-card p-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <input className="sb-input sm:col-span-2" placeholder="Rule name" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
          <input className="sb-input" type="number" placeholder="Response mins" value={newRule.responseMins} onChange={(e) => setNewRule({ ...newRule, responseMins: Number(e.target.value) })} />
          <input className="sb-input" type="number" placeholder="Resolution mins" value={newRule.resolutionMins} onChange={(e) => setNewRule({ ...newRule, resolutionMins: Number(e.target.value) })} />
        </div>
        <div className="mt-3">
          <button className="sb-btn" onClick={addRule}>Add Rule</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="sb-card p-3">
          <h2 className="font-semibold mb-2">Rules</h2>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r.id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs opacity-60">Response: {r.responseMins}m • Resolution: {r.resolutionMins}m</div>
                </div>
              </li>
            ))}
            {rules.length === 0 && <li className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No rules.</li>}
          </ul>
        </section>
        <section className="sb-card p-3">
          <h2 className="font-semibold mb-2">SLA Performance</h2>
          <ul className="space-y-2">
            {report.map((r, idx) => (
              <li key={`${r.ruleId ?? 'rule'}-${idx}`} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.rule}</div>
                  <div className="text-xs opacity-60">Tickets: {r.total} • Escalations: {r.escalations}</div>
                </div>
                <div className="text-sm font-semibold">{r.compliance}%</div>
              </li>
            ))}
            {report.length === 0 && <li className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No data.</li>}
          </ul>
        </section>
      </div>

      <section className="sb-card p-3">
        <h2 className="font-semibold mb-2">Monitor tickets (demo)</h2>
        <button
          className="sb-btn"
          onClick={() =>
            setTickets((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                title: "Demo ticket",
                createdAt: new Date().toISOString(),
                priority: "High",
                status: "Open",
                ruleId: rules[1]?.id ?? rules[0]?.id ?? "",
              },
            ])
          }
        >
          Add demo ticket
        </button>
        <ul className="mt-3 space-y-2">
          {tickets.map((t) => (
            <li key={t.id} className="border rounded p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs opacity-60">{new Date(t.createdAt).toLocaleString()} • {t.priority} • {t.status}</div>
              </div>
              {t.escalated && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Escalated</span>}
            </li>
          ))}
          {tickets.length === 0 && <li className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No tickets monitored.</li>}
        </ul>
      </section>
    </div>
  );
}


