import React from "react";
import { Ticket, TicketStatus } from "@/lib/types";
import { TicketNotes } from "./TicketNotes";
import { X, User, Clock, Mail } from "lucide-react";

interface TicketDetailModalProps {
  ticket: Ticket;
  customerEmail: string;
  agents: string[];
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Ticket>) => void;
  onAddNote: (id: string, text: string) => void;
}

const STATUS_OPTIONS: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, customerEmail, agents, onClose, onUpdate, onAddNote }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-start justify-between bg-[var(--sb-cream)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-gray-200 px-1 rounded">#{ticket.id.slice(0, 8)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ticket.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {ticket.priority} Priority
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--sb-dark)] leading-tight">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Customer Info */}
        <div className="p-4 bg-[var(--sb-green)] text-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
               <User size={20} />
             </div>
             <div>
               <div className="font-semibold">{customerEmail}</div>
               <div className="text-xs text-[var(--sb-light)] flex items-center gap-1">
                 <Mail size={12} /> Customer
               </div>
             </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Status & Assignee Controls */}
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
               <select 
                 className="sb-input" 
                 value={ticket.status} 
                 onChange={(e) => onUpdate(ticket.id, { status: e.target.value as TicketStatus })}
               >
                 {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs font-medium text-gray-500 mb-1 block">Assignee</label>
               <select 
                 className="sb-input" 
                 value={ticket.assignee ?? ""} 
                 onChange={(e) => onUpdate(ticket.id, { assignee: e.target.value })}
               >
                 <option value="">Unassigned</option>
                 {agents.map(a => <option key={a} value={a}>{a}</option>)}
               </select>
             </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--sb-dark)] mb-2">Issue Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100">
              {ticket.title} {/* Using title as description for now per schema limits, or fetch full description */}
            </p>
          </div>

          {/* Notes */}
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
             <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
               Internal Notes
             </h3>
             <TicketNotes ticket={ticket} onAdd={(text) => onAddNote(ticket.id, text)} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 font-medium text-sm transition">
            Close
          </button>
          <button className="flex-1 py-2 px-4 bg-[var(--sb-green)] text-white rounded hover:brightness-110 font-medium text-sm transition shadow">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
