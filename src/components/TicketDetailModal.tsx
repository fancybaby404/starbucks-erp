import React, { useState, useEffect, useRef } from "react";
import { Ticket, TicketStatus, ChatMessage } from "@/lib/types";
import { TicketNotes } from "./TicketNotes";
import { X, User, Clock, Mail, MessageSquare, Save, Check, ChevronRight, UserCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TicketDetailModalProps {
  ticket: Ticket;
  customerEmail: string;
  agents: string[];
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Ticket>) => void;
  onAddNote: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: TicketStatus[] = ["Open", "In Progress", "Closed"];

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, customerEmail, agents, onClose, onUpdate, onAddNote, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(ticket.status);
  const [localAssignee, setLocalAssignee] = useState(ticket.assignee || "");
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch chat history
  useEffect(() => {
      const fetchChat = async () => {
          if (!supabase) return;
          setChatLoading(true);
          try {
              // Try to find a session linked to this ticket
              // 1. Check if we have session_id (not in Ticket type yet, but check metadata)
              // 2. Or search chat_sessions for metadata->ticketId = ticket.id
              const { data: sessions } = await supabase
                  .from('chat_sessions')
                  .select('id')
                  .contains('metadata', { ticketId: ticket.id })
                  .limit(1);
              
              if (sessions && sessions.length > 0) {
                  const sessionId = sessions[0].id;
                  const { data: msgs } = await supabase
                      .from('chat_messages')
                      .select('*')
                      .eq('session_id', sessionId)
                      .order('created_at', { ascending: true });
                  
                  if (msgs) {
                      setChatMessages(msgs as ChatMessage[]);
                  }
              } else {
                  // Fallback: Try to find by customer_id if recent? 
                  // For now, if not explicitly linked, we might show empty or search
              }
          } catch (e) {
              console.error("Error loading chat:", e);
          } finally {
              setChatLoading(false);
          }
      };
      
      if (activeTab === 'chat') {
          fetchChat();
      }
  }, [activeTab, ticket.id]);

  const handleSave = () => {
      onUpdate(ticket.id, { status: localStatus, assignee: localAssignee === "" ? undefined : localAssignee });
      setHasChanges(false);
      onClose();
  };

  const handleDelete = () => {
      if (confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
          setIsDeleting(true);
          onDelete(ticket.id);
          onClose(); // Parent handles state update
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-4">
               <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                   <ChevronRight size={24} />
               </button>
               <div>
                   <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-gray-500 font-bold tracking-wider">#{ticket.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${
                            ticket.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                            ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                            {ticket.priority} Priority
                        </span>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-1">{ticket.title}</h2>
               </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-2"
                  title="Delete Ticket"
              >
                  <Trash2 size={20} />
              </button>
              <button 
                  onClick={handleSave}
                  disabled={!hasChanges && localStatus === ticket.status && localAssignee === (ticket.assignee || "")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      hasChanges || localStatus !== ticket.status || localAssignee !== (ticket.assignee || "")
                      ? 'bg-[var(--sb-green)] text-white hover:brightness-110 shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                  <Save size={16} /> Save
              </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50/50 px-6">
            <button 
               onClick={() => setActiveTab('details')}
               className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'border-[var(--sb-green)] text-[var(--sb-green)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <TicketIcon size={16} /> Ticket Details
            </button>
            <button 
               onClick={() => setActiveTab('chat')}
               className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-[var(--sb-green)] text-[var(--sb-green)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <MessageSquare size={16} /> Linked Chat
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
            {activeTab === 'details' ? (
                <div className="p-8 space-y-8">
                    {/* Main Info */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                             <div className="space-y-2">
                                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                                 <div className="relative">
                                     <select 
                                       className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[var(--sb-green)] focus:border-[var(--sb-green)] block p-3 pr-8 font-medium transition-colors cursor-pointer hover:bg-gray-100"
                                       value={localStatus}
                                       onChange={(e) => {
                                           setLocalStatus(e.target.value as TicketStatus);
                                           setHasChanges(true);
                                       }}
                                     >
                                         {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                     </select>
                                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                         <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="space-y-2">
                                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned To</label>
                                 <div className="relative">
                                     <select 
                                       className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-[var(--sb-green)] focus:border-[var(--sb-green)] block p-3 pr-8 font-medium transition-colors cursor-pointer hover:bg-gray-100"
                                       value={localAssignee}
                                       onChange={(e) => {
                                           setLocalAssignee(e.target.value);
                                           setHasChanges(true);
                                       }}
                                     >
                                         <option value="">-- Unassigned --</option>
                                         {agents.map(a => <option key={a} value={a}>{a}</option>)}
                                     </select>
                                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                         <UserCircle size={18} />
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Customer</label>
                            <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {customerEmail.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">{customerEmail}</div>
                                    <div className="text-xs text-blue-500 font-medium">Verified Customer</div>
                                </div>
                                <button className="ml-auto p-2 hover:bg-white rounded-full transition text-blue-400">
                                    <Mail size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                         <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                             <div className="w-1 h-5 bg-yellow-400 rounded-full"></div>
                             Internal Notes
                         </h3>
                         <TicketNotes ticket={ticket} onAdd={(text) => onAddNote(ticket.id, text)} />
                    </div>
                </div>
            ) : (
                <div className="p-0 h-full flex flex-col">
                    {chatLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <Clock className="animate-spin" size={24} />
                            <p className="text-sm">Loading history...</p>
                        </div>
                    ) : chatMessages.length > 0 ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {chatMessages.map(m => {
                                const isStaff = !['customer', 'user'].includes(m.sender_type);
                                return (
                                <div key={m.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                                        isStaff 
                                        ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm'
                                    }`}>
                                        <div className={`text-[10px] font-bold mb-1 uppercase tracking-wider ${isStaff ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {isStaff ? (m.sender_type === 'system' ? 'System' : 'You (Agent)') : 'Customer'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                                        </div>
                                        {m.content}
                                    </div>
                                </div>
                            )})}
                            <div className="text-center text-xs text-gray-400 my-8">
                                — End of linked history —
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <MessageSquare size={32} className="opacity-50" />
                            </div>
                            <p className="text-sm">No linked chat session found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// Icon helper
const TicketIcon = ({ size }: { size: number }) => (
    <svg 
     width={size} 
     height={size} 
     viewBox="0 0 24 24" 
     fill="none" 
     stroke="currentColor" 
     strokeWidth="2" 
     strokeLinecap="round" 
     strokeLinejoin="round"
    >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
        <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
    </svg>
);
