// ─── Home & Property Hub Types ────────────────────────────────────────────────
// Enhancement 21 — Propel Stack AI, LLC

export type PropertyType = 'primary' | 'rental' | 'vacation';
export type UtilityType  = 'electric' | 'gas' | 'water' | 'internet' | 'other';
export type InsuranceType = 'home' | 'auto' | 'umbrella' | 'life' | 'renter' | 'other';
export type ServiceType  = 'oil_change' | 'tire_rotation' | 'inspection' | 'registration' | 'other';

export interface Property {
  id: string;
  user_id: string;
  nickname: string;
  type: PropertyType;
  address: string;
  purchase_date?: string;
  estimated_value?: number;
  mortgage_amount?: number;
  mortgage_rate?: number;
  rent_amount?: number;
  zillow_url: string;
  notes: string;
  created_at: string;
}

export interface MaintenanceTask {
  id: string;
  user_id: string;
  property_id: string;
  property_name?: string;
  task_name: string;
  category: string;
  frequency_days: number;
  last_done?: string;
  next_due?: string;
  notes: string;
  created_at: string;
}

export interface Appliance {
  id: string;
  user_id: string;
  property_id?: string;
  property_name?: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date?: string;
  warranty_expiry?: string;
  purchase_price?: number;
  notes: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  current_mileage: number;
  registration_renewal?: string;
  inspection_due?: string;
  notes: string;
  created_at: string;
}

export interface ServiceLogEntry {
  id: string;
  vehicle_id: string;
  service_type: ServiceType;
  service_date: string;
  mileage?: number;
  cost_cents?: number;
  notes: string;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  policy_type: InsuranceType;
  carrier: string;
  policy_number: string;
  agent_name: string;
  agent_contact: string;
  premium_cents?: number;
  renewal_date?: string;
  property_id?: string;
  vehicle_id?: string;
  notes: string;
  renewal_soon?: boolean;
}

export interface UtilityBill {
  id: string;
  user_id: string;
  property_id?: string;
  property_name?: string;
  utility_type: UtilityType;
  bill_month: string;
  amount_cents: number;
  notes: string;
}

export interface UtilitySpike {
  utility_type: string;
  bill_month: string;
  amount_cents: number;
  avg_cents: number;
  pct_over: number;
}

export interface RentalLease {
  id: string;
  user_id: string;
  property_id: string;
  property_name?: string;
  address?: string;
  tenant_name: string;
  lease_start: string;
  lease_end: string;
  rent_cents: number;
  due_day: number;
  security_deposit_cents?: number;
  last_payment_date?: string;
  notes: string;
}
