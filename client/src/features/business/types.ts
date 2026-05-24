// ─── Business Hub Types ───────────────────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

export interface BusinessClient {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'lead';
  notes: string;
  created_at: string;
}

export interface BusinessProject {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name?: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  budget: number | null;
  deadline: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface BusinessInvoice {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name?: string;
  project_id: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  notes: string;
  tax_rate: number;
  total_amount: number;
  items?: InvoiceItem[];
  created_at: string;
}

export interface BusinessExpense {
  id: string;
  user_id: string;
  project_id: string | null;
  project_name?: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  is_billable: number;
  receipt_note: string;
  created_at: string;
}

export interface BusinessMetrics {
  totalRevenue: number;
  monthRevenue: number;
  outstanding: number;
  activeProjects: number;
  clientCount: number;
  monthExpenses: number;
  topClients: Array<{ name: string; revenue: number }>;
}
