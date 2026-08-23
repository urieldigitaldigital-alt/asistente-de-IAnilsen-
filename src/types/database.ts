export type AppointmentStatus = "scheduled" | "cancelled" | "completed";
export type ProfileRole = "owner" | "staff";
export type TranscriptRole = "assistant" | "user";

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
          twilio_account_sid: string;
          twilio_auth_token_encrypted: string;
          whatsapp_number: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["whatsapp_credentials"]["Row"]> & {
          clinic_id: string;
          twilio_account_sid: string;
          twilio_auth_token_encrypted: string;
          whatsapp_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_credentials"]["Row"]>;
        Relationships: [];
      };
      whatsapp_sessions: {
        Row: {
          id: string;
          clinic_id: string;
          customer_phone: string;
          vapi_session_id: string;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Row"]> & {
          clinic_id: string;
          customer_phone: string;
          vapi_session_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Row"]>;
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
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Transcript = Database["public"]["Tables"]["transcripts"]["Row"];
