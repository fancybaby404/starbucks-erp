import React from "react";
import { Ticket, TicketStatus, Rule } from "@/lib/types";
import { TicketNotes } from "./TicketNotes";
import { Clock, AlertCircle } from "lucide-react";

interface TicketCardProps {
  ticket: Ticket;
  agents: string[];
  onUpdate: (id: string, changes: Partial<Ticket>) => void;
  onAddNote: (id: string, text: string) => void;
  rules?: Rule[];
}

const STATUS_OPTIONS: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

export const TicketCard: React.FC<TicketCardProps & { onClick?: () => void }> = ({ ticket, agents, onUpdate, onAddNote, onClick, rules = [] }) => {
  
  // Calculate SLA Status
  // 1. Find matching rule (assume rule name matches priority, or fallback to first/general)
  const rule = rules.find(r => r.name.toLowerCase().includes(ticket.priority.toLowerCase())) || rules[0];
  
  let slaBadge = null;
  if (rule && (ticket.status === 'Open' || ticket.status === 'In Progress')) {
     const created = new Date(ticket.createdAt).getTime();
     const targetTime = created + (rule.resolutionMins * 60000); // Resolution Target
     const now = Date.now();
     const timeLeftMs = targetTime - now;
     
     const isBreached = timeLeftMs < 0;
     const isWarning = timeLeftMs < 3600000; // < 1 hour

     const hoursLeft = Math.floor(Math.abs(timeLeftMs) / 3600000);
     const minsLeft = Math.floor((Math.abs(timeLeftMs) % 3600000) / 60000);
     
     const timeString = `${hoursLeft}h ${minsLeft}m`;

     slaBadge = (
        <div className={`flex items-center gap-1 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border ${
            isBreached ? 'bg-red-100 text-red-700 border-red-200' :
            isWarning ? 'bg-amber-100 text-amber-700 border-amber-200' :
            'bg-emerald-50 text-emerald-600 border-emerald-100'
        }`}>
           {isBreached ? <AlertCircle size={12} /> : <Clock size={12} />}
           {isBreached ? `Breached by ${timeString}` : `${timeString} left`}
        </div>
     );
  }

  return (
    <article className="sb-card p-4 hover:border-[var(--sb-green)] cursor-pointer group relative overflow-hidden" onClick={onClick}>
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="font-semibold text-[var(--sb-dark)] leading-tight line-clamp-2">{ticket.title}</div>
        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          ticket.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
          ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
          'bg-gray-50 text-gray-600 border-gray-100'
        }`}>
          {ticket.priority}
        </span>
      </header>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
         <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span>#{ticket.id.slice(0, 4)}</span>
            <span>•</span>
            <span className={ticket.status === 'Open' ? 'text-blue-600 font-medium' : ''}>{ticket.status}</span>
         </div>
         <div className="flex items-center gap-2">
            {slaBadge}
            <div className="text-[10px] text-gray-400">
                {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
         </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex-1">
          <select
            className="w-full text-xs py-1 pl-2 pr-6 rounded bg-gray-50 border-transparent hover:bg-gray-100 focus:bg-white focus:ring-1 focus:ring-[var(--sb-green)] transition-colors appearance-none cursor-pointer"
            value={ticket.assignee ?? ""}
            onChange={(e) => onUpdate(ticket.id, { assignee: e.target.value })}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
             <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 1.5L4 4.5L7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        
        {/* Status Indicator Dot */}
        <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
           ticket.status === 'Open' ? 'bg-blue-500 animate-pulse' : 
           ticket.status === 'In Progress' ? 'bg-amber-400' :
           ticket.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-300'
        }`} title={ticket.status} />
      </div>
    </article>
  );
};
