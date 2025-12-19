"use client";
import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader2, MessageSquare, Star, Search, ArrowRight, X, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import Link from "next/link";

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  ticketId?: string; // Optional ticket ID for badge rendering
};

type ViewMode = 'home' | 'faq' | 'status';

export default function SupportPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [isChatMaximized, setIsChatMaximized] = useState(false);

  // -- Chat State (Shared between Inline and Modal) --
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Welcome to Starbucks Support! I can help you create a support ticket. Please briefly describe your issue.' }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0); 
  const [formData, setFormData] = useState({ description: "", email: "" });
  const [loading, setLoading] = useState(false);
  // Active chat session ID for saving messages
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Refs for auto-scroll
  const bottomRefInline = useRef<HTMLDivElement>(null);
  const bottomRefModal = useRef<HTMLDivElement>(null);

  // -- Status Check State --
  const [ticketIdQuery, setTicketIdQuery] = useState("");
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  // New: Chat History for Status
  const [ticketChatSession, setTicketChatSession] = useState<Message[] | null>(null);
  // Agent takeover flag - when true, bot stops auto-responding
  const [agentTakeover, setAgentTakeover] = useState(false);

  useEffect(() => {
    bottomRefInline.current?.scrollIntoView({ behavior: 'smooth' });
    if (isChatMaximized) {
        bottomRefModal.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatMaximized]);

  // -- Handlers --

  // Helper to save a message to the database
  const saveMessageToDb = async (sessionId: string, senderType: 'bot' | 'user', content: string) => {
      if (!supabase) return;
      try {
          await supabase.from('chat_messages').insert({
              session_id: sessionId,
              sender_type: senderType,
              content: content,
              created_at: new Date().toISOString()
          });
      } catch (err) {
          console.error('Failed to save message:', err);
      }
  };

  // Helper to create or get session
  const ensureSession = async (): Promise<string | null> => {
      if (activeSessionId) return activeSessionId;
      if (!supabase) return null;
      
      try {
          const sessionId = uuidv4();
          await supabase.from('chat_sessions').insert({
              id: sessionId,
              status: 'Active',
              started_at: new Date().toISOString(),
              metadata: {}
          });
          setActiveSessionId(sessionId);
          // Save the welcome message
          await saveMessageToDb(sessionId, 'bot', 'Welcome to Starbucks Support! I can help you create a support ticket. Please briefly describe your issue.');
          return sessionId;
      } catch (err) {
          console.error('Failed to create session:', err);
          return null;
      }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    
    // Ensure we have a session and save the user message immediately
    const sessionId = await ensureSession();
    if (sessionId) {
        saveMessageToDb(sessionId, 'user', userText);
    }
    
    setMessages(prev => [...prev, { id: uuidv4(), sender: 'user', text: userText }]);
    setInput("");

    if (step === 0) {
        setFormData(prev => ({ ...prev, description: userText }));
        setStep(1);
        if (!agentTakeover) {
            setTimeout(() => {
                const botText = 'I understand. What is the best email address to reach you at?';
                setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: botText }]);
                if (sessionId) saveMessageToDb(sessionId, 'bot', botText);
            }, 3000);
        }
    } else if (step === 1) {
        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userText)) {
             if (!agentTakeover) {
                 const botText = "That doesn't look like a valid email. Please try again (e.g., name@example.com).";
                 setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: botText }]);
                 if (sessionId) saveMessageToDb(sessionId, 'bot', botText);
             }
             return;
        }

        setFormData(prev => ({ ...prev, email: userText }));
        setStep(2);
        setLoading(true);
        setTimeout(async () => {
            await createTicket(formData.description, userText, sessionId);
        }, 800);
    } else if (step === 3 && !agentTakeover) {
        // Post-ticket conversation - respond with variety (only if no agent takeover)
        const responses = [
            "I've noted that! Is there anything specific you'd like to add to your ticket?",
            "Got it! Feel free to share more details if needed.",
            "Thanks for letting me know! Anything else on your mind?",
            "Noted! Our team will review this along with your ticket.",
            "I hear you! Is there anything else I can help clarify?"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                id: uuidv4(), 
                sender: 'bot', 
                text: randomResponse 
            }]);
            if (sessionId) saveMessageToDb(sessionId, 'bot', randomResponse);
        }, 3000);
    }
  };

  const createTicket = async (desc: string, email: string, existingSessionId: string | null) => {
      if (!supabase) {
          setLoading(false);
          setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: "System is currently offline. Please try again later." }]);
          return;
      }
      try {
          // 1. Customer
          let customerId = "";
          const { data: existing } = await supabase.from('customer').select('id').eq('email', email).single();
          if (existing) {
              customerId = existing.id; 
          } else {
              const { data: newC, error: cErr } = await supabase.from('customer').insert({
                  name: "Guest Customer",
                  email: email,
                  contact_info: email,
                  customer_id: uuidv4(),
                  preferences: {} 
              }).select().single();
              if (cErr || !newC) {
                  console.error("Customer creation failed:", JSON.stringify(cErr, null, 2));
                  throw new Error(`Failed to create customer record: ${cErr?.message || 'Unknown error'}`);
              }
              customerId = newC.id;
          }

          // 2. Ticket
          const { data: ticket, error: tErr } = await supabase.from('supportCase').insert({
              title: desc,
              case_description: desc,
              customer_id: customerId,
              priority: 'Low',
              status: 'Open',
              channel: 'Chat',
              assigned_team: 'General',
              created_at: new Date().toISOString(),
              resolution_date: new Date().toISOString(),
              satisfaction_rating: 0
          }).select().single();

          if (tErr || !ticket) {
              console.error("Ticket creation failed:", JSON.stringify(tErr, null, 2));
              throw new Error(`Failed to create ticket record: ${tErr?.message || 'Unknown error'}`);
          }

          // 3. Update existing chat session with ticket reference (messages are already saved)
          if (existingSessionId) {
              await supabase.from('chat_sessions').update({
                  customer_id: customerId,
                  status: 'Open', // Keep open for potential agent takeover
                  metadata: { ticketId: ticket.id }
              }).eq('id', existingSessionId);
          }

          const successText = 'Success! Your ticket has been created:';
          setMessages(prev => [...prev, { 
              id: uuidv4(), 
              sender: 'bot', 
              text: successText,
              ticketId: ticket.id
          }]);
          if (existingSessionId) saveMessageToDb(existingSessionId, 'bot', successText);
          
          // Allow continued conversation
          setTimeout(() => {
              setMessages(prev => [...prev, { 
                  id: uuidv4(), 
                  sender: 'bot', 
                  text: `Is there anything else I can help you with?`
              }]);
              setStep(3); // New step: post-ticket conversation
              setFormData({ description: "", email: "" });
          }, 1500);
      } catch (e: unknown) {
          console.error(e);
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          setMessages(prev => [...prev, { id: uuidv4(), sender: 'bot', text: `Sorry, something went wrong: ${errMsg}.` }]);
          setStep(1); 
      } finally {
          setLoading(false);
      }
  };

  const checkStatus = async () => {
      setStatusLoading(true);
      setStatusError("");
      setTicketResult(null);
      setTicketChatSession(null);
      
      if (!supabase) {
        setStatusError("System offline");
        setStatusLoading(false);
        return;
      }

      try {
        const { data: ticket, error } = await supabase
            .from('supportCase')
            .select('*')
            .eq('id', ticketIdQuery.trim())
            .single();
        
        if (error) throw error;
        setTicketResult(ticket);

        // Fetch associated chat history
        // Find session with metadata->ticketId = ticket.id
        // Valid PostgreSQL JSONB query: metadata @> '{"ticketId": "..."}'
        const { data: sessions } = await supabase
            .from('chat_sessions')
            .select('id')
            .contains('metadata', { ticketId: ticket.id })
            .limit(1);
        
        if (sessions && sessions.length > 0) {
             const sessId = sessions[0].id;
             const { data: msgs } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessId)
                .order('created_at', { ascending: true });
             
             if (msgs) {
                 const formatted: Message[] = msgs.map(m => ({
                     id: m.id,
                     sender: m.sender_type === 'bot' ? 'bot' : 'user', // Basic mapping
                     text: m.content
                 }));
                 setTicketChatSession(formatted);
             }
        }

      } catch (e) {
          console.error(e);
          setStatusError("Ticket not found. Please check the ID and try again.");
      } finally {
          setStatusLoading(false);
      }
  };

  const loadChatHistory = () => {
      if (ticketChatSession) {
          setMessages(ticketChatSession);
          // Also allow user to continue chatting? 
          // For now, just view.
          setIsChatMaximized(true);
          setViewMode('home'); // Close status
      }
  };

  // Shared Chat Component Render Function
  const renderChatContent = (isModal: boolean) => (
      <>
         {/* Messages Area */}
         <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-white scrollbar-thin ${isModal ? 'min-h-0' : ''}`}>
            {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border ${m.sender === 'user' ? 'bg-gray-100 border-gray-200' : 'bg-[var(--sb-green)] text-white border-transparent'}`}>
                            {m.sender === 'user' ? <User size={12} className="text-gray-500" /> : <Bot size={12} />}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            m.sender === 'user' 
                            ? 'bg-[var(--sb-green)] text-white rounded-br-none' 
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}>
                            {m.text}
                            {m.ticketId && (
                                <div className="mt-2">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(m.ticketId!);
                                            // Visual feedback could be added here
                                        }}
                                        className="inline-flex items-center gap-1.5 bg-[var(--sb-green)] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:brightness-110 transition cursor-pointer"
                                        title="Click to copy"
                                    >
                                        🎫 {m.ticketId}
                                    </button>
                                    <p className="text-[10px] text-gray-500 mt-1">Click to copy ticket ID</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start animate-in fade-in">
                   <div className="flex items-end gap-2">
                       <div className="w-6 h-6 rounded-full bg-[var(--sb-green)] text-white flex items-center justify-center">
                           <Bot size={12} />
                       </div>
                       <div className="px-4 py-2 rounded-2xl bg-gray-50 text-gray-500 rounded-bl-none flex items-center gap-2">
                           <Loader2 size={14} className="animate-spin" />
                           <span className="text-xs">Typing...</span>
                       </div>
                   </div>
                </div>
            )}
            <div ref={isModal ? bottomRefModal : bottomRefInline} />
         </div>

         {/* Input Area */}
         <div className="p-4 bg-white border-t">
            <div className="relative">
                <input 
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--sb-green)] focus:border-transparent text-sm" 
                    placeholder={step === 2 ? "Creating your ticket..." : "Type your message..."}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <button 
                     className="absolute right-1 top-1 p-2 bg-[var(--sb-green)] text-white rounded-full hover:brightness-110 disabled:opacity-50 transition-all" 
                     onClick={handleSend}
                     disabled={loading || !input.trim()}
                >
                     <Send size={14} />
                </button>
            </div>
            {step === 3 && !loading && (
                <button 
                   onClick={() => {
                        setStep(0);
                        setMessages([{ id: uuidv4(), sender: 'bot', text: 'Welcome back! How can I help you create another ticket?' }]);
                        setFormData({ description: "", email: "" });
                   }}
                   className="mt-3 w-full text-center text-xs font-bold text-[var(--sb-green)] uppercase tracking-wide hover:underline"
                >
                    Start New Ticket
                </button>
            )}
         </div>
      </>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b fixed top-0 left-0 right-0 z-40 shadow-sm w-full">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/support" className="relative w-12 h-12 flex-shrink-0">
                   <Image src="/starbucks_logo.svg" alt="Starbucks" fill className="object-contain" />
                </Link>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <span className="font-bold text-lg tracking-tight text-gray-900">Support Center</span>
            </div>
            
            <div className="flex items-center gap-4">
                 <button 
                    onClick={() => setViewMode('status')}
                    className="text-sm font-semibold text-gray-600 hover:text-[var(--sb-green)] transition"
                 >
                    Check Ticket Status
                 </button>
                 <Link href="/login" className="hidden md:flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-xs font-bold hover:bg-gray-50 transition">
                    Agent Login <ArrowRight size={14} />
                 </Link>
            </div>
        </div>
      </header>

      {/* --- MAIN HERO (Text Left, Chat Right) --- */}
      <main className="flex-1 bg-[var(--sb-dark)] text-white relative pt-20">
         <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--sb-green)] rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
         </div>

         <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            
            {/* LEFT: Text & Buttons */}
            <div className="flex-1 space-y-8 md:pr-10">
                 <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
                    Uniquely<br/>
                    <span className="text-[var(--sb-green)]">Yours</span>
                 </h1>
                 <p className="text-lg md:text-xl font-light text-gray-300 max-w-lg leading-relaxed">
                    We're here to help make every moment of your Starbucks experience perfect. Use the chat on the right or browse our resources.
                 </p>
                 
                 <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button 
                        onClick={() => setViewMode('faq')}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-6 py-4 rounded-lg flex items-center gap-3 transition"
                    >
                        <Search className="text-[var(--sb-green)]" />
                        <div className="text-left">
                            <h3 className="font-bold text-sm">Browse FAQs</h3>
                            <p className="text-xs text-gray-400">Find answers quickly</p>
                        </div>
                    </button>
                    {/* Add more buttons if needed */}
                 </div>
                 
                 <div className="flex items-center gap-2 text-sm text-gray-400 font-medium pt-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Support Agents Online • Wait Time: &lt; 2m
                 </div>
            </div>

            {/* RIGHT: Chat Interface (Inline) */}
            <div className="w-full md:w-[450px] bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[600px] border border-white/10 relative transition-transform">
                 {/* Chat Header */}
                 <div className="bg-gray-50 p-4 border-b flex items-center justify-between cursor-pointer" onClick={() => setIsChatMaximized(true)} title="Maximize Chat">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[var(--sb-green)] flex items-center justify-center text-white">
                             <Bot size={18} />
                         </div>
                         <div>
                             <h3 className="font-bold text-sm">Starbucks Assistant</h3>
                             <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Fast Response</p>
                         </div>
                     </div>
                     <button className="text-gray-400 hover:text-[var(--sb-green)] transition">
                         <Maximize2 size={18} />
                     </button>
                 </div>
                 
                 {/* Render Shared Content */}
                 {renderChatContent(false)}
            </div>
         </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-50 border-t py-12">
           <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="opacity-50 filter grayscale hover:grayscale-0 transition duration-500">
                    <Image src="/starbucks_logo.svg" alt="Starbucks" width={40} height={40} />
                </div>
                <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 font-medium">
                    <Link href="#" className="hover:text-[var(--sb-green)]">Contact Us</Link>
                    <Link href="#" className="hover:text-[var(--sb-green)]">SLA Policy</Link>
                    <Link href="#" className="hover:text-[var(--sb-green)]">Submit Feedback</Link>
                    <Link href="#" className="hover:text-[var(--sb-green)]">Privacy Policy</Link>
                </div>
                <p className="text-xs text-gray-400">© 2025 Starbucks Coffee Company. All rights reserved.</p>
           </div>
      </footer>

      {/* --- MODALS --- */}

      {/* CHAT MAXIMIZED MODAL */}
      {isChatMaximized && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsChatMaximized(false)}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                 {/* Header */}
                 <div className="bg-[var(--sb-green)] p-4 flex items-center justify-between text-white">
                     <div className="flex items-center gap-3">
                         <div className="bg-white/20 p-2 rounded-full"><Bot size={24} /></div>
                         <div>
                             <h3 className="font-bold text-lg">Starbucks Assistant</h3>
                             <p className="text-sm text-green-100">Live Support</p>
                         </div>
                     </div>
                     <button onClick={() => setIsChatMaximized(false)} className="hover:bg-white/20 p-2 rounded-full transition text-white">
                         <Minimize2 size={24} />
                     </button>
                 </div>

                 {/* Body */}
                 {renderChatContent(true)}
            </div>
        </div>
      )}

      {/* FAQ MODAL */}
      {viewMode === 'faq' && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setViewMode('home')}
          >
             <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-6 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
             >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
                    <button onClick={() => setViewMode('home')} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>
                <div className="overflow-y-auto space-y-4 pr-2">
                    <FaqItem q="How do I check my rewards balance?" a="You can check your balance in the Starbucks App or by logging into your account on our website." />
                    <FaqItem q="Can I change my order after placing it?" a="Orders cannot be modified once placed. Please contact the store directly." />
                    <FaqItem q=" What are your support hours?" a="Our support team is available 24/7 via chat and email." />
                    <FaqItem q="How do I recover my password?" a="Click 'Forgot Password' on the login page to receive a reset link." />
                </div>
                <div className="mt-6 pt-6 border-t flex justify-center">
                    <button onClick={() => { setViewMode('home'); setIsChatMaximized(true); }} className="text-[var(--sb-green)] font-bold flex items-center gap-2 hover:underline">
                        Still need help? Maximize Chat <ArrowRight size={16} />
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* STATUS MODAL */}
      {viewMode === 'status' && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={() => setViewMode('home')}
          >
              <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Check Ticket Status</h2>
                    <button onClick={() => setViewMode('home')} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>
                
                {!ticketResult ? (
                    <div className="space-y-4">
                        <p className="text-gray-600">Enter your Ticket ID to see the latest updates.</p>
                        <input 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[var(--sb-green)] outline-none"
                            placeholder="e.g. 123e4567-e89b..."
                            value={ticketIdQuery}
                            onChange={(e) => setTicketIdQuery(e.target.value)}
                        />
                        {statusError && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={14}/> {statusError}</p>}
                        <button 
                            onClick={checkStatus}
                            disabled={statusLoading || !ticketIdQuery}
                            className="w-full bg-[var(--sb-green)] text-white font-bold py-3 rounded-lg hover:brightness-110 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {statusLoading ? <Loader2 size={18} className="animate-spin" /> : "Track Ticket"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-bold text-gray-500 uppercase">Ticket ID: {ticketResult.id.slice(0,8)}...</span>
                                 <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${ticketResult.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                     {ticketResult.status}
                                 </span>
                             </div>
                             <h3 className="font-bold text-lg text-gray-900 mb-1">{ticketResult.title}</h3>
                             <p className="text-sm text-gray-600">{ticketResult.case_description}</p>
                        </div>
                        
                        {/* Mock Timeline - In real app, fetch audit logs */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm text-gray-900">Latest Updates</h4>
                            <div className="flex gap-3">
                                <div className="mt-1"><CheckCircle size={16} className="text-[var(--sb-green)]" /></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                                    <p className="text-xs text-gray-500">{new Date(ticketResult.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 opacity-50">
                                <div className="mt-1"><Clock size={16} className="text-gray-400" /></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Agent Assigned</p>
                                    <p className="text-xs text-gray-500">Pending...</p>
                                </div>
                            </div>
                        </div>

                        {ticketChatSession && (
                            <button 
                                onClick={loadChatHistory}
                                className="w-full bg-[var(--sb-green)] text-white font-bold py-3 rounded-lg hover:brightness-110 shadow-lg flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={18} /> View Conversation
                            </button>
                        )}

                        <button onClick={() => setTicketResult(null)} className="w-full border border-gray-200 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-50">
                            Check Another
                        </button>
                    </div>
                )}
              </div>
          </div>
      )}

    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border rounded-lg overflow-hidden">
            <button 
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition"
            >
                <span className="font-medium text-gray-900">{q}</span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open && (
                <div className="p-4 bg-white border-t text-gray-600 text-sm">
                    {a}
                </div>
            )}
        </div>
    )
}
