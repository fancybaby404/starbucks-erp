"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const nav = [
    { href: "/tickets", label: "Tickets" },
    { href: "/self-service", label: "Self-Service" },
    { href: "/history", label: "History" },
    { href: "/sla", label: "SLA" },
  ];
  return (
    <header className="sticky top-0 z-20 bg-[var(--sb-dark)] text-white/90 border-b border-white/10">
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[var(--sb-green)] shadow" />
          <span className="text-lg font-semibold tracking-wide">Starbucks Helpdesk</span>
        </Link>
        <ul className="flex gap-4 text-sm">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`${active ? "text-white" : "text-white/80 hover:text-white"} px-2 py-1 rounded`}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}


