"use client";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { usePersistentState } from "@/lib/usePersistent";
import { KEYS } from "@/lib/storage";

type Channel = "email" | "chat" | "phone";
type Message = { id: string; channel: Channel; at: string; from: string; to: string; text: string };
type Thread = { customerId: string; customerName: string; messages: Message[] };

const SAMPLE_THREADS: Thread[] = [
  {
    customerId: "c1",
    customerName: "Alex Rivera",
    messages: [
      { id: "m1", channel: "email", at: new Date(Date.now() - 86400000).toISOString(), from: "alex@coffee.com", to: "support@starbucks.com", text: "I can't reload my card." },
      { id: "m2", channel: "email", at: new Date(Date.now() - 86300000).toISOString(), from: "support@starbucks.com", to: "alex@coffee.com", text: "We are looking into it." },
    ],
  },
];

export default function HistoryPage() {
  const [threads, setThreads] = usePersistentState<Thread[]>(KEYS.threads, SAMPLE_THREADS);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState("");
  const [reply, setReply] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { setHydrated(true); }, []);

  const visible = useMemo(() => {
    const q = filter.toLowerCase();
    return threads.filter((t) => t.customerName.toLowerCase().includes(q));
  }, [threads, filter]);

  const current = visible.find((t) => t.customerId === (selected ?? visible[0]?.customerId));

  const sendFollowUp = (channel: Channel) => {
    if (!current || !reply.trim()) return;
    const msg: Message = {
      id: uuidv4(),
      channel,
      at: new Date().toISOString(),
      from: "support@starbucks.com",
      to: `${current.customerName} <customer@example.com>`,
      text: reply.trim(),
    };
    setThreads((prev) =>
      prev.map((t) => (t.customerId === current.customerId ? { ...t, messages: [...t.messages, msg] } : t))
    );
    setReply("");
  };

  if (!hydrated) return <div className="space-y-6" />;

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-semibold text-[var(--sb-dark)]">Customer Communication History</h1>
        <span className="sb-badge">Unified Threads</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <aside className="sb-card p-3 md:col-span-1">
          <input className="sb-input" placeholder="Search customers..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <ul className="mt-3 space-y-2 max-h-[60vh] overflow-auto">
            {visible.map((t) => (
              <li key={t.customerId}>
                <button
                  className={`w-full text-left px-3 py-2 rounded ${current?.customerId === t.customerId ? "bg-[var(--sb-light)]" : "hover:bg-[var(--sb-cream)]"}`}
                  onClick={() => setSelected(t.customerId)}
                >
                  {t.customerName}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="sb-card p-3 md:col-span-2">
          {current ? (
            <div className="flex flex-col h-full">
              <div className="font-semibold">{current.customerName}</div>
              <div className="mt-3 space-y-3 max-h-[50vh] overflow-auto">
                {current.messages.map((m) => (
                  <div key={m.id} className="border rounded p-2">
                    <div className="text-xs opacity-60">[{new Date(m.at).toLocaleString()}] {m.channel.toUpperCase()} • {m.from} → {m.to}</div>
                    <div className="text-sm mt-1">{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                <input className="sb-input" placeholder="Write a follow-up..." value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="sb-btn" onClick={() => sendFollowUp("email")}>Send Email</button>
                <button className="sb-btn" onClick={() => sendFollowUp("chat")}>Send Chat</button>
                <button className="sb-btn" onClick={() => sendFollowUp("phone")}>Log Phone</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">Select a customer to view history.</p>
          )}
        </section>
      </div>
    </div>
  );
}


