import type { AdminPageMeta, AdminTab } from "../../../types/admin";

export const ADMIN_PAGE_META: Record<AdminTab, AdminPageMeta> = {
  dashboard: {
    title: "Dashboard",
    description: "Monitor businesses, plans, users, and vehicles across the platform.",
  },
  logistics: {
    title: "Logistics",
    description: "Import and manage logistics contacts from CSV or XLSX files.",
  },
  businesses: {
    title: "Businesses",
    description: "Manage tenant businesses, plans, limits, and account access.",
  },
  users: {
    title: "Users",
    description: "Review and manage owners and staff across every business.",
  },
  permissions: {
    title: "Permissions",
    description: "Configure access for individual tenant users.",
  },
  transactions: {
    title: "Transactions",
    description: "Track plan purchases and payment processing.",
  },
  plans: {
    title: "Plans",
    description: "Configure plan prices, billing periods, limits, and details.",
  },
  "payment-methods": {
    title: "Payment methods",
    description: "Manage the accounts available for plan payments.",
  },
  support: {
    title: "Support",
    description: "Read and respond to business support conversations.",
  },
};
