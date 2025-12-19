"use client";
import React, { useState } from "react";
import { useChat, useArticles, useAgents } from "@/lib/data";
import { Send, Zap, Book, X, User } from "lucide-react";
import { auth } from "@/lib/auth";

export default function ChatPage() {
  const { sessions, activeSessionId, setActiveSessionId, messages, sendMessage } = useChat();
  const { articles } = useArticles();
  const { agents } = useAgents(); // To look up assignee names
  const currentUser = auth.getSession(); // for checking "My Chats"
  const [input, setInput] = useState("");
  const [showCanned, setShowCanned] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input, 'agent');
    setInput("");
  };

  const handleCanned = (text: string) => {
    sendMessage(text, 'agent');
    setShowCanned(false);
  };

  // Split sessions into Queued vs Active
  const queued = sessions.filter(s => s.status === 'Waiting');
  // Active includes open tickets and active chats
  const active = sessions.filter(s => ['Active', 'Open', 'In Progress'].includes(s.status));

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* LEFT PANE: Session List */}
      <div className="w-1/3 flex flex-col gap-4">
        {/* Waiting Queue */}
        <div className="sb-card p-4 flex-none bg-red-50 border-red-100">
           <h3 className="font-bold text-red-800 flex items-center justify-between mb-2">
             Waiting Queue 
             <span className="bg-red-200 text-red-900 px-2 rounded-full text-xs">{queued.length}</span>
           </h3>
           <div className="space-y-2 max-h-40 overflow-y-auto">
             {queued.length === 0 && <p className="text-sm text-red-400">No waiting customers.</p>}
             {queued.map(s => (
               <div key={s.id} className="bg-white p-2 rounded shadow-sm border border-red-100 cursor-pointer hover:shadow-md" onClick={() => setActiveSessionId(s.id)}>
                 <div className="font-medium text-sm">Customer {s.customer_id.slice(0,4)}</div>
                 <div className="text-xs text-red-500 font-mono">Waiting 2m</div>
               </div>
             ))}
           </div>
        </div>

        {/* Active Chats */}
        <div className="sb-card flex-1 flex flex-col overflow-hidden">
           <div className="p-3 border-b bg-gray-50 font-semibold text-gray-700">Active Chats</div>
           <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {active.map(s => {
                   const isUnreplied = s.last_message_sender === 'customer';
                   const assignee = agents.find(a => a.id === s.agent_id);
                   const isAssignedToMe = currentUser && s.agent_id === currentUser.id;

                   return (
                   <div 
                     key={s.id} 
                     onClick={() => setActiveSessionId(s.id)}
                     className={`p-3 rounded border cursor-pointer flex flex-col gap-2 ${activeSessionId === s.id ? 'bg-[var(--sb-green)] text-white' : 'bg-white hover:bg-gray-50'}`}
                   >
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                           <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'Active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                           <div className="font-medium text-sm">Customer {s.customer_id.slice(0,4)}</div>
                           {isUnreplied && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Unreplied"></div>}
                        </div>
                        {isAssignedToMe && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-bold uppercase">Me</span>}
                     </div>
                     
                     <div className={`text-xs truncate ${activeSessionId === s.id ? 'text-green-50' : 'text-gray-500'} ${isUnreplied ? 'font-bold' : ''}`}>
                        {s.last_message || "No messages yet"}
                     </div>
                     
                     <div className="flex justify-between items-center text-[10px] opacity-70">
                        <span>{assignee ? assignee.name : 'Unassigned'}</span>
                        <span>{s.last_message_at ? new Date(s.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                     </div>
                   </div>
                 )})}
             {active.length === 0 && <div className="p-4 text-center text-sm text-gray-400">No active chats.</div>}
           </div>
        </div>
      </div>

      {/* RIGHT PANE: Chat Window */}
      <div className="flex-1 sb-card flex flex-col overflow-hidden relative">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">
                   {activeSession.customer_id.slice(0,2).toUpperCase()}
                 </div>
                 <div>
                   <h2 className="font-bold text-[var(--sb-dark)]">Customer {activeSession.customer_id.slice(0,4)}</h2>
                   <div className="text-xs text-green-600 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                   </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="sb-btn bg-white text-[var(--sb-dark)] border hover:bg-gray-50">Transfer</button>
                 <button className="sb-btn bg-red-600 hover:bg-red-700">End Chat</button>
              </div>
            </div>

            {/* Messages */}
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
               {messages.map(m => {
                 const isAgent = m.sender_type === 'agent';
                 const isSystem = m.sender_type === 'system';
                 // Fallback for older messages or 'customer' vs 'user' ambiguity
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const isBot = (m.sender_type as any) === 'bot' || isSystem;
                 
                 return (
                   <div key={m.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                        {/* Label for Bot/System messages */}
                        {isBot && <span className="text-[10px] text-gray-400 uppercase font-bold mb-1 ml-1">🤖 Auto-Reply</span>}
                        
                        <div className={`p-3 rounded-lg text-sm shadow-sm ${
                          isAgent 
                            ? 'bg-[var(--sb-green)] text-white rounded-br-none' 
                            : isBot
                              ? 'bg-gray-100 text-gray-600 border border-gray-200'
                              : 'bg-white text-gray-800 border rounded-bl-none'
                        }`}>
                          {m.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                   </div>
                 );
               })}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white relative">
               {showCanned && (
                 <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border rounded-lg shadow-xl p-2 animate-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center px-2 pb-2 border-b mb-2">
                      <span className="text-xs font-bold text-gray-500">Fast Replies</span>
                      <X size={14} className="cursor-pointer" onClick={() => setShowCanned(false)} />
                    </div>
                    {articles.slice(0, 3).map(a => (
                      <button key={a.id} onClick={() => handleCanned(`Here is a guide: ${a.title}`)} className="text-left w-full text-sm p-2 hover:bg-gray-50 rounded truncate">
                        📖 {a.title}
                      </button>
                    ))}
                    <button onClick={() => handleCanned("Hi there! How can I help you today?")} className="text-left w-full text-sm p-2 hover:bg-gray-50 rounded">
                       👋 Greeting
                    </button>
                    <button onClick={() => handleCanned("Let me check that for you.")} className="text-left w-full text-sm p-2 hover:bg-gray-50 rounded">
                       ⏳ Hold on
                    </button>
                 </div>
               )}
               
               <div className="flex gap-2">
                 <button 
                   onClick={() => setShowCanned(!showCanned)} 
                   className={`p-2 rounded-lg transition ${showCanned ? 'bg-[var(--sb-light)] text-[var(--sb-green)]' : 'text-gray-400 hover:bg-gray-100'}`}
                   title="Canned Responses"
                 >
                   <Zap size={20} />
                 </button>
                 <input 
                   className="flex-1 sb-input outline-none border-gray-300 focus:border-[var(--sb-green)]" 
                   placeholder="Type a message..." 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                 />
                 <button className="sb-btn w-12" onClick={handleSend}>
                   <Send size={18} />
                 </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60">
             <Book size={48} className="mb-4" />
             <p>Select a chat session to start messaging.</p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Session Info (If Active) */}
      {activeSession && (
        <div className="w-64 sb-card p-4 hidden xl:block bg-gray-50 border-l">
           <h3 className="font-bold text-[var(--sb-dark)] mb-4">Session Info</h3>
           <div className="space-y-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Session ID</div>
                <div className="text-sm font-mono text-gray-600">{activeSession.id.slice(0, 8)}...</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Status</div>
                <div className={`inline-block px-2 py-1 text-xs font-bold rounded ${activeSession.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {activeSession.status}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold mb-2">Started At</div>
                <div className="text-sm text-gray-600">
                  {new Date(activeSession.started_at).toLocaleString()}
                </div>
              </div>
              {activeSession.metadata?.ticketId && (
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Linked Ticket</div>
                  <div className="text-sm font-mono text-[var(--sb-green)]">#{activeSession.metadata.ticketId.slice(0, 8)}</div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
