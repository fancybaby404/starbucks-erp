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
    
    // Fetch cases (support_cases)
    // We join customers -> _users to get customer name if possible, 
    // but for now let's just fetch the cases.
    const { data: cases, error } = await client
      .from('support_cases')
      .select(`*`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    // Map DB to App types
    // Map DB to App types
    const DB_STATUS_MAP: Record<string, TicketStatus> = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'resolved': 'Closed', // Merged Resolved into Closed
        'closed': 'Closed',
        'waiting': 'Open', 
        'ended': 'Closed'
    };
    const DB_PRIORITY_MAP: Record<string, any> = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'urgent': 'High' 
    };

    const mapped: Ticket[] = (cases || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      customerId: c.customer_id,
      assignee: c.assigned_to,
      status: DB_STATUS_MAP[(c.status || 'open').toLowerCase()] || 'Open',
      priority: DB_PRIORITY_MAP[(c.priority || 'medium').toLowerCase()] || 'Medium',
      createdAt: c.created_at,
      notes: []
    }));
    
    setTickets(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();

    const client = supabase;
    if (!client) return;

    const sub = client
      .channel('public:support_cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_cases' }, () => {
          fetchTickets();
      })
      .subscribe();

    return () => {
      client.removeChannel(sub);
    };
  }, [fetchTickets]);
  
  const addTicket = async (ticket: Omit<Ticket, "id" | "createdAt" | "notes" | "status">) => {
    const client = supabase;
    if (!client) return null; 
    
    // Map App to DB
    const APP_PRIORITY_MAP: Record<string, string> = {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high'
    };

    const { data, error } = await client
      .from('support_cases')
      .insert({
        title: ticket.title,
        customer_id: ticket.customerId,
        priority: APP_PRIORITY_MAP[ticket.priority] || 'medium',
        status: 'open',
        case_number: `CASE-${Date.now()}`, 
        description: ticket.title, 
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
      status: DB_STATUS_MAP[data.status] || 'Open',
      priority: DB_PRIORITY_MAP[data.priority] || 'Medium',
      createdAt: data.created_at,
      notes: [],
    };
    
    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const updateTicket = async (id: string, changes: Partial<Ticket>) => {
    const client = supabase;
    if (!client) return;
    
    const APP_STATUS_MAP: Record<string, string> = {
        'Open': 'open',
        'In Progress': 'in_progress',
        'Resolved': 'resolved',
        'Closed': 'resolved'
    };

    const updates: Partial<DbSupportCase> = {};
    if (changes.status) updates.status = APP_STATUS_MAP[changes.status] || 'open';
    if (changes.assignee) updates.assigned_to = changes.assignee;

    const { error } = await client.from('support_cases').update(updates).eq('id', id);
    
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

  const deleteTicket = async (id: string) => {
      const client = supabase;
      if (!client) return;
      
      const { error } = await client.from('support_cases').delete().eq('id', id);
      
      if (!error) {
          setTickets((prev) => prev.filter(t => t.id !== id));
      }
  };

  /* eslint-enable @typescript-eslint/no-unused-vars */
  return { tickets, loading, addTicket, updateTicket, addNote, deleteTicket };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
       // Join customers with _users
       const { data, error } = await client
         .from('customers')
         .select(`
            id,
            user_id,
            _users (
              first_name,
              last_name,
              email
            )
         `);
         
       if (data) {
        setCustomers(data.map((c: any) => {
          const u = c._users; // Joined data
          const name = u ? `${u.first_name} ${u.last_name}`.trim() : 'Unknown';
          const email = u?.email || '';
          return {
            id: c.id,
            name,
            email,
          };
        }));
       }
    };
    load();
  }, []);

  const addCustomer = async (name: string, email: string) => {
    // Check if customer exists first? No, simple append.
    const client = supabase;
    if (!client) throw new Error("Supabase not initialized");

    // For adding a customer, we now need to create a User first? 
    // Or just fail if not exists?
    // For this demo, let's just insert into customers and assume user creation is separate
    // OR we can create a dummy user. 
    // Let's just Insert into _users then customers?
    const { data: userData, error: userError } = await client.from('_users').insert({
        email,
        password: 'password', // Default
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || 'User',
        role: 'CUSTOMER'
    }).select().single();

    if (userError) throw userError;

    const { data, error } = await client
      .from('customers')
      .insert({ 
          user_id: userData.id
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
           resolutionMins: r.resolution_mins,
           conditionField: r.condition_field,
           conditionValue: r.condition_value
        })));
      }
    };
    load();
  }, []);

  /* eslint-disable @typescript-eslint/naming-convention */
  const addRule = async (name: string, responseMins: number, resolutionMins: number, conditionField?: string, conditionValue?: string) => {
    const client = supabase;
    if (!client) return;
    
    const insertData: any = { 
        name, 
        response_mins: responseMins, 
        resolution_mins: resolutionMins 
    };
    if (conditionField) insertData.condition_field = conditionField;
    if (conditionValue) insertData.condition_value = conditionValue;

    const { data } = await client
      .from('sla_rules')
      .insert(insertData)
      .select().single();
      
    if (data) {
       setRules(prev => [...prev, { 
           id: data.id, 
           name: data.name, 
           responseMins: data.response_mins, 
           resolutionMins: data.resolution_mins,
           conditionField: data.condition_field,
           conditionValue: data.condition_value 
        }]);
    }
  };
    return { rules, addRule };
}

export interface ChatSession {
  id: string;
  customer_id: string;
  agent_id: string | null;
  status: 'active' | 'waiting' | 'closed' | 'Active' | 'Waiting' | 'Closed' | 'Open' | 'In Progress'; // Loose typing for now to match DB
  last_message: string;
  last_message_at: string;
  last_message_sender: 'customer' | 'agent' | 'system' | 'bot'; // Added bot for clarity
  unseen_count: number;
  created_at: string; // Added to fix lint
  started_at: string; // Ensure this is also present if used
  metadata?: any;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  lastSeen?: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
       // Schema check: full_name might not exist. Use first/last.
       // Also trying to fetch last_seen. If it fails (col missing), we fallback.
       // Filter: role != CUSTOMER AND is_deleted != true
       
       let selectQuery = 'id, email, first_name, last_name, role, is_deleted';
       // Ideally we check if last_seen exists first or just try? 
       // For now, let's just fetch standard fields to be safe, creating a separate "status" fetch or assuming active.
       // User asked to "only put employees that are active."
       
       const { data, error } = await client
         .from('_users')
         .select(selectQuery)
         .neq('role', 'CUSTOMER');
         // .eq('is_deleted', false) // Note: is_deleted might be null or false.
         // checking null is hard in chain sometimes. .or('is_deleted.is.null,is_deleted.eq.false')
       
       if (error) {
           console.error("Error loading agents:", error);
           return;
       }

       if (data) {
         // Filter locally for is_deleted to handle nulls safely
         const validAgents = data.filter((u: any) => u.is_deleted !== true);
         
         // Fetch last_seen separately to avoid crashing main list if col missing? 
         // Or just tell user to run script.
         // Let's try to fetch last_seen for these IDs.
         const { data: presenceData } = await client.from('_users').select('id, last_seen').in('id', validAgents.map((a:any) => a.id));
         const presenceMap = new Map(presenceData?.map((p:any) => [p.id, p.last_seen]));

         setAgents(validAgents.map((u: any) => ({
            id: u.id,
            name: (u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : (u.first_name || u.last_name || u.email.split('@')[0]), 
            email: u.email,
            role: u.role,
            lastSeen: presenceMap.get(u.id) || null
         })));
       }
    };
    load();
  }, []);

  const addEmployee = async (email: string, name: string, password: string, role: string = 'EMPLOYEE') => {
      const client = supabase;
      if (!client) return;
      
      // We pass full_name to RPC, but if RPC expects individual fields we might need to change it.
      // Assuming RPC handles split or we update RPC later. For now, pass name.
      const { data, error } = await client.rpc('create_employee', {
          email,
          password,
          full_name: name,
          role
      });

      if (error) throw error;
      
      if (data) {
          setAgents(prev => [...prev, { id: data, email, name, role }]);
      }
      return data;
  };

  const deleteEmployee = async (id: string) => {
      const client = supabase;
      if (!client) return;
      
      const { error } = await client.rpc('delete_employee', { user_id: id });
       
      if (!error) {
          setAgents((prev) => prev.filter(a => a.id !== id));
      } else {
          console.error("Failed to delete employee", error);
          throw error;
      }
  };

  return { agents, addEmployee, deleteEmployee };
}

export function useDashboardStats() {
  const [stats, setStats] = useState({
    openTickets: 0,
    avgResponse: "0h",
    slaBreaches: 0,
    onlineAgents: 0,
    urgentTickets: [] as Ticket[],
    ticketVolume: Array(24).fill(0),
    loading: true
  });

  const fetchStats = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    
    try {
        const now = new Date();
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        
        // 1. Online Agents (Active in last 5 mins)
        let onlineCount = 0;
        try {
            const { count } = await client
            .from('_users')
            .select('*', { count: 'exact', head: true })
            .gt('last_seen', fiveMinsAgo);
            onlineCount = count || 0;
        } catch (err) {
            // Ignore error if last_seen column is missing
        }

        // 2. Open Tickets & Urgent
        const { data: tickets } = await client
          .from('support_cases')
          .select('*')
          .neq('status', 'closed');
          
        const allTickets = tickets || [];
        const open = allTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
        
        // Urgent with manual mapping to avoid type errors
        const urgent = allTickets
            .filter(t => t.priority === 'urgent' || t.priority === 'high')
            .slice(0, 5)
            .map(c => ({
              id: c.id,
              title: c.title,
              customerId: c.customer_id,
              assignee: c.assigned_to,
              status: (c.status === 'in_progress' ? 'In Progress' : 
                       c.status === 'resolved' ? 'Resolved' : 
                       c.status === 'closed' ? 'Closed' : 'Open') as TicketStatus,
              priority: (c.priority === 'urgent' || c.priority === 'high' ? 'High' : 
                         c.priority === 'low' ? 'Low' : 'Medium') as any,
              createdAt: c.created_at,
              notes: []
            }));

        // 3. SLA Breaches (Simple: Open > 24h)
        const breaches = open.filter(t => {
            const created = new Date(t.created_at);
            const slaDeadline = new Date(created.getTime() + 24 * 60 * 60 * 1000); 
            return now > slaDeadline;
        });

        // 4. Volume (Last 24h)
        const volume = Array(24).fill(0);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        allTickets.forEach(t => {
            const d = new Date(t.created_at);
            if (d >= oneDayAgo) {
                const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
                if (diffHours >= 0 && diffHours < 24) {
                     volume[23 - diffHours]++;
                }
            }
        });

        setStats({
          openTickets: open.length,
          avgResponse: "1h 42m", // Placeholder
          slaBreaches: breaches.length,
          onlineAgents: onlineCount || 0,
          urgentTickets: urgent,
          ticketVolume: volume,
          loading: false
        });
    } catch (e) {
        console.error("Error fetching stats:", e);
        setStats(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${activeSessionId}` }, (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
          });
      })
      .subscribe();
      
    return () => { sub.unsubscribe(); };
  }, [activeSessionId]);

  const sendMessage = async (content: string, senderType: 'customer' | 'agent' | 'system') => {
      const client = supabase;
      if (!client || !activeSessionId) return;

      // Optimistic Update
      const tempId = crypto.randomUUID();
      const newMessage: ChatMessage = {
          id: tempId,
          session_id: activeSessionId,
          sender_type: senderType,
          content,
          created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);

      const { error } = await client.from('chat_messages').insert({
          id: tempId,
          session_id: activeSessionId,
          sender_type: senderType,
          content
      });

      if (error) console.error("Error sending message:", error);

      // Update session last message
      await client.from('chat_sessions').update({
          last_message: content,
          last_message_at: new Date().toISOString(),
          last_message_sender: senderType,
          status: senderType === 'agent' ? 'Active' : 'Waiting' // Auto-update status based on reply
      }).eq('id', activeSessionId);

      // AUTOMATION: If agent replies, set Ticket to 'In Progress'
      if (senderType === 'agent') {
          // 1. Get Session Metadata to find Ticket ID
          const { data: sessionData } = await client.from('chat_sessions').select('metadata, customer_id').eq('id', activeSessionId).single();
          
          let ticketId = sessionData?.metadata?.ticketId;
          
          // 2. If no direct link, try to find latest open ticket for customer
          if (!ticketId && sessionData?.customer_id) {
               const { data: tickets } = await client.from('support_cases')
                 .select('id')
                 .eq('customer_id', sessionData.customer_id)
                 .neq('status', 'closed')
                 .neq('status', 'resolved')
                 .order('created_at', { ascending: false })
                 .limit(1);
               if (tickets && tickets.length > 0) ticketId = tickets[0].id;
          }

          // 3. Update Ticket
          if (ticketId) {
               await client.from('support_cases').update({
                   status: 'in_progress',
                   // assignee: currentUser?.email // Optional: assign to replier?
               }).eq('id', ticketId);
          }
      }
  };

  const endSession = async () => {
      const client = supabase;
      if (!client || !activeSessionId) return;

      // 1. Send System Message
      await sendMessage("Agent has ended the chat.", "system");

      // 2. Update Session Status
      await client.from('chat_sessions').update({
          status: 'Closed',
          ended_at: new Date().toISOString()
      }).eq('id', activeSessionId);

      // 3. Resolve Linked Ticket
      const { data: sessionData } = await client.from('chat_sessions').select('metadata, customer_id').eq('id', activeSessionId).single();
      let ticketId = sessionData?.metadata?.ticketId;
      
      if (!ticketId && sessionData?.customer_id) {
            const { data: tickets } = await client.from('support_cases')
                .select('id')
                .eq('customer_id', sessionData.customer_id)
                .neq('status', 'closed')
                .neq('status', 'resolved')
                .order('created_at', { ascending: false })
                .limit(1);
            if (tickets && tickets.length > 0) ticketId = tickets[0].id;
      }

      if (ticketId) {
            await client.from('support_cases').update({
                status: 'resolved',
                resolution_date: new Date().toISOString()
            }).eq('id', ticketId);
      }
  };

  const deleteSession = async (sessionId: string) => {
      const client = supabase;
      if (!client) return;

      // Optimistic update
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) setActiveSessionId(null);

      const { error } = await client.from('chat_sessions').delete().eq('id', sessionId);
      if (error) {
          console.error("Error deleting session:", error);
      }
  };

  return { sessions, activeSessionId, setActiveSessionId, messages, sendMessage, endSession, deleteSession };
}
