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
}
