import type { User } from "./index";

export interface BusinessSubscription {
  label: string;
  vehicle_limit: number;
}

export interface AdminBusiness {
  id: number;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  status: "active" | "inactive";
  users_count: number;
  vehicles_count: number;
  users: User[];
  subscription?: BusinessSubscription;

  vehicle_limit_override?: number | null;
  plan_ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * User shape returned by Super Admin endpoints.
 * Kept separate from the app-wide User type because these endpoints include
 * business context and administration-specific fields.
 */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "owner" | "staff" | string;
  status: string;
  created_at: string;
  permissions?: string[];
  business?: AdminBusiness | null;
}

export interface AdminStats {
  businesses: number;
  active_businesses: number;
  trial_businesses: number;
  users: number;
  vehicles: number;
}

export interface AdminPlanOffering {
  id: number;
  plan: string;
  name: string;
  duration_months: number;
  price: number | string;
  vehicle_limit: number;
  details?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminPaymentMethod {
  id: number;
  name: string;
  account_name: string;
  account_number: string;
  qr_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminTransactionPaymentMethod {
  id?: number;
  name: string;
  account_name?: string | null;
  account_number?: string | null;
}

export interface AdminTransactionCreator {
  id: number;
  name: string;
  email?: string;
}

export type AdminTransactionStatus = "processing" | "completed" | "failed";
export type AdminPaymentStatus = "paid" | "not_paid";

export interface AdminTransaction {
  id: number;
  business_id?: number;
  business: AdminBusiness;
  plan: string;
  amount: number | string;
  reference?: string | null;
  payment_status: AdminPaymentStatus;
  status: AdminTransactionStatus;
  payment_method?: string | null;
  payment_method_id?: number | null;
  selected_payment_method?: AdminTransactionPaymentMethod | null;
  paid_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  creator?: AdminTransactionCreator | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminTransactionFilters {
  plan: string;
  payment_status: string;
  status: string;
  payment_method: string;
  date_from: string;
  date_to: string;
}

export type AdminPermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "override";

export interface PermissionData {
  modules: Record<string, AdminPermissionAction[]>;
}

// Optional alias if other parts of the app use the longer name.
export type AdminPermissionData = PermissionData;

export interface AdminPermissionUser extends AdminUser {
  permissions: string[];
}

export type AdminTab =
  | "dashboard"
  | "businesses"
  | "users"
  | "permissions"
  | "support"
  | "transactions"
  | "payment-methods"
  | "plans";

export interface AdminPageMeta {
  title: string;
  description: string;
}

// Optional alias for existing imports using AdminPage.
export type AdminPage = AdminPageMeta;

/** Laravel validation error bag keyed by field name. */
export type ValidationBag = Record<string, string[]>;
