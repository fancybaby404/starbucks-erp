"use client";
import React, { useEffect, useState } from "react";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";
import { useDashboardStats } from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";


// Mock Chart Component
function VolumeChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 5); // Ensure at least some height if max is low

  
  return (
    <div className="w-full h-48 flex items-end justify-between gap-2 px-4">
      {data.map((h, i) => (
        <div key={i} className="group relative flex-1 flex flex-col justify-end items-center gap-2 h-full">
           <div 
             className="w-full bg-[var(--sb-green)]/20 group-hover:bg-[var(--sb-green)] rounded-t-sm transition-all duration-300 relative"
             style={{ height: `${max > 0 ? (h / max) * 100 : 0}%` }}

           >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--sb-dark)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {h} Tix
              </div>
           </div>
           <span className="text-[10px] text-gray-400">{i * 2}h</span>
        </div>
      ))}
    </div>
  );
}

export default function CustomerServiceDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const { openTickets, avgResponse, slaBreaches, onlineAgents, urgentTickets, ticketVolume, loading } = useDashboardStats();


  useEffect(() => {
    // Auth Check
    const sess = auth.getSession();
    if (!sess || sess.role !== 'EMPLOYEE') {
      router.push("/login"); // Force login if not employee
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null;
  
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 w-1/3 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-bold text-[var(--sb-dark)]">Agent Dashboard</h1>
        <span className="text-sm text-[var(--sb-dark)] opacity-70">Live Monitor</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Open Tickets" value={openTickets} icon={Activity} />
        <KpiCard label="Avg Response" value={avgResponse} icon={Clock} />
        <KpiCard 
          label="SLA Breaches" 
          value={slaBreaches} 
          icon={AlertTriangle} 
          alert={slaBreaches > 0} 
          href="/customerservice/tickets"
        />
        <KpiCard label="Online Agents" value={onlineAgents} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Attention List (Takes up 1 col) */}
        <div className="lg:col-span-1 sb-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--sb-dark)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> 
              Urgent Attention
            </h3>
          </div>
          <div className="space-y-3">
            {urgentTickets.length === 0 ? (
              <p className="text-sm text-gray-500">No urgent tickets.</p>
            ) : (
              urgentTickets.map((t) => (
                <Link key={t.id} href={`/customerservice/tickets?id=${t.id}`} className="block p-3 hover:bg-gray-50 border-b last:border-0 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-[var(--sb-dark)] block">{t.title}</span>
                      <span className="text-xs text-gray-500">Customer {t.customerId}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-100 text-red-700">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Volume Graph Placeholder (Takes up 2 cols) */}
        <div className="lg:col-span-2 sb-card p-6 flex flex-col justify-between min-h-[300px]">
          <div className="mb-6 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-[var(--sb-dark)]">Ticket Volume</h3>
                <p className="text-sm text-gray-500">Incoming requests over last 24h</p>
             </div>
             <select className="sb-input w-auto text-xs py-1">
               <option>Last 24 Hours</option>
               <option>Last 7 Days</option>
             </select>
          </div>
          <VolumeChart data={ticketVolume} />

        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, alert, href }: { label: string, value: string | number, icon: React.ElementType, alert?: boolean, href?: string }) {
  const Content = (
    <div className={`sb-card p-6 flex items-center justify-between group cursor-pointer ${alert ? "border-l-4 border-l-red-500" : ""}`}>
      <div>
        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${alert ? "text-red-600" : "text-[var(--sb-dark)]"}`}>{value}</p>
      </div>
      <div className={`p-4 rounded-full transition-colors ${alert ? "bg-red-50 text-red-500" : "bg-[var(--sb-background)] text-[var(--sb-green)] group-hover:bg-[var(--sb-green)] group-hover:text-white"}`}>
        <Icon size={28} />
        {alert && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{Content}</Link> : Content;
}
