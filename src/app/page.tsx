"use client";
import React from "react";
import { KEYS } from "@/lib/storage";
import { usePersistentState } from "@/lib/usePersistent";

export default function Home() {
  const [prevented] = usePersistentState<number>(KEYS.prevention, 0);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  if (!hydrated) return <div className="grid gap-4 sm:grid-cols-2" />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <a href="/tickets" className="sb-card p-6 hover:shadow-md transition">
        <h2 className="text-xl font-semibold text-[var(--sb-dark)]">Ticket Management</h2>
        <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-2">Create, assign, track status and priority, add notes.</p>
      </a>
      <a href="/self-service" className="sb-card p-6 hover:shadow-md transition">
        <h2 className="text-xl font-semibold text-[var(--sb-dark)]">Self-Service Portal</h2>
        <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-2">Search FAQs, guides, tutorials, feedback on helpfulness.</p>
      </a>
      <a href="/history" className="sb-card p-6 hover:shadow-md transition">
        <h2 className="text-xl font-semibold text-[var(--sb-dark)]">Communication History</h2>
        <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-2">View conversations, send follow-ups, ensure consistency.</p>
      </a>
      <a href="/sla" className="sb-card p-6 hover:shadow-md transition">
        <h2 className="text-xl font-semibold text-[var(--sb-dark)]">SLA Tracking</h2>
        <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-2">Rules, monitoring, escalation, and performance reports.</p>
      </a>
      <div className="sb-card p-6 col-span-full flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--sb-dark)]">Tickets prevented via Self-Service</h3>
          <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-1">Count of users who resolved issues without contacting support.</p>
        </div>
        <div className="text-4xl font-bold text-[var(--sb-dark)]">{prevented}</div>
      </div>
    </div>
  );
}
