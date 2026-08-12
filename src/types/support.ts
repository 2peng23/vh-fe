export type SupportConversationType = "business" | "guest";

export interface SupportConversation {
  id: number;
  name: string;
  email: string;
  conversation_type: SupportConversationType;
  unread_support_count: number;
  subscription_status: string | null;
}

export interface SupportMessage {
  id: number;
  sender_type: "tenant" | "guest" | "super_admin";
  message: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_at: string;
  read_at: string | null;
}

export interface SupportTemplate {
  id: number;
  title: string;
  message: string;
}
