export type PlanOffering = {
  id: number;
  plan: string;
  name: string;
  vehicle_limit: number;
  details: string;
  duration_months: number;
  price: number | string;
};

export type EnrichedPlanOffering = PlanOffering & {
  regular_price: number;
  discount_percent: number;
  monthly_equivalent: number;
  savings: number;
  best_value: boolean;
};

export type PlanGroup = {
  name: string;
  vehicleLimit: number;
  details: string;
  offerings: PlanOffering[];
};

export type EnrichedPlanGroup = Omit<PlanGroup, "offerings"> & {
  offerings: EnrichedPlanOffering[];
};

export type PaymentMethod = {
  id: number;
  name: string;
  account_name: string;
  account_number: string;
  qr_path?: string | null;
};

export type SelectedOffering = EnrichedPlanOffering & {
  plan_name: string;
  vehicle_limit: number;
};

export type PaymentStatus =
  | "not_paid"
  | "pending"
  | "pending_verification"
  | "paid"
  | "rejected"
  | "expired"
  | string;

export type PlanTransaction = {
  id: number;
  reference: string;
  transaction_type?: "purchase" | "upgrade" | "renewal" | "downgrade" | string;
  from_plan?: string | null;
  original_amount?: number | string;
  credit_amount?: number | string;
  plan: string;
  amount: number | string;
  payment_method: string;
  payment_status: PaymentStatus;
  status: string;
  selected_payment_method?: PaymentMethod | null;
  payment_reference?: string | null;
  payment_submitted_at?: string | null;
  payment_rejection_reason?: string | null;
  paid_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  notes?: string | null;
};

export type PurchaseForm = {
  subscription_plan_offering_id: string;
  payment_method_id: string;
};

export type QrPreview = {
  name: string;
  url: string;
};

export type PaymentSubmissionPayload = {
  payment_reference: string;
  proof: File | null;
};

export type SubscriptionPreview = {
  type: "purchase" | "upgrade" | "renewal" | "downgrade";
  from_plan: string;
  to_plan: string;
  plan: string;
  remaining_days: number;
  original_price: number | string;
  credit_amount: number | string;
  amount_due: number | string;
  current_ends_at: string | null;
  new_starts_at: string;
  new_ends_at: string;
  effective: string;
  effective_at: string | null;
  vehicle_limit: number;
  duration_months: number;
};
