"use client";
import React, { useEffect, useState } from "react";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";
import { useDashboardStats } from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";


// Mock Chart Component
function VolumeChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 5); 

  return (
    <div className="w-full h-48 flex items-end justify-between gap-2 px-4">
      {data.map((h, i) => {
        // Data is passed as [oldest ... newest] based on parent usage?
        // Parent logic: volume[23 - hourDiff]++; 
        // 23-hourDiff means: hourDiff 0 (now) -> index 23. hourDiff 23 (24h ago) -> index 0.
        // So index 0 is oldest (24h ago), index 23 is newest (Now).
        
        let label = "";
        if (i === 23) label = "Now";
        else if (i === 17) label = "-6h";
        else if (i === 11) label = "-12h";
        else if (i === 5) label = "-18h";
        else if (i === 0) label = "-24h";

        return (
          <div key={i} className="group relative flex-1 flex flex-col justify-end items-center gap-2 h-full">
             <div 
               className="w-full bg-[var(--sb-green)]/20 group-hover:bg-[var(--sb-green)] rounded-t-sm transition-all duration-300 relative"
               style={{ height: `${max > 0 ? (h / max) * 100 : 0}%` }}

             >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--sb-dark)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {h} Tickets <br/>
                  <span className="opacity-70">{23 - i}h ago</span>
                </div>
             </div>
             <div className="h-4 flex items-center justify-center">
                 <span className="text-[10px] text-gray-400 font-medium">{label}</span>
             </div>
          </div>
        );
      })}
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
      <div className="sb-section flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--sb-dark)]">Agent Dashboard</h1>
          <span className="text-sm text-[var(--sb-dark)] opacity-70">Live Monitor</span>
        </div>
        
        <div className="group relative">
           <button className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <span className="sr-only">Help</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
           </button>
           <div className="absolute right-0 top-10 w-72 bg-white shadow-xl border border-gray-100 rounded-lg p-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
              <h3 className="font-bold text-[var(--sb-dark)] mb-2">Dashboard Guide</h3>
              <ul className="text-xs text-gray-500 space-y-2">
                 <li>• <strong>SLA Breaches</strong>: Tickets that missed their deadline. Focus on these first!</li>
                 <li>• <strong>Urgent Attention</strong>: High priority tickets that need immediate action.</li>
                 <li>• <strong>Volume</strong>: Shows traffic flow to help anticipate busy hours.</li>
              </ul>
           </div>
        </div>
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
                <p className="text-sm text-gray-500">Incoming requests (Last 24 Hours)</p>
             </div>
             {/* <select className="sb-input w-auto text-xs py-1">
               <option>Last 24 Hours</option>
             </select> */}
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
