/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import { useTickets, useCustomers, useAgents, useRules } from "@/lib/data";
import { Ticket, TicketStatus } from "@/lib/types";
import { TicketCard } from "@/components/TicketCard";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { LayoutList, Kanban, Clock, Filter, Search, User, GripVertical, AlertCircle, RefreshCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function TicketsPage() {
  const { tickets, updateTicket, addNote, deleteTicket } = useTickets();
  const { customers } = useCustomers(); 
  const { agents } = useAgents();
  const { rules } = useRules();
  const agentNames = agents.map(a => a.name);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get selected ticket for Drawer
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) || null : null;
  
  // Helper to get customer email by ID
  const getCustomerEmail = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.email || customerId.slice(0, 8) + '...';
  };

  // --- Kanban Drag & Drop Handler ---
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
        // Optimistic UI Update (handled by useTickets internal state if strictly needed, but for now we rely on re-render after calling update)
        // Ideally we'd update local state immediately. 
        // For this demo, calling updateTicket triggers a re-fetch/update.
        const newStatus = destination.droppableId as TicketStatus;
        await updateTicket(draggableId, { status: newStatus });
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.id.includes(searchQuery)
  );

  // Group tickets by status for Kanban
  // We explicitly define columns order
  const columns: { id: TicketStatus; label: string; color: string }[] = [
      { id: 'Open', label: 'Open', color: 'bg-blue-500' },
      { id: 'In Progress', label: 'In Progress', color: 'bg-amber-500' },
      { id: 'Closed', label: 'Closed', color: 'bg-gray-500' },
  ];

  const grouped = columns.map(col => ({
    ...col,
    items: filteredTickets.filter(t => t.status === col.id)
  }));


  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* --- Header Controls --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-none gap-4">
        <div>
           <h1 className="text-2xl font-bold text-[var(--sb-dark)] flex items-center gap-2">
               Ticket Management
               <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border">
                  {tickets.length} Total
               </span>
           </h1>
           <p className="text-gray-500 text-sm">Monitor, assign, and track support requests.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--sb-green)] transition" />
                <input 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:bg-white transition"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[var(--sb-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="List View"
                >
                  <LayoutList size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-[var(--sb-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Kanban Board"
                >
                  <Kanban size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className={`transition-all duration-300 flex-1 relative ${viewMode === 'kanban' ? 'overflow-hidden' : ''}`}>
        
        {viewMode === 'list' && (
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
             <div className="overflow-auto flex-1">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50/80 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider backdrop-blur-sm">
                     <tr>
                       <th className="px-6 py-4 border-b">Ticket Details</th>
                       <th className="px-6 py-4 border-b">Status</th>
                       <th className="px-6 py-4 border-b">Priority</th>
                       <th className="px-6 py-4 border-b">Assignee</th>
                       <th className="px-6 py-4 border-b text-right">Created</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {filteredTickets.length > 0 ? (
                        filteredTickets.map(t => {
                        const assignedAgent = agents.find(a => a.name === t.assignee || a.email === t.assignee);
                        return (
                        <tr 
                           key={t.id} 
                           onClick={() => setSelectedTicketId(t.id)}
                           className="hover:bg-gray-50 cursor-pointer transition-colors duration-200 group relative"
                        >
                          <td className="px-6 py-4">
                             <div className="flex items-start gap-3">
                                 <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'Open' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                                 <div>
                                     <div className="font-semibold text-gray-900 group-hover:text-[var(--sb-green)] transition-colors">{t.title}</div>
                                     <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                                        #{t.id.slice(0,8)}
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        {getCustomerEmail(t.customerId)}
                                     </div>
                                 </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <StatusBadge status={t.status} />
                          </td>
                          <td className="px-6 py-4">
                             <PriorityBadge priority={t.priority} />
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--sb-dark)]">
                             {t.assignee ? (
                               <div className="flex items-center gap-2">
                                  <Avatar name={assignedAgent?.name || t.assignee} />
                                  <span className="font-medium text-gray-700">{assignedAgent?.name || t.assignee}</span>
                               </div>
                             ) : (
                               <span className="text-gray-400 text-xs uppercase tracking-wide font-medium">Unassigned</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 text-right font-mono whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                     )})
                    ) : (
                        <tr>
                            <td colSpan={5} className="py-20 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Search size={32} className="opacity-20" />
                                    <p>No tickets found matching your search.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                   </tbody>
                 </table>
             </div>
          </div>
        )}

        {viewMode === 'kanban' && (
           <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full pb-4">
                  {grouped.map((col) => (
                      <div key={col.id} className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/60 overflow-hidden">
                          {/* Column Header */}
                          <div className={`p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10`}>
                              <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                                  <h2 className="font-bold text-gray-800">{col.label}</h2>
                                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200">
                                      {col.items.length}
                                  </span>
                              </div>
                              {/* Optional: Add quick actions here */}
                          </div>

                          {/* Column Body (Droppable) */}
                          <Droppable droppableId={col.id}>
                              {(provided, snapshot) => (
                                  <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 p-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''} overflow-y-auto scrollbar-thin`}
                                  >
                                      {col.items.map((t, index) => (
                                          <Draggable key={t.id} draggableId={t.id} index={index}>
                                              {(provided, snapshot) => (
                                                  <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      {...provided.dragHandleProps}
                                                      onClick={() => setSelectedTicketId(t.id)}
                                                      style={{ ...provided.draggableProps.style }}
                                                      className={`mb-3 last:mb-0 group ${snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''}`}
                                                  >
                                                      <div className={`bg-white p-4 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${snapshot.isDragging ? 'border-[var(--sb-green)] shadow-xl ring-2 ring-[var(--sb-green)]/20' : 'border-gray-200 hover:border-[var(--sb-green)]/30'}`}>
                                                          <div className="flex justify-between items-start mb-2">
                                                              <span className="font-mono text-[10px] text-gray-400 font-medium">#{t.id.slice(0,6)}</span>
                                                              <div className="flex gap-1" title="Drag to reorder">
                                                                <PriorityBadge priority={t.priority} mini />
                                                              </div>
                                                          </div>
                                                          
                                                          <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
                                                              {t.title}
                                                          </h3>
                                                          
                                                          <div className="text-xs text-gray-500 mb-3 flex items-center gap-1.5 truncate">
                                                              <User size={12} className="text-gray-400" />
                                                              {getCustomerEmail(t.customerId)}
                                                          </div>

                                                          <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
                                                              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                  <Clock size={10} />
                                                                  {new Date(t.createdAt).toLocaleDateString()}
                                                              </div>
                                                              {t.assignee ? (
                                                                  <Avatar name={t.assignee} size="xs" />
                                                              ) : (
                                                                  <div className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                                                      <User size={10} className="text-gray-300" />
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}
                                          </Draggable>
                                      ))}
                                      {provided.placeholder}
                                      {col.items.length === 0 && !snapshot.isDraggingOver && (
                                          <div className="h-32 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-lg">
                                              <p className="text-sm font-medium">Empty</p>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </Droppable>
                      </div>
                  ))}
              </div>
           </DragDropContext>
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
          onDelete={(id) => deleteTicket(id)}
          agents={agentNames}
        />
      )}
    </div>
  );
}

// --- Sub Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        'Open': 'bg-blue-50 text-blue-700 border-blue-100',
        'In Progress': 'bg-amber-50 text-amber-700 border-amber-100',
        'Resolved': 'bg-green-50 text-green-700 border-green-100',
    } as const;
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const className = styles[status] || 'bg-gray-50 text-gray-600 border-gray-100';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
           {status}
        </span>
    );
}

const PriorityBadge = ({ priority, mini = false }: { priority: string, mini?: boolean }) => {
    const isHigh = priority === 'High';
    const isMed = priority === 'Medium';
    
    if (mini) {
        return (
            <div className={`w-2 h-2 rounded-full ${isHigh ? 'bg-red-500' : isMed ? 'bg-amber-400' : 'bg-gray-300'}`} />
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
                isHigh ? 'bg-red-500 shadow-sm shadow-red-200' : 
                isMed ? 'bg-amber-400' : 'bg-gray-300'
            }`} />
            <span className={`text-sm font-medium ${
                isHigh ? 'text-red-700' : 'text-gray-600'
            }`}>{priority}</span>
        </div>
    );
}

const Avatar = ({ name, size = 'sm' }: { name: string, size?: 'xs'|'sm' }) => (
    <div 
        className={`${size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center font-bold ring-2 ring-white shadow-sm border border-gray-100`}
        title={name}
    >
        {name.slice(0,1).toUpperCase()}
    </div>
);
