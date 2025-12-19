/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import { useTickets, useCustomers, useAgents, useRules } from "@/lib/data";
import { Ticket, TicketStatus } from "@/lib/types";
import { TicketCard } from "@/components/TicketCard";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { LayoutList, Kanban, Clock, Filter, Search, User } from "lucide-react";

// const AGENTS = ["Ava", "Noah", "Liam", "Emma"]; // Removed

export default function TicketsPage() {
  const { tickets, updateTicket, addNote } = useTickets();
  const { customers } = useCustomers(); 
  const { agents } = useAgents();
  const { rules } = useRules();
  const agentNames = agents.map(a => a.name);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Get the latest version of the selected ticket from the tickets array
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) || null : null;
  
  // Helper to get customer email by ID
  const getCustomerEmail = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.email || customerId.slice(0, 8) + '...';
  };

  // Group tickets by status for Kanban
  const grouped = (['Open', 'In Progress', 'Resolved'] as TicketStatus[]).map(status => ({
    status,
    items: tickets.filter(t => t.status === status)
  }));

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm flex-none">
        <div>
           <h1 className="text-2xl font-bold text-[var(--sb-dark)]">Ticket Management</h1>
           <p className="text-gray-500 text-sm">Monitor and assign incoming support requests</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'list' ? 'bg-[var(--sb-green)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'kanban' ? 'bg-[var(--sb-green)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Kanban Board
            </button>
        </div>
      </div>

      <div className={`transition-all duration-300 ${viewMode === 'list' ? 'block' : 'grid grid-cols-3 h-[calc(100vh-220px)] overflow-x-auto items-start gap-4'}`}>
        {viewMode === 'list' ? (
          <div className="sb-card overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                 <tr>
                   <th className="px-6 py-4">Ticket</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4">Priority</th>
                   <th className="px-6 py-4">Assignee</th>
                   <th className="px-6 py-4 text-right">Created</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {tickets.map(t => {
                   const assignedAgent = agents.find(a => a.name === t.assignee || a.email === t.assignee);
                   return (
                   <tr 
                      key={t.id} 
                      onClick={() => setSelectedTicketId(t.id)}
                      className="hover:bg-[var(--sb-cream)] cursor-pointer transition-colors duration-200 group"
                   >
                     <td className="px-6 py-4">
                       <div className="font-semibold text-[var(--sb-dark)] truncate max-w-xs group-hover:text-[var(--sb-green)] transition-colors">{t.title}</div>
                       <div className="text-xs text-gray-400 font-mono">#{t.id.slice(0,8)}</div>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                             t.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                             t.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                             t.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                             'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                          {t.status}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                             t.priority === 'High' ? 'bg-red-500 shadow-sm shadow-red-200' : 
                             t.priority === 'Medium' ? 'bg-amber-400' : 'bg-gray-300'
                           }`} />
                           <span className={`text-sm font-medium ${
                             t.priority === 'High' ? 'text-red-700' : 'text-gray-600'
                           }`}>{t.priority}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-[var(--sb-dark)]">
                        {t.assignee ? (
                          <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-full bg-[var(--sb-light)] text-[var(--sb-dark)] flex items-center justify-center text-xs font-bold ring-2 ring-white">
                                {(assignedAgent?.name || t.assignee).slice(0,1).toUpperCase()}
                             </div>
                             <span className="font-medium">{assignedAgent?.name || t.assignee}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs uppercase tracking-wide">Unassigned</span>
                        )}
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-400 text-right font-mono">
                       {new Date(t.createdAt).toLocaleDateString()}
                     </td>
                   </tr>
                 )})}
                 {tickets.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                       No tickets found.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        ) : (
          grouped.map(({ status, items }) => (
            <section key={status} className={`sb-card p-3 flex flex-col h-full bg-gray-50/50`}>
              <h2 className="font-semibold mb-2 flex justify-between items-center text-[var(--sb-dark)]">
                 {status} 
                 <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin">
                {items.map((t) => (
                  <TicketCard 
                    key={t.id} 
                    ticket={t} 
                    agents={agentNames} 
                    onUpdate={updateTicket} 
                    onAddNote={addNote} 
                    onAddNote={addNote} 
                    onClick={() => setSelectedTicketId(t.id)}
                    rules={rules}
                  />
                ))}
                {items.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
                     <span>No tickets</span>
                     {status === 'Open' && <span className="text-xs opacity-75">Waiting for chat...</span>}
                  </div>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Ticket Detail Side Drawer / Modal */}
      {selectedTicket && (
        <TicketDetailModal 
          ticket={selectedTicket} 
          customerEmail={getCustomerEmail(selectedTicket.customerId)}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={(id, changes) => updateTicket(id, changes)}
          onAddNote={(id, text) => addNote(id, text, true)}
          agents={agentNames}
        />
      )}
    </div>
  );
}
