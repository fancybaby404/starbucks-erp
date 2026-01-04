"use client";
import React, { useState, useEffect } from "react";
import { useChat, useArticles, useAgents, useRules, useTickets } from "@/lib/data";
import { Send, Zap, Book, X, User, Search, MoreVertical, Clock, CheckCircle, AlertCircle, MessageSquare, Copy, Filter, FileText } from "lucide-react";
import { auth } from "@/lib/auth";

export default function ChatPage() {
  const { sessions, activeSessionId, setActiveSessionId, messages, sendMessage } = useChat();
  const { articles } = useArticles();
  const { agents } = useAgents();
  const { rules } = useRules();
  const { tickets } = useTickets(); // To look up ticket priority for SLA
  const currentUser = auth.getSession();
  
  const [input, setInput] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'unreplied'>('all');
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

  const handleCanned = (text: string) => {
    sendMessage(text, 'agent');
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
      
      {/* 1. LEFT SIDEBAR: Session List */}
      <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-none">
        {/* Header / Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10 space-y-3">
            <h2 className="text-lg font-bold text-[var(--sb-dark)] flex items-center justify-between">
                Inbox 
                <span className="text-xs bg-[var(--sb-green)] text-white px-2 py-0.5 rounded-full">{sessions.filter(s => s.status === 'Waiting').length} Waiting</span>
            </h2>
            
            {/* Filter Tabs */}
            <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
                {(['all', 'mine', 'unreplied'] as const).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setFilterMode(mode)}
                        className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${
                            filterMode === mode 
                            ? 'bg-white text-[var(--sb-green)] shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {mode === 'mine' ? 'My Chats' : mode}
                    </button>
                ))}
            </div>

            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--sb-green)] transition-colors" size={16} />
                <input 
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)]/20 focus:border-[var(--sb-green)] transition-all"
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSessions.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No chats found.</div>
            )}
            {filteredSessions.map(s => {
                const isWaiting = s.status === 'Waiting';
                const isActive = activeSessionId === s.id;
                const assignee = agents.find(a => a.id === s.agent_id);
                const isUnreplied = s.last_message_sender === 'customer';
                const isAssignedToMe = currentUser && s.agent_id === currentUser.id;

                return (
                    <div 
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                            isActive 
                            ? 'bg-[var(--sb-green)] text-white border-transparent shadow-md transform scale-[1.02]' 
                            : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-100'
                        }`}
                    >
                        {/* Indicators */}
                        <div className="absolute top-3 right-3 flex items-center gap-1">
                             {isAssignedToMe && <span className={`text-[8px] px-1 rounded font-bold uppercase ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>Me</span>}
                             <div className={`w-2 h-2 rounded-full ${
                                isWaiting ? 'bg-red-500 animate-pulse' : 
                                s.status === 'Active' ? 'bg-green-400' : 'bg-gray-300'
                             }`} />
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                                 isActive ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                             }`}>
                                 {(s.customer_id ? s.customer_id.slice(0, 2) : 'GU').toUpperCase()}
                             </div>
                             <div className="min-w-0">
                                 <div className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-[var(--sb-dark)]'}`}>
                                     Customer {s.customer_id ? s.customer_id.slice(0,4) : 'Guest'}
                                 </div>
                                 <div className={`text-xs truncate ${isActive ? 'text-green-100' : 'text-gray-400'}`}>
                                     {s.status} • {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                                 </div>
                             </div>
                        </div>
                        
                        <div className={`text-xs line-clamp-2 leading-relaxed ${
                            isActive ? 'text-green-50' : 'text-gray-500'
                        } ${isUnreplied && !isActive ? 'font-semibold text-gray-900' : ''}`}>
                             {isUnreplied && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 align-middle"></span>}
                             {s.last_message || "No messages yet"}
                        </div>
                        
                        <div className={`text-[10px] mt-2 text-right opacity-70 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                            {s.last_message_at ? new Date(s.last_message_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Just now'}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* 2. CHAT WINDOW */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {activeSession ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm">
                                {(activeSession.customer_id ? activeSession.customer_id.slice(0,2) : 'GU').toUpperCase()}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="font-bold text-[var(--sb-dark)] text-lg flex items-center gap-2">
                                Customer {activeSession.customer_id ? activeSession.customer_id.slice(0,4) : 'Guest'}
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                                    {activeSession.status}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12} /> Started {new Date(activeSession.started_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowEndModal(true)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                            title="End Chat"
                        >
                            <AlertCircle size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                            <MessageSquare size={48} className="mb-4 text-gray-300" />
                            <p>No messages yet. Say hello!</p>
                        </div>
                    )}
                    {messages.map(m => {
                        const isAgent = m.sender_type === 'agent';
                        const isSystem = m.sender_type === 'system';
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const isBot = (m.sender_type as any) === 'bot' || isSystem;
                        
                        return (
                            <div key={m.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[70%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                                    {/* Sender Name (Optional, maybe for Group Chat later) */}
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        {isBot && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Zap size={10} /> Auto-Reply</span>}
                                        {!isAgent && !isBot && <span className="text-[10px] font-bold text-gray-400">Customer</span>}
                                        {isAgent && <span className="text-[10px] font-bold text-[var(--sb-green)]">You</span>}
                                    </div>

                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        isAgent 
                                        ? 'bg-[var(--sb-green)] text-white rounded-br-sm' 
                                        : isBot
                                            ? 'bg-gray-100 text-gray-600 border border-gray-200 rounded-bl-sm'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                    }`}>
                                        {m.content}
                                    </div>
                                    <span className="text-[10px] text-gray-300 mt-1 px-1 font-medium">
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100 relative">
                    {showCanned && (
                         <div className="absolute bottom-full left-4 mb-4 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 z-30">
                            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Replies</span>
                                <button onClick={() => setShowCanned(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {articles.slice(0, 3).map(a => (
                                    <button key={a.id} onClick={() => handleCanned(`Here is a guide: ${a.title}`)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 transition-colors flex items-center gap-2">
                                        <Book size={14} className="text-[var(--sb-green)]" />
                                        <span className="truncate">{a.title}</span>
                                    </button>
                                ))}
                                <button onClick={() => handleCanned("Hi! How can I help you today?")} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 transition-colors">👋 Greeting</button>
                                <button onClick={() => handleCanned("I'm checking on that for you...")} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors">⏳ Hold message</button>
                            </div>
                         </div>
                    )}

                    <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-[var(--sb-green)] focus-within:ring-1 focus-within:ring-[var(--sb-green)] transition-all">
                        <button 
                            onClick={() => setShowCanned(!showCanned)} 
                            className={`p-2 rounded-xl transition-colors ${showCanned ? 'bg-[var(--sb-green)] text-white' : 'text-gray-400 hover:text-[var(--sb-green)] hover:bg-green-50'}`}
                            title="Quick Replies"
                        >
                            <Zap size={20} />
                        </button>
                        
                        <textarea 
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 max-h-32 resize-none text-gray-700 placeholder:text-gray-400"
                            placeholder="Type your message..."
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-2 rounded-xl bg-[var(--sb-green)] text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                 <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                     <MessageSquare size={40} className="text-[var(--sb-green)]" />
                 </div>
                 <h2 className="text-2xl font-bold text-[var(--sb-dark)] mb-2">Customer Support Chat</h2>
                 <p className="text-gray-500 max-w-sm">Select a conversation from the list to start chatting or viewing history.</p>
            </div>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR */}
      {activeSession && (
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hidden xl:flex flex-none animate-in slide-in-from-right-4 duration-500 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex flex-col items-center bg-gray-50/30">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-3 flex items-center justify-center text-2xl font-bold text-gray-500 shadow-inner">
                      {(activeSession.customer_id ? activeSession.customer_id.slice(0,2) : 'GU').toUpperCase()}
                  </div>
                  <h3 className="font-bold text-lg text-[var(--sb-dark)]">Customer</h3>
                  <p className="text-sm text-gray-400 font-mono mb-4">{activeSession.customer_id ? activeSession.customer_id.slice(0,8) : 'Guest'}</p>
                  
                  {/* Tabs */}
                  <div className="flex w-full bg-gray-200 rounded-lg p-1">
                      <button 
                        onClick={() => setRightTab('session')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${rightTab === 'session' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Current
                      </button>
                      <button 
                        onClick={() => setRightTab('history')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${rightTab === 'history' ? 'bg-white text-[var(--sb-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        History
                      </button>
                  </div>
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
                      Are you sure you want to end this chat? This will mark the session as closed and archive it.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowEndModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={() => {
                            // Close logic here (update DB)
                            // For now just close modal and ideally user expects status change.
                            sendMessage("Agent has ended the chat.", "system");
                            setShowEndModal(false);
                            // Optionally trigger status update
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
