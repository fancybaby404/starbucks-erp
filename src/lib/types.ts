export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Medium" | "High";

// Application Types (CamelCase)
export interface Note {
  id: string;
  text: string;
  at: string;
  internal?: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  customerId: string;
  assignee?: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  notes: Note[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Rule {
  id: string;
  name: string;
  responseMins: number;
  resolutionMins: number;
  conditionField?: string;
  conditionValue?: string;
}

// Database Types (SnakeCase) - Mapped to Supabase tables
export interface DbSupportCase {
  id: string;
  created_at: string;
  case_number: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  customer_id: string;
  assigned_to?: string;
  resolution_time?: number;
  sla_deadline?: string;
}

export interface DbCustomer {
  id: string;
  created_at: string;
  user_id?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  // Joins
  users?: {
      first_name: string;
      last_name: string;
      email: string;
  };
}

export interface DbCaseNote {
  id: string;
  case_id: string;
  text: string;
  at: string;
  internal: boolean;
  author_id?: string;
}

export interface DbSlaRule {
  sla_id: string;
  priority_level: string;
  response_time: string;
  resolution_time: string;
}

// Extended DB Types
export interface DbArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  status: 'Draft' | 'Published';
  helpfulness_score: number;
  updated_at: string;
}

export interface DbChatSession {
  id: string;
  customer_id: string;
  agent_id: string | null;
  status: 'Waiting' | 'Active' | 'Ended';
  started_at: string;
  ended_at: string | null;
  metadata?: any;
  last_message?: string;
  last_message_at?: string;
  last_message_sender?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'agent' | 'customer' | 'system';
  content: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  actor_id?: string;
  created_at: string;
}
