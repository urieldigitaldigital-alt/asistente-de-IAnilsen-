export type AppointmentStatus = "scheduled" | "cancelled" | "completed";
export type ProfileRole = "owner" | "staff";
export type TranscriptRole = "assistant" | "user";
export type WhatsappConversationStatus = "active" | "needs_follow_up" | "resolved";
export type WhatsappMessageRole = "customer" | "assistant" | "business";
export type BusinessType = "citas" | "pedidos" | "restaurante" | "inmobiliaria" | "llamadas";
export type OrderType = "pickup" | "delivery";
export type OrderStatus = "recibido" | "en_preparacion" | "listo" | "entregado" | "cancelado";
export type ReservationStatus = "pendiente" | "asignada" | "cancelada";
export type PropertyStatus = "disponible" | "reservada" | "vendida";
export type VisitStatus = "pendiente" | "confirmada" | "cancelada";

export interface DayHours {
  start: string; // "09:00"
  end: string; // "18:00"
}

export type BusinessHours = Partial<
  Record<
    "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
    DayHours | null
  >
>;

export interface ClinicService {
  name: string;
  duration_minutes: number;
  description?: string;
}

export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface ClinicInfo {
  policies?: string;
  paymentMethods?: string[];
  faq?: { question: string; answer: string }[];
}

export interface AgentVoiceConfig {
  provider: string;
  voiceId: string;
  /** Multiplicador de velocidad de habla (1 = normal). Aplica a azure y 11labs. */
  speed?: number;
  /** Modelo de síntesis. Solo aplica al provider 11labs (ej. "eleven_turbo_v2_5"). */
  model?: string;
}

export interface AgentModelConfig {
  provider: string;
  model: string;
}

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          phone: string | null;
          address: string | null;
          business_type: BusinessType;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clinics"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["clinics"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          clinic_id: string;
          full_name: string | null;
          role: ProfileRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          clinic_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      agent_configs: {
        Row: {
          clinic_id: string;
          system_prompt: string;
          tone: string;
          clinic_info: ClinicInfo;
          services: ClinicService[];
          menu_items: MenuItem[];
          orders_paused: boolean;
          pickup_only: boolean;
          business_hours: BusinessHours;
          voice: AgentVoiceConfig;
          language: string;
          model: AgentModelConfig;
          first_message: string;
          handoff_message: string | null;
          vapi_assistant_id: string | null;
          vapi_phone_number_id: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["agent_configs"]["Row"]> & {
          clinic_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_configs"]["Row"]>;
        Relationships: [];
      };
      google_credentials: {
        Row: {
          clinic_id: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          token_expires_at: string;
          scope: string;
          calendar_id: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["google_credentials"]["Row"]> & {
          clinic_id: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          token_expires_at: string;
          scope: string;
        };
        Update: Partial<Database["public"]["Tables"]["google_credentials"]["Row"]>;
        Relationships: [];
      };
      vapi_credentials: {
        Row: {
          clinic_id: string;
          api_key_encrypted: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vapi_credentials"]["Row"]> & {
          clinic_id: string;
          api_key_encrypted: string;
        };
        Update: Partial<Database["public"]["Tables"]["vapi_credentials"]["Row"]>;
        Relationships: [];
      };
      whatsapp_credentials: {
        Row: {
          clinic_id: string;
          whatsapp_number: string;
          meta_phone_number_id: string;
          meta_access_token_encrypted: string;
          meta_verify_token: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["whatsapp_credentials"]["Row"]> & {
          clinic_id: string;
          whatsapp_number: string;
          meta_phone_number_id: string;
          meta_access_token_encrypted: string;
          meta_verify_token: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_credentials"]["Row"]>;
        Relationships: [];
      };
      whatsapp_sessions: {
        Row: {
          id: string;
          clinic_id: string;
          customer_phone: string;
          customer_name: string | null;
          status: WhatsappConversationStatus;
          last_message_at: string;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Row"]> & {
          clinic_id: string;
          customer_phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Row"]>;
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          clinic_id: string;
          session_id: string;
          role: WhatsappMessageRole;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Row"]> & {
          clinic_id: string;
          session_id: string;
          role: WhatsappMessageRole;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Row"]>;
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          clinic_id: string;
          vapi_call_id: string;
          started_at: string | null;
          ended_at: string | null;
          phone_number: string | null;
          status: string | null;
          summary: string | null;
          cost: number | null;
          recording_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calls"]["Row"]> & {
          clinic_id: string;
          vapi_call_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["calls"]["Row"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          clinic_id: string;
          call_id: string | null;
          google_event_id: string | null;
          google_event_link: string | null;
          patient_name: string;
          patient_phone: string;
          patient_email: string | null;
          treatment: string;
          start_time: string;
          end_time: string;
          is_new_patient: boolean;
          status: AppointmentStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["appointments"]["Row"]> & {
          clinic_id: string;
          patient_name: string;
          patient_phone: string;
          treatment: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          clinic_id: string;
          call_id: string | null;
          order_number: number;
          customer_name: string;
          customer_phone: string;
          order_type: OrderType;
          delivery_address: string | null;
          items: OrderItem[];
          total: number;
          status: OrderStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          clinic_id: string;
          customer_name: string;
          customer_phone: string;
          items: OrderItem[];
          total: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      restaurant_tables: {
        Row: {
          id: string;
          clinic_id: string;
          table_number: number;
          seats: number;
          pos_x: number;
          pos_y: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["restaurant_tables"]["Row"]> & {
          clinic_id: string;
          table_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["restaurant_tables"]["Row"]>;
        Relationships: [];
      };
      table_reservations: {
        Row: {
          id: string;
          clinic_id: string;
          call_id: string | null;
          table_id: string | null;
          customer_name: string;
          customer_phone: string;
          party_size: number;
          reservation_time: string;
          status: ReservationStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["table_reservations"]["Row"]> & {
          clinic_id: string;
          customer_name: string;
          customer_phone: string;
          party_size: number;
          reservation_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["table_reservations"]["Row"]>;
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          clinic_id: string;
          title: string;
          address: string;
          price: number;
          description: string | null;
          photo_url: string | null;
          status: PropertyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["properties"]["Row"]> & {
          clinic_id: string;
          title: string;
          address: string;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Row"]>;
        Relationships: [];
      };
      property_visits: {
        Row: {
          id: string;
          clinic_id: string;
          property_id: string;
          call_id: string | null;
          customer_name: string;
          customer_phone: string;
          visit_time: string;
          status: VisitStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["property_visits"]["Row"]> & {
          clinic_id: string;
          property_id: string;
          customer_name: string;
          customer_phone: string;
          visit_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["property_visits"]["Row"]>;
        Relationships: [];
      };
      inquiries: {
        Row: {
          id: string;
          clinic_id: string;
          call_id: string | null;
          customer_name: string | null;
          customer_phone: string;
          reason: string;
          contacted: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inquiries"]["Row"]> & {
          clinic_id: string;
          customer_phone: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Row"]>;
        Relationships: [];
      };
      transcripts: {
        Row: {
          id: string;
          clinic_id: string;
          call_id: string;
          role: TranscriptRole | null;
          text: string | null;
          timestamp: string | null;
          full_transcript: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transcripts"]["Row"]> & {
          clinic_id: string;
          call_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["transcripts"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_clinic_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AgentConfig = Database["public"]["Tables"]["agent_configs"]["Row"];
export type GoogleCredentials = Database["public"]["Tables"]["google_credentials"]["Row"];
export type VapiCredentials = Database["public"]["Tables"]["vapi_credentials"]["Row"];
export type WhatsappCredentials = Database["public"]["Tables"]["whatsapp_credentials"]["Row"];
export type WhatsappSession = Database["public"]["Tables"]["whatsapp_sessions"]["Row"];
export type WhatsappMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type RestaurantTable = Database["public"]["Tables"]["restaurant_tables"]["Row"];
export type TableReservation = Database["public"]["Tables"]["table_reservations"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyVisit = Database["public"]["Tables"]["property_visits"]["Row"];
export type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
export type Transcript = Database["public"]["Tables"]["transcripts"]["Row"];
