export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_usage_events: {
        Row: {
          created_at: string
          id: number
          mode: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          mode: string
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          mode?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: Json
          created_at: string
          id: number
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json
          created_at?: string
          id?: number
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json
          created_at?: string
          id?: number
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          customer_id: string | null
          ends_at: string | null
          id: string
          job_id: string | null
          kind: string
          location: string | null
          notes: string | null
          reminder_minutes: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          customer_id?: string | null
          ends_at?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          customer_id?: string | null
          ends_at?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          location?: string | null
          notes?: string | null
          reminder_minutes?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checked: boolean
          created_at: string
          id: string
          job_id: string
          label: string
          user_id: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: string
          job_id: string
          label: string
          user_id: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: string
          job_id?: string
          label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "checklist_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          line_id: string | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_no: string | null
          doc_type: string
          due_date: string | null
          id: string
          issue_date: string
          job_id: string | null
          language: string
          payload: Json
          survey_id: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_no?: string | null
          doc_type: string
          due_date?: string | null
          id?: string
          issue_date?: string
          job_id?: string | null
          language?: string
          payload?: Json
          survey_id?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_no?: string | null
          doc_type?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          job_id?: string | null
          language?: string
          payload?: Json
          survey_id?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_cases: {
        Row: {
          analysis: Json
          confidence: number
          created_at: string
          equipment_type: string | null
          evidence: Json
          id: string
          image_urls: string[]
          job_id: string | null
          manufacture_year: number | null
          manufacturer: string | null
          mode: string
          model: string | null
          serial_number: string | null
          status: string
          symptoms: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          confidence?: number
          created_at?: string
          equipment_type?: string | null
          evidence?: Json
          id?: string
          image_urls?: string[]
          job_id?: string | null
          manufacture_year?: number | null
          manufacturer?: string | null
          mode?: string
          model?: string | null
          serial_number?: string | null
          status?: string
          symptoms?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          confidence?: number
          created_at?: string
          equipment_type?: string | null
          evidence?: Json
          id?: string
          image_urls?: string[]
          job_id?: string | null
          manufacture_year?: number | null
          manufacturer?: string | null
          mode?: string
          model?: string | null
          serial_number?: string | null
          status?: string
          symptoms?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineering_cases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "engineering_cases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          job_id: string
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          job_id: string
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          job_id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_labor_entries: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          job_id: string
          meal_cost: number
          notes: string | null
          overtime_hours: number
          overtime_rate: number
          rate: number
          rate_type: string
          regular_hours: number
          role: string | null
          started_at: string | null
          technician_name: string
          travel_cost: number
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id: string
          meal_cost?: number
          notes?: string | null
          overtime_hours?: number
          overtime_rate?: number
          rate?: number
          rate_type?: string
          regular_hours?: number
          role?: string | null
          started_at?: string | null
          technician_name: string
          travel_cost?: number
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string
          meal_cost?: number
          notes?: string | null
          overtime_hours?: number
          overtime_rate?: number
          rate?: number
          rate_type?: string
          regular_hours?: number
          role?: string | null
          started_at?: string | null
          technician_name?: string
          travel_cost?: number
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_labor_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_labor_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          actual_quantity: number
          brand: string | null
          created_at: string
          evidence: Json
          id: string
          job_id: string
          model: string | null
          name: string
          notes: string | null
          part_number: string | null
          quantity: number
          receipt_url: string | null
          source_name: string | null
          source_type: string
          source_url: string | null
          status: string
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_quantity?: number
          brand?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          job_id: string
          model?: string | null
          name: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          receipt_url?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_quantity?: number
          brand?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          job_id?: string
          model?: string | null
          name?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          receipt_url?: string | null
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          booking_id: string | null
          checkin_at: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          progress_percent: number
          scheduled_end: string | null
          scheduled_start: string | null
          selling_price: number
          status: Database["public"]["Enums"]["job_status"]
          survey_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          selling_price?: number
          status?: Database["public"]["Enums"]["job_status"]
          survey_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          progress_percent?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          selling_price?: number
          status?: Database["public"]["Enums"]["job_status"]
          survey_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      material_searches: {
        Row: {
          created_at: string
          evidence_count: number
          id: string
          job_id: string | null
          location: string
          mode: string
          query: string
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence_count?: number
          id?: string
          job_id?: string | null
          location?: string
          mode?: string
          query: string
          results?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          evidence_count?: number
          id?: string
          job_id?: string | null
          location?: string
          mode?: string
          query?: string
          results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_searches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "material_searches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          document_id: string | null
          id: string
          job_id: string | null
          method: string
          notes: string | null
          paid_at: string
          reference_no: string | null
          slip_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          id?: string
          job_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          reference_no?: string | null
          slip_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          id?: string
          job_id?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          reference_no?: string | null
          slip_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_name: string | null
          bank_qr_url: string | null
          created_at: string
          display_name_en: string | null
          display_name_th: string | null
          email: string | null
          id: string
          line_id: string | null
          logo_url: string | null
          phone: string | null
          qr_url: string | null
          signature_url: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          display_name_en?: string | null
          display_name_th?: string | null
          email?: string | null
          id: string
          line_id?: string | null
          logo_url?: string | null
          phone?: string | null
          qr_url?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          bank_qr_url?: string | null
          created_at?: string
          display_name_en?: string | null
          display_name_th?: string | null
          email?: string | null
          id?: string
          line_id?: string | null
          logo_url?: string | null
          phone?: string | null
          qr_url?: string | null
          signature_url?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          active: boolean
          booking_id: string | null
          created_at: string
          id: string
          interval_minutes: number
          job_id: string | null
          next_fire_at: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          booking_id?: string | null
          created_at?: string
          id?: string
          interval_minutes?: number
          job_id?: string | null
          next_fire_at: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          booking_id?: string | null
          created_at?: string
          id?: string
          interval_minutes?: number
          job_id?: string | null
          next_fire_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_surveys: {
        Row: {
          address: string | null
          booking_id: string | null
          checklist: Json
          created_at: string
          customer_id: string | null
          id: string
          issue_summary: string | null
          job_id: string | null
          latitude: number | null
          longitude: number | null
          photos: string[]
          recommendations: string | null
          scheduled_at: string | null
          site_conditions: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          videos: string[]
        }
        Insert: {
          address?: string | null
          booking_id?: string | null
          checklist?: Json
          created_at?: string
          customer_id?: string | null
          id?: string
          issue_summary?: string | null
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string[]
          recommendations?: string | null
          scheduled_at?: string | null
          site_conditions?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          videos?: string[]
        }
        Update: {
          address?: string | null
          booking_id?: string | null
          checklist?: Json
          created_at?: string
          customer_id?: string | null
          id?: string
          issue_summary?: string | null
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          photos?: string[]
          recommendations?: string | null
          scheduled_at?: string | null
          site_conditions?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          videos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "site_surveys_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "site_surveys_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          created_at: string
          diagnosis: string | null
          id: string
          issue: string
          job_id: string | null
          opened_at: string
          photos: string[]
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          id?: string
          issue: string
          job_id?: string | null
          opened_at?: string
          photos?: string[]
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          id?: string
          issue?: string
          job_id?: string | null
          opened_at?: string
          photos?: string[]
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "warranty_claims_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranty_records"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_records: {
        Row: {
          created_at: string
          customer_id: string | null
          document_id: string | null
          ends_on: string
          id: string
          job_id: string
          serial_number: string | null
          starts_on: string
          status: string
          terms: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          ends_on: string
          id?: string
          job_id: string
          serial_number?: string | null
          starts_on?: string
          status?: string
          terms?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          ends_on?: string
          id?: string
          job_id?: string
          serial_number?: string | null
          starts_on?: string
          status?: string
          terms?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "warranty_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_points: {
        Row: {
          approach: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          materials: Json | null
          photos: string[] | null
          quantity: number | null
          sort_order: number | null
          title: string
          unit: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          approach?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          materials?: Json | null
          photos?: string[] | null
          quantity?: number | null
          sort_order?: number | null
          title: string
          unit?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          approach?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          materials?: Json | null
          photos?: string[] | null
          quantity?: number | null
          sort_order?: number | null
          title?: string
          unit?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_points_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_financial_summary"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "work_points_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      job_financial_summary: {
        Row: {
          gross_profit: number | null
          job_id: string | null
          labor_cost: number | null
          material_cost: number | null
          other_cost: number | null
          outstanding_amount: number | null
          paid_amount: number | null
          selling_price: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string | null
          total_cost: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_api_quota: {
        Args: {
          p_hourly_limit: number
          p_mode: string
          p_provider: string
          p_user_id: string
        }
        Returns: number
      }
      job_financials: {
        Args: { p_job_id: string }
        Returns: {
          gross_profit: number
          labor_cost: number
          material_cost: number
          other_cost: number
          outstanding_amount: number
          paid_amount: number
          selling_price: number
          total_cost: number
        }[]
      }
    }
    Enums: {
      job_status:
        | "draft"
        | "assessed"
        | "quoted"
        | "in_progress"
        | "delivered"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      job_status: [
        "draft",
        "assessed",
        "quoted",
        "in_progress",
        "delivered",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
