/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { Ticket, Customer, Rule, DbSupportCase, DbCustomer, DbCaseNote, DbSlaRule, DbArticle, DbChatSession, ChatMessage } from "./types";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// Helper to fallback to existing logic if Supabase is not ready
// But for this task we assume we are migrating fully.
// NOTE: "supportCase" is the table name.

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    
    // Fetch cases with notes
    const { data: cases, error } = await client
      .from('supportCase')
      .select(`*, case_notes(*)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    // Map DB to App types
    const mapped: Ticket[] = (cases || []).map((c: any) => ({
      id: c.id,
      title: c.title || c.case_description || 'Untitled',
      customerId: c.customer_id,
      assignee: c.assignee,
      status: (c.status as any) || "Open",
      priority: (c.priority as any) || "Medium",
      createdAt: c.created_at,
      notes: (c.case_notes || []).map((n: any) => ({
        id: n.id,
        text: n.text,
      })).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
    }));
    
    setTickets(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
  
  const addTicket = async (ticket: Omit<Ticket, "id" | "createdAt" | "notes" | "status">) => {
    const client = supabase;
    if (!client) return null; // Should handle error better
    
    const { data, error } = await client
      .from('supportCase')
      .insert({
        title: ticket.title,
        customer_id: ticket.customerId,
        priority: ticket.priority,
        status: 'Open',
        case_id: uuidv4(), // Schema requires case_id? UUID.
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding ticket', error);
      return null;
    }

    const newTicket: Ticket = {
      id: data.id,
      title: data.title,
      customerId: data.customer_id,
      status: data.status as any,
      priority: data.priority as any,
      createdAt: data.created_at,
      notes: [],
    };
    
    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const updateTicket = async (id: string, changes: Partial<Ticket>) => {
    const client = supabase;
    if (!client) return;
    
    const updates: Partial<DbSupportCase> = {};
    if (changes.status) updates.status = changes.status;
    if (changes.assignee) updates.assignee = changes.assignee;
    // ... map other fields if needed

    const { error } = await client.from('supportCase').update(updates).eq('id', id);
    
    if (!error) {
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    }
  };

  const addNote = async (ticketId: string, text: string, internal: boolean = true) => {
    const client = supabase;
    if (!client) return;
    
    const { data, error } = await client
      .from('case_notes')
      .insert({
        case_id: ticketId,
        text,
        internal,
        at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error && data) {
       const newNote = { id: data.id, text: data.text, at: data.at, internal: data.internal };
       setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, notes: [newNote, ...t.notes] }
            : t
        )
      );
    }
  };

  /* eslint-enable @typescript-eslint/no-unused-vars */
  return { tickets, loading, addTicket, updateTicket, addNote };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
       const { data } = await client.from('customer').select('*');
       if (data) {
        setCustomers(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email || c.contact_info || '',
        })));
       }
    };
    load();
  }, []);

  const addCustomer = async (name: string, email: string) => {
    // Check if customer exists first? No, simple append.
    const client = supabase;
    if (!client) throw new Error("Supabase not initialized");

    const { data, error } = await client
      .from('customer')
      .insert({ 
          name, 
          email, 
          contact_info: email, 
          customer_id: uuidv4() 
      })
      .select()
      .single();
      
    if (data) {
      const newC = { id: data.id, name: data.name, email: data.email || '' };
      setCustomers(prev => [newC, ...prev]);
      return newC;
    }
    throw error;
  };

  return { customers, loading, addCustomer };
}

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
      const { data } = await client.from('sla_rules').select('*');
      if (data) {
        setRules(data.map((r: any) => ({
           id: r.id,
           name: r.name,
           responseMins: r.response_mins,
           resolutionMins: r.resolution_mins
        })));
      }
    };
    load();
  }, []);

  const addRule = async (name: string, responseMins: number, resolutionMins: number) => {
    const client = supabase;
    if (!client) return;
    const { data } = await client
      .from('sla_rules')
      .insert({ name, response_mins: responseMins, resolution_mins: resolutionMins })
      .select().single();
      
    if (data) {
       setRules(prev => [...prev, { id: data.id, name: data.name, responseMins: data.response_mins, resolutionMins: data.resolution_mins }]);
    }
  };

  return { rules, addRule };
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
       const { data } = await client
         .from('_users')
         .select('id, email, full_name, role')
         .eq('role', 'EMPLOYEE');
       
       if (data) {
         setAgents(data.map((u: any) => ({
            id: u.id,
            name: u.full_name || u.email.split('@')[0], 
            email: u.email,
            role: u.role
         })));
       }
    };
    load();
  }, []);

  return { agents };
}

export function useDashboardStats() {
  const [stats, setStats] = useState({
    openTickets: 0,
    avgResponse: "0m",
    slaBreaches: 0,
    onlineAgents: "0",
    urgentTickets: [] as Ticket[],
    ticketVolume: [] as number[],
    loading: true
  });

  const fetchStats = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    
    // Open Tickets
    const { count: openCount } = await client
      .from('supportCase')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Open');
      
    // SLA Breaches
    const { count: breachCount } = await client
      .from('supportCase')
      .select('*', { count: 'exact', head: true })
      .eq('sla_breached', true);

    // Urgent Tickets
    const { data: urgent } = await client
      .from('supportCase')
      .select('*')
      .or('priority.eq.High,sla_breached.eq.true')
      .eq('status', 'Open')
      .limit(5);

    // Avg Response Time (Logic: Avg time of closed tickets resolution)
    // Fetch last 50 resolved tickets
    const { data: resolved } = await client
        .from('supportCase')
        .select('created_at, resolution_date') // Assuming resolution_date was in original schema
        .not('resolution_date', 'is', null)
        .limit(50);
    
    let avgTimeStr = "N/A";
    if (resolved && resolved.length > 0) {
        let totalMs = 0;
        resolved.forEach((r: any) => {
            const start = new Date(r.created_at).getTime();
            const end = new Date(r.resolution_date).getTime();
            if (end > start) totalMs += (end - start);
        });
        const avgMs = totalMs / resolved.length;
        const mins = Math.floor(avgMs / 60000);
        const hours = Math.floor(mins / 60);
        avgTimeStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
    }

    // Online Agents (Active in Chat or recently assigned)
    // Count distinct agents with 'Active' chat sessions
    const { data: activeSessions } = await client
        .from('chat_sessions')
        .select('agent_id')
        .eq('status', 'Active');
    
    const uniqueAgents = new Set(activeSessions?.map((s: any) => s.agent_id).filter(Boolean));
    const onlineStr = `${uniqueAgents.size} Active`;

    // Ticket Volume (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTickets } = await client
        .from('supportCase')
        .select('created_at')
        .gte('created_at', oneDayAgo);
    
    // Group by hour
    const volume = new Array(24).fill(0);
    if (recentTickets) {
        recentTickets.forEach((t: any) => {
            const date = new Date(t.created_at);
            const hourDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
            if (hourDiff >= 0 && hourDiff < 24) {
                // 0 is current hour, 23 is 24h ago. 
                // We want to display current hour at end of graph usually, or just last 24h buckets.
                // Let's store them as "hours ago" count: index 0 = now, 1 = 1h ago...
                // But for the graph, usually generic buckets are fine.
                // Let's reverse it so index 23 is "now" and 0 is "24h ago" for left-to-right graph
                volume[23 - hourDiff]++;
            }
        });
    }

    // Map urgent tickets
    const urgentMapped = (urgent || []).map((t: any) => ({
      id: t.id,
      title: t.title || t.case_description || 'Untitled',
      priority: t.priority,
      status: t.status,
      customerId: t.customer_id,
      createdAt: t.created_at,
      notes: [] 
    })) as Ticket[];

    setStats(prev => ({
      ...prev,
      openTickets: openCount || 0,
      slaBreaches: breachCount || 0,
      urgentTickets: urgentMapped,
      avgResponse: avgTimeStr,
      onlineAgents: onlineStr,
      onlineAgents: onlineStr,
      ticketVolume: volume,
      loading: false
    }));
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchStats]);

  return stats;
}

export function useArticles() {
  const [articles, setArticles] = useState<DbArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const { data } = await client.from('articles').select('*').order('title');
    if (data) setArticles(data as DbArticle[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, refresh: fetchArticles };
}

import { auth } from "@/lib/auth";

export function useChat() {
  const [sessions, setSessions] = useState<DbChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(auth.getSession());
  }, []);

  // Fetch sessions
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const fetch = async () => {
      const { data } = await client.from('chat_sessions')
        .select('*')
        // We sort by last_message_at desc, but we'll do refined sorting client-side
        .order('last_message_at', { ascending: false, nullsFirst: false }) 
        .order('started_at', { ascending: false });
        
      if (data) {
        let sorted = data as DbChatSession[];
        // Sort: Assigned to Me (top) > Unreplied (customer last msg) > Others
        if (currentUser) {
            sorted = sorted.sort((a, b) => {
                const aIsMine = a.agent_id === currentUser.id;
                const bIsMine = b.agent_id === currentUser.id;
                if (aIsMine && !bIsMine) return -1;
                if (!aIsMine && bIsMine) return 1;
                
                // Then by Unreplied (last_message_sender === 'customer')
                const aUnreplied = a.last_message_sender === 'customer';
                const bUnreplied = b.last_message_sender === 'customer';
                if (aUnreplied && !bUnreplied) return -1;
                if (!aUnreplied && bUnreplied) return 1;
                
                // Default is via DB order (time)
                return 0;
            });
        }
        setSessions(sorted);
      }
    };
    fetch();
    const sub = client.channel('public:chat_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, fetch)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [currentUser]);

  // Fetch messages for active session
  useEffect(() => {
    const client = supabase;
    if (!client || !activeSessionId) return;
    const fetch = async () => {
      const { data } = await client.from('chat_messages').select('*').eq('session_id', activeSessionId).order('created_at');
      if (data) setMessages(data as ChatMessage[]);
    };
    fetch();
    const sub = client.channel(`public:chat_messages:${activeSessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${activeSessionId}` }, (payload) => {
         const newMsg = payload.new as ChatMessage;
         setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
         });
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [activeSessionId]);

  const sendMessage = async (content: string, sender: 'agent' | 'system' = 'agent') => {
    const client = supabase;
    if (!client || !activeSessionId) return;
    
    // Optimistic update
    const tempId = uuidv4();
    const newMessage: ChatMessage = {
        id: tempId,
        session_id: activeSessionId,
        sender_type: sender,
        content,
        created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);

    await client.from('chat_messages').insert({
      id: tempId,
      session_id: activeSessionId,
      sender_type: sender,
      content,
      created_at: newMessage.created_at
    });

    // Update Session Last Message
    await client.from('chat_sessions').update({
        last_message: content,
        last_message_at: newMessage.created_at,
        last_message_sender: sender
    }).eq('id', activeSessionId);
  };

  return { sessions, activeSessionId, setActiveSessionId, messages, sendMessage };
}
