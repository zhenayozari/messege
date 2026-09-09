export type ChannelType =
  | "vk"
  | "vk_wall"
  | "vk_channel"
  | "telegram"
  | "max"
  | "avito"
  | "site"
  | "instagram"
  | "test";

export type MessageDirection = "inbound" | "outbound";
export type SenderType = "client" | "operator" | "ai" | "system";
export type LeadStatus = "new" | "qualifying" | "waiting_client" | "measurement_planned" | "won" | "lost";
export type LeadTemperature = "cold" | "warm" | "hot";
export type AiSuggestionMode = "draft" | "auto_allowed" | "human_required";
export type AiSuggestionStatus = "pending" | "accepted" | "edited" | "rejected";
export type ContentStatus = "idea" | "draft" | "review" | "approved" | "scheduled" | "published" | "archived";

export type UserRole = "owner" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
}

export type NavView =
  | "dialogs"
  | "content"
  | "calendar"
  | "media"
  | "accounts"
  | "backend"
  | "analytics";

export interface PostPerformance {
  id: string;
  project_id: string;
  content_item_id: string;
  content_title: string;
  channel: ChannelType;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  leads_count: number;
  measurements_count: number;
  conversion_rate: number; // % переходов в диалоги/лиды
  published_at: string;
  last_synced_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  niche_type: "ceilings" | "kitchens" | "windows" | "general";
  description: string;
  knowledge_dir: string;
  system_prompt: string;
  is_active: boolean;
  color: string;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  primary_channel: ChannelType;
  city?: string | null;
  avatar_url?: string;
  notes?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: SenderType;
  text: string;
  attachments?: Array<{ type: string; url: string; title?: string }>;
  delivery_status: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface AiSuggestion {
  id: string;
  suggested_text: string;
  confidence: number;
  mode: AiSuggestionMode;
  status: AiSuggestionStatus;
  rag_sources?: string[];
  created_at: string;
}

export interface LeadCalculationBreakdownLine {
  category: string;
  key?: string;
  label: string;
  unit: string;
  quantity: number;
  min_unit_price?: number;
  max_unit_price?: number;
  min_total: number;
  max_total: number;
}

export interface CorniceItem {
  id: string;
  type: string;
  length: number;
  led: boolean;
}

export interface LeadCalculation {
  id: string;
  lead_id: string;
  conversation_id: string;
  area_m2?: number | null;
  perimeter_m?: number | null;
  profile_type?: string;
  profile_subtype?: string | null;
  angles_count?: number;
  cornices?: Record<string, { type: string; length: number; led: boolean }>;
  lights?: Record<string, number>;
  vent_points?: number;
  smart_setup?: boolean;
  discount_category?: string | null;
  estimate_min?: number | null;
  estimate_max?: number | null;
  breakdown?: LeadCalculationBreakdownLine[];
  custom_data?: Record<string, any>;
}

export interface Lead {
  id: string;
  project_id: string;
  contact_id: string;
  conversation_id: string;
  source: ChannelType;
  status: LeadStatus;
  temperature: LeadTemperature;
  area_m2?: number | null;
  rooms_count?: number | null;
  lights_count?: number | null;
  cornice?: boolean | null;
  ceiling_type?: string | null;
  address?: string | null;
  desired_date?: string | null;
  phone_received: boolean;
  measurement_planned: boolean;
  estimated_price?: number | null;
  custom_fields?: Record<string, any>;
  last_notification_at?: string | null;
  next_follow_up_at?: string | null;
  updated_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  channel: ChannelType;
  contact_id: string;
  contact: Contact;
  external_chat_id: string;
  status: string;
  last_text: string;
  last_message_at: string;
  unread_count: number;
  messages: Message[];
  lead?: Lead;
  calculation?: LeadCalculation;
  pending_suggestion?: AiSuggestion | null;
}

export interface ContentVariant {
  id: string;
  content_item_id: string;
  channel: ChannelType;
  title?: string;
  text: string;
  format: string;
  status: ContentStatus;
  ai_notes?: string | null;
  scheduled_at?: string | null;
}

export interface MediaAsset {
  id: string;
  project_id: string;
  content_item_id?: string | null;
  content_item_ids?: string[];
  title: string;
  asset_type: "photo" | "video" | "cover" | "certificate";
  url: string;
  description?: string | null;
  tags: string[];
  created_at: string;
}

export interface MergeContactsPayload {
  main_contact_id: string;
  duplicate_contact_id: string;
}


export interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  topic: string;
  rubric: string;
  goal: string;
  offer: string;
  trigger_keyword: string;
  status: ContentStatus;
  variants: ContentVariant[];
  media_assets: MediaAsset[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  content_item_id: string;
  content_variant_id: string;
  content_title: string;
  channel: ChannelType;
  text: string;
  scheduled_at: string;
  status: "scheduled" | "publishing" | "published" | "failed";
}

export interface ChannelConnectorStatus {
  channel: ChannelType;
  name: string;
  connected: boolean;
  polling_mode: "long_polling" | "webhook" | "manual" | "disabled";
  is_active: boolean;
  last_heartbeat?: string;
  unread_events: number;
  details: string;
}
