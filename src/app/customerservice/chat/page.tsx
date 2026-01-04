"use client";
import React, { useState, useEffect } from "react";
import { useChat, useArticles, useAgents, useRules, useTickets } from "@/lib/data";
import { Send, Zap, Book, X, User, Search, MoreVertical, Clock, CheckCircle, AlertCircle, MessageSquare, Copy, Filter, FileText, Trash2 } from "lucide-react";
import { auth } from "@/lib/auth";

export default function ChatPage() {
  const { sessions, activeSessionId, setActiveSessionId, messages, sendMessage, endSession, deleteSession } = useChat();
  const { articles } = useArticles();
  const { agents } = useAgents();
  const { rules } = useRules();
  const { tickets } = useTickets(); // To look up ticket priority for SLA
  const currentUser = auth.getSession();
  
  const [input, setInput] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'unreplied' | 'closed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'session' | 'history'>('session');
  const [showEndModal, setShowEndModal] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Scroll to bottom of chat
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input, 'agent');
    setInput("");
  };

  const handleCanned = async (text: string) => {
    await sendMessage(text, 'agent');
    setShowCanned(false);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and Sort Sessions
  const filteredSessions = sessions.filter(s => {
     const matchesSearch = (s.customer_id || "Guest").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (s.status || "").toLowerCase().includes(searchTerm.toLowerCase());
     
     if (!matchesSearch) return false;

     if (filterMode === 'closed') return s.status === 'Closed';
     
     // For other modes, hide Closed chats
     if (s.status === 'Closed') return false;

     if (filterMode === 'mine') return currentUser && s.agent_id === currentUser.id;
     if (filterMode === 'unreplied') return s.last_message_sender === 'customer';
     
     return true;
  }).sort((a, b) => {
      // 1. Prioritize "My Chats" if "All" is selected (optional, per user request "Put it above")
      const aIsMine = currentUser && a.agent_id === currentUser.id;
      const bIsMine = currentUser && b.agent_id === currentUser.id;
      
      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;

      // 2. Prioritize Waiting
      if (a.status === 'Waiting' && b.status !== 'Waiting') return -1;
      if (a.status !== 'Waiting' && b.status === 'Waiting') return 1;
      
      // 3. Prioritize Unreplied
      const aUnreplied = a.last_message_sender === 'customer';
      const bUnreplied = b.last_message_sender === 'customer';
      if (aUnreplied && !bUnreplied) return -1;
      if (!aUnreplied && bUnreplied) return 1;

      // 4. Time
      return new Date(b.last_message_at || b.started_at).getTime() - new Date(a.last_message_at || a.started_at).getTime();
  });

  // Calculate SLA Status
  // Logic: 
  // - Find linked ticket to get Priority.
  // - Find rule matching that Priority.
  // - Calculate limit based on started_at (Response) or ticket created_at (Resolution)?
  // - For CHAT, usually it's "Response Time". 
  // - Let's assume Rule "High Priority" -> Response 30m.
  const getSlaStatus = () => {
      if (!activeSession) return null;
      
      const ticketId = activeSession.metadata?.ticketId;
      const ticket = tickets.find(t => t.id === ticketId);
      
      // Default rule or matching rule
      // If no ticket, assume "General" or lowest priority rule logic?
      // User said "show what we have in SLA rules".
      // Let's look for a rule that matches ticket priority.
      
      const priority = ticket?.priority || 'Medium'; // Default to Medium if no ticket
      
      // Find rule where condition_field='priority' and condition_value=priority
      const rule = rules.find(r => r.conditionField === 'priority' && r.conditionValue?.toLowerCase() === priority.toLowerCase()) 
                   || rules.find(r => r.name === 'General Support'); // Fallback
      
      if (!rule) return null;

      // Calculate Deadline
      const startTime = new Date(activeSession.started_at).getTime();
      const deadline = startTime + (rule.responseMins * 60 * 1000);
      const now = Date.now();
      const diffMins = Math.round((deadline - now) / 60000);
      
      const isBreached = now > deadline;
      
      return {
          ruleName: rule.name,
          responseMins: rule.responseMins,
          isBreached,
          diffMins: Math.abs(diffMins),
          deadline: new Date(deadline)
      };
  };

  const slaStatus = getSlaStatus();

  return (
    <div className="h-[calc(100vh-100px)] flex gap-6 overflow-hidden">
      
      <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-none">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10 space-y-3">
             <div className="relative mb-3">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <input 
                    placeholder="Search chats..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                 <button onClick={() => setFilterMode('all')} className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition-colors ${filterMode === 'all' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>All</button>
                 <button onClick={() => setFilterMode('mine')} className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition-colors ${filterMode === 'mine' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>My Chats</button>
                 <button onClick={() => setFilterMode('unreplied')} className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition-colors ${filterMode === 'unreplied' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Unreplied</button>
                 <button onClick={() => setFilterMode('closed')} className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition-colors ${filterMode === 'closed' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Closed</button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
             {filteredSessions.length === 0 && (
                 <div className="text-center py-10 text-gray-400 text-sm">No chats found.</div>
             )}
             {filteredSessions.map(session => {
                 const isActive = session.id === activeSessionId;
                 const isUnreplied = session.last_message_sender === 'customer';
                 return (
                     <div 
                        key={session.id} 
                        onClick={() => setActiveSessionId(session.id)}
                        className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 group flex justify-between items-start gap-2 ${isActive ? 'bg-blue-50/50 border-l-4 border-l-[var(--sb-green)]' : 'border-l-4 border-l-transparent'}`}
                     >
                         <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-1">
                                 <span className="font-bold text-sm text-[var(--sb-dark)] flex items-center gap-2 truncate">
                                     {session.last_message_sender === 'customer' && <span className="w-2 h-2 rounded-full bg-[var(--sb-green)] flex-none"></span>}
                                     {session.customer_id || "Guest User"}
                                 </span>
                                 <span className="text-[10px] text-gray-400 flex-none ml-2">{new Date(session.last_message_at || session.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                             </div>
                             <p className={`text-xs line-clamp-1 ${isActive ? 'text-gray-700' : 'text-gray-500'} ${isUnreplied && !isActive ? 'font-semibold text-gray-900' : ''}`}>
                                 {session.last_message_sender === 'agent' && <span className="font-bold mr-1">You:</span>}
                                 {session.last_message || "No messages yet"}
                             </p>
                         </div>
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Delete this chat?')) deleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all self-center"
                            title="Delete Chat"
                         >
                             <Trash2 size={14} />
                         </button>
                     </div>
                 );
             })}
          </div>
      </div>

      {/* CENTER: Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50/50 relative">
          {activeSession ? (
              <>
                {/* Chat Header */}
                <div className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--sb-green)] to-[#00754a] flex items-center justify-center text-white font-bold shadow-md">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--sb-dark)]">{activeSession.customer_id || "Guest User"}</h2>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs text-gray-500">Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setShowEndModal(true)}
                            className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                            title="End Chat Session"
                         >
                             <AlertCircle size={16} />
                             End Chat
                         </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.sender_type === 'agent' || msg.sender_type === 'bot' || msg.sender_type === 'system';
                        const isSystem = msg.sender_type === 'system';
                        
                        if (isSystem) {
                             return (
                                 <div key={msg.id} className="flex justify-center my-4">
                                     <span className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                                         {msg.content}
                                     </span>
                                 </div>
                             );
                        }

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm ${
                                    isMe 
                                    ? 'bg-[var(--sb-green)] text-white rounded-tr-sm' 
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-200">
                    <div className="relative flex items-center gap-2">
                        <button 
                             onClick={() => setShowCanned(!showCanned)}
                             className={`p-2 rounded-lg transition-colors ${showCanned ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100 text-gray-400'}`}
                             title="Quick Replies (from Self-Service)"
                        >
                            <Zap size={20} />
                        </button>
                       
                        {/* Quick Replies Popup */}
                        {showCanned && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-2 z-20">
                                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase">Suggested Articles</h5>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {articles.length > 0 ? (
                                        articles.map(article => (
                                            <button 
                                                key={article.id}
                                                type="button"
                                                onClick={() => handleCanned(`I found this article that might help: **${article.title}**`)}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50 last:border-0 transition-colors"
                                            >
                                                <div className="font-bold truncate">{article.title}</div>
                                                <div className="text-xs text-gray-400 truncate mt-0.5">{article.category}</div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-400 text-xs italic">
                                            No articles found in Self-Service.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <input 
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] transition-all"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-2.5 bg-[var(--sb-green)] text-white rounded-xl hover:brightness-110 shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare size={32} className="opacity-50" />
                  </div>
                  <p className="font-medium">Select a conversation to start chatting</p>
              </div>
          )}
      </div>

      {/* RIGHT SIDEBAR: Info */}
      {activeSession && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <div className="flex items-center border-b border-gray-100">
                  <button 
                    onClick={() => setRightTab('session')} 
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${rightTab === 'session' ? 'border-[var(--sb-green)] text-[var(--sb-dark)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                      Current
                  </button>
                  <button 
                    onClick={() => setRightTab('history')} 
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${rightTab === 'history' ? 'border-[var(--sb-green)] text-[var(--sb-dark)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                      History
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {rightTab === 'session' ? (
                  <>
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Session Details</h4>
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Status</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    activeSession.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{activeSession.status}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Started</span>
                                <span className="font-medium text-[var(--sb-dark)]">{new Date(activeSession.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Messages</span>
                                <span className="font-medium text-[var(--sb-dark)]">{messages.length}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SLA Status</h4>
                        {slaStatus ? (
                            <div className={`p-4 border rounded-xl shadow-sm ${
                                slaStatus.isBreached ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                            }`}>
                                 <div className="flex items-start gap-3">
                                     {slaStatus.isBreached ? <AlertCircle size={20} className="text-red-500 mt-0.5" /> : <CheckCircle size={20} className="text-green-500 mt-0.5" />}
                                     <div>
                                         <p className={`text-sm font-bold ${slaStatus.isBreached ? 'text-red-700' : 'text-green-700'}`}>
                                             {slaStatus.ruleName}
                                         </p>
                                         <p className={`text-xs mt-1 font-medium ${slaStatus.isBreached ? 'text-red-600' : 'text-green-600'}`}>
                                             {slaStatus.isBreached 
                                              ? `Overdue by ${slaStatus.diffMins} mins` 
                                              : `Due in ${slaStatus.diffMins} mins`}
                                         </p>
                                         <div className="w-full bg-white/50 h-1.5 rounded-full mt-2 overflow-hidden">
                                             <div 
                                                className={`h-full ${slaStatus.isBreached ? 'bg-red-500' : 'bg-green-500'}`} 
                                                style={{ width: `${Math.min(100, (slaStatus.responseMins - slaStatus.diffMins)/slaStatus.responseMins * 100)}%` }}
                                             />
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center dashed-border">
                                <p className="text-xs text-gray-400">No active SLA rules detected.</p>
                            </div>
                        )}
                    </div>

                    {activeSession.metadata?.ticketId && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Linked Ticket</h4>
                            <button 
                               onClick={() => handleCopy(activeSession.metadata.ticketId)}
                               className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors text-left group relative"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                                    #{activeSession.metadata.ticketId.slice(0, 3)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-blue-900">Ticket ID</p>
                                    <p className="text-xs text-blue-600 truncate font-mono">{activeSession.metadata.ticketId}</p>
                                </div>
                                <Copy size={16} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {copiedId === activeSession.metadata.ticketId && (
                                    <div className="absolute top-0 right-0 -mt-8 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                        Copied!
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                      {/* PAST TICKETS */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <FileText size={12} /> Past Tickets
                          </h4>
                          <div className="space-y-2">
                              {tickets.filter(t => t.customerId === activeSession.customer_id && t.id !== activeSession.metadata?.ticketId).length === 0 && (
                                  <p className="text-xs text-gray-400 italic">No other tickets found.</p>
                              )}
                              {tickets.filter(t => t.customerId === activeSession.customer_id && t.id !== activeSession.metadata?.ticketId).slice(0, 3).map(t => (
                                  <div key={t.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="font-mono text-[10px] text-gray-400">#{t.id.slice(0,6)}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                              t.status === 'Closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-600'
                                          }`}>{t.status}</span>
                                      </div>
                                      <p className="text-xs font-medium text-gray-800 line-clamp-2">{t.title}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* PAST CHATS */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <MessageSquare size={12} /> Past Chats
                          </h4>
                          <div className="space-y-2">
                              {sessions.filter(s => s.customer_id === activeSession.customer_id && s.id !== activeSession.id).length === 0 && (
                                  <p className="text-xs text-gray-400 italic">No previous chats.</p>
                              )}
                              {sessions.filter(s => s.customer_id === activeSession.customer_id && s.id !== activeSession.id).slice(0, 3).map(s => (
                                  <div key={s.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSessionId(s.id)}>
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-[10px] text-gray-400">{new Date(s.started_at).toLocaleDateString()}</span>
                                          <span className="text-[10px] text-gray-500">{s.status}</span>
                                      </div>
                                      <p className="text-xs text-gray-600 truncate">{s.last_message || "No content"}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                )}
              </div>
          </div>
      )}

      {/* 4. DIALOGS */}
      {/* End Chat Modal */}
      {showEndModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-[90%] animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">End Session?</h3>
                  <p className="text-sm text-gray-500 mb-6">
                      Are you sure you want to end this chat? This will mark the session as closed and resolve the linked ticket.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowEndModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={async () => {
                            await endSession();
                            setShowEndModal(false);
                            setActiveSessionId(null);
                        }}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
                      >
                          End Chat
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
