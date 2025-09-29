"use client";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { KEYS } from "@/lib/storage";
import { usePersistentState } from "@/lib/usePersistent";

type Ticket = {
  id: string;
  title: string;
  customerId: string;
  assignee?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High";
  createdAt: string;
  notes: { id: string; text: string; at: string; internal?: boolean }[];
};

type Customer = { id: string; name: string; email: string };

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Alex Rivera", email: "alex@coffee.com" },
  { id: "c2", name: "Jamie Chen", email: "jamie@coffee.com" },
  { id: "c3", name: "Taylor Brooks", email: "taylor@coffee.com" },
];

const AGENTS = ["Ava", "Noah", "Liam", "Emma"];

export default function TicketsPage() {
  const [tickets, setTickets] = usePersistentState<Ticket[]>(KEYS.tickets, []);
  const [customers, setCustomers] = usePersistentState<Customer[]>(KEYS.customers, SAMPLE_CUSTOMERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  const [form, setForm] = useState({
    title: "",
    customerId: SAMPLE_CUSTOMERS[0].id,
    priority: "Medium" as Ticket["priority"],
  });

  const [publicForm, setPublicForm] = useState({ name: "", email: "", title: "" });

  const addTicket = () => {
    if (!form.title.trim()) return;
    const newTicket: Ticket = {
      id: uuidv4(),
      title: form.title.trim(),
      customerId: form.customerId,
      status: "Open",
      priority: form.priority,
      createdAt: new Date().toISOString(),
      notes: [],
    };
    setTickets([newTicket, ...tickets]);
    setForm({ ...form, title: "" });
  };

  const addCustomerAndTicket = () => {
    const name = publicForm.name.trim();
    const email = publicForm.email.trim();
    const title = publicForm.title.trim();
    if (!name || !email || !title) return;
    const customer: Customer = { id: uuidv4(), name, email };
    setCustomers((prev) => [customer, ...prev]);
    const newTicket: Ticket = {
      id: uuidv4(),
      title,
      customerId: customer.id,
      status: "Open",
      priority: "Low",
      createdAt: new Date().toISOString(),
      notes: [
        { id: uuidv4(), text: `Ticket created by customer ${name}`, at: new Date().toISOString(), internal: false },
      ],
    };
    setTickets((prev) => [newTicket, ...prev]);
    setPublicForm({ name: "", email: "", title: "" });
  };

  const updateTicket = (id: string, changes: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const addNote = (id: string, text: string) => {
    if (!text.trim()) return;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              notes: [
                { id: uuidv4(), text: text.trim(), at: new Date().toISOString(), internal: true },
                ...t.notes,
              ],
            }
          : t
      )
    );
  };

  const grouped = useMemo(() => {
    const order = ["Open", "In Progress", "Resolved", "Closed"] as const;
    return order.map((s) => ({
      status: s,
      items: tickets.filter((t) => t.status === s),
    }));
  }, [tickets]);

  if (!hydrated) return <div className="space-y-6" />;

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-semibold text-[var(--sb-dark)]">Ticket Management</h1>
        <span className="sb-badge">Live</span>
      </div>

      <div className="sb-card p-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            className="sb-input sm:col-span-2"
            placeholder="Issue title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="sb-input"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            {SAMPLE_CUSTOMERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="sb-input"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Ticket["priority"] })}
          >
            {(["Low", "Medium", "High"] as const).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="sb-btn" onClick={addTicket}>Create Ticket</button>
          <span className="text-xs opacity-60">New tickets start as Open</span>
        </div>
      </div>

      <div className="sb-card p-4">
        <h2 className="font-semibold mb-3">Customer submission</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <input className="sb-input" placeholder="Customer name" value={publicForm.name} onChange={(e) => setPublicForm({ ...publicForm, name: e.target.value })} />
          <input className="sb-input" placeholder="Email" value={publicForm.email} onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })} />
          <input className="sb-input sm:col-span-2" placeholder="Describe the issue" value={publicForm.title} onChange={(e) => setPublicForm({ ...publicForm, title: e.target.value })} />
        </div>
        <div className="mt-3">
          <button className="sb-btn" onClick={addCustomerAndTicket}>Submit Ticket</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {grouped.map(({ status, items }) => (
          <section key={status} className="sb-card p-3">
            <h2 className="font-semibold mb-2">{status}</h2>
            <div className="space-y-3">
              {items.map((t) => (
                <article key={t.id} className="border rounded p-3">
                  <header className="flex items-center justify-between gap-2">
                    <div className="font-medium">{t.title}</div>
                    <span className="sb-badge">{t.priority}</span>
                  </header>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    <select
                      className="sb-input"
                      value={t.assignee ?? ""}
                      onChange={(e) => updateTicket(t.id, { assignee: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {AGENTS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <select
                      className="sb-input"
                      value={t.status}
                      onChange={(e) => updateTicket(t.id, { status: e.target.value as Ticket["status"] })}
                    >
                      {(["Open", "In Progress", "Resolved", "Closed"] as const).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <Notes ticket={t} onAdd={(text) => addNote(t.id, text)} />
                </article>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No tickets.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Notes({ ticket, onAdd }: { ticket: Ticket; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input className="sb-input" placeholder="Add internal note" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="sb-btn" onClick={() => { onAdd(text); setText(""); }}>Add</button>
      </div>
      <ul className="mt-2 space-y-2">
        {ticket.notes.map((n) => (
          <li key={n.id} className="text-sm">
            <span className="opacity-60 mr-2">[{new Date(n.at).toLocaleString()}]</span>
            {n.text}
          </li>
        ))}
        {ticket.notes.length === 0 && (
          <li className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No notes yet.</li>
        )}
      </ul>
    </div>
  );
}


