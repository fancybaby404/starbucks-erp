/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Ticket, MessageSquare, BookOpen, Settings, LogOut, Users } from "lucide-react";
import { auth } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/customerservice", icon: Home },
  { label: "Tickets", href: "/customerservice/tickets", icon: Ticket },
  { label: "Live Chat", href: "/customerservice/chat", icon: MessageSquare }, // Agent view
  { label: "Self-Service", href: "/customerservice/self-service", icon: BookOpen },
  { label: "SLA Rules", href: "/customerservice/sla", icon: Settings },
  { label: "Team", href: "/customerservice/team", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--sb-dark)]/95 backdrop-blur-xl text-white flex flex-col fixed left-0 top-0 overflow-y-auto z-50 shadow-2xl border-r border-white/5">
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="relative w-10 h-10 flex-shrink-0">
          <Image 
            src="/starbucks_logo.svg" 
            alt="Starbucks Logo" 
            fill 
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">Starbucks</h1>
          <p className="text-xs text-[var(--sb-light)] mt-1">Helpdesk ERP</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          // Admin-only check for "Team" tab
          const user = auth.getSession();
          const isAdmin = user?.email === 'admin@starbucks.com';
          
          if (item.label === 'Team' && !isAdmin) {
             return null;
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--sb-green)] text-white shadow-sm"
                  : "text-[var(--sb-light)] hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => auth.logout()}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[var(--sb-light)] hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
