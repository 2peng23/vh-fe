export interface Business {
  id: number;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  subscription_plan: string;
  subscription_status: string;
  vehicle_limit_override: number | null;
  plan_ends_at: string | null;
  subscription: {
    tier: "trial" | "starter" | "business" | "enterprise";
    label: string;
    status: string;
    vehicle_limit: number;
    default_vehicle_limit: number;
    has_custom_vehicle_limit: boolean;
    vehicle_count: number;
    vehicles_remaining: number;
    vehicle_limit_reached: boolean;
    usage_percent: number;
    plan_ends_at: string | null;
    plan_ended: boolean;
  };
}
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role:
    "super_admin" | "owner" | "staff";
  business: Business | null;
  permissions: string[];
}
export interface Vehicle {
  id: number;
  plate_number: string;
  vehicle_code?: string;
  brand: string;
  model: string;
  variant?: string;
  year?: number;
  vehicle_type: string;
  color?: string;
  current_mileage: number;
  status: string;
  notes?: string;
  acquisition_date?: string;
  acquisition_cost?: string;
  schedules?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
}
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}
