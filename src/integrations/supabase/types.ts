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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          activity_type: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string | null
          profile_id: string | null
          title: string | null
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      affidavit_requests: {
        Row: {
          affidavit_type: string | null
          created_at: string | null
          id: string
          organization_id: string
          prepared_by: string | null
          status: string | null
          storage_path: string | null
          tender_id: string
          updated_at: string | null
        }
        Insert: {
          affidavit_type?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          prepared_by?: string | null
          status?: string | null
          storage_path?: string | null
          tender_id: string
          updated_at?: string | null
        }
        Update: {
          affidavit_type?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          prepared_by?: string | null
          status?: string | null
          storage_path?: string | null
          tender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affidavit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "affidavit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affidavit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affidavit_requests_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affidavit_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affidavit_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affidavit_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_key: string | null
          created_at: string | null
          id: string
          prompt_hash: string | null
          response: Json | null
        }
        Insert: {
          cache_key?: string | null
          created_at?: string | null
          id?: string
          prompt_hash?: string | null
          response?: Json | null
        }
        Update: {
          cache_key?: string | null
          created_at?: string | null
          id?: string
          prompt_hash?: string | null
          response?: Json | null
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          completed: boolean | null
          created_at: string | null
          dismissed: boolean | null
          id: string
          message: string
          organization_id: string
          priority: number | null
          title: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          message: string
          organization_id: string
          priority?: number | null
          title: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          message?: string
          organization_id?: string
          priority?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          enabled: boolean | null
          id: string
          model: string | null
          provider: string | null
          temperature: number | null
        }
        Insert: {
          enabled?: boolean | null
          id?: string
          model?: string | null
          provider?: string | null
          temperature?: number | null
        }
        Update: {
          enabled?: boolean | null
          id?: string
          model?: string | null
          provider?: string | null
          temperature?: number | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          profile_id: string | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          profile_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          profile_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          profile_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          profile_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          profile_id?: string | null
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          payload: Json | null
          rule_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          rule_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          rule_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_type: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          organization_id: string | null
          rule_name: string | null
          trigger_type: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          organization_id?: string | null
          rule_name?: string | null
          trigger_type?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          organization_id?: string | null
          rule_name?: string | null
          trigger_type?: string | null
        }
        Relationships: []
      }
      bank_reference_requests: {
        Row: {
          bank_name: string | null
          company_id: string | null
          created_at: string | null
          expected_date: string | null
          expiry_date: string | null
          id: string
          is_template: boolean
          notes: string | null
          organization_id: string
          received_date: string | null
          request_date: string | null
          request_metadata: Json
          requested_by: string | null
          status: string | null
          tender_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_name?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_date?: string | null
          expiry_date?: string | null
          id?: string
          is_template?: boolean
          notes?: string | null
          organization_id: string
          received_date?: string | null
          request_date?: string | null
          request_metadata?: Json
          requested_by?: string | null
          status?: string | null
          tender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_name?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_date?: string | null
          expiry_date?: string | null
          id?: string
          is_template?: boolean
          notes?: string | null
          organization_id?: string
          received_date?: string | null
          request_date?: string | null
          request_metadata?: Json
          requested_by?: string | null
          status?: string | null
          tender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reference_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "bank_reference_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reference_requests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          legal_name: string
          organization_id: string
          registration_number: string | null
          tax_expiry_date: string | null
          tax_identification_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name: string
          organization_id: string
          registration_number?: string | null
          tax_expiry_date?: string | null
          tax_identification_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name?: string
          organization_id?: string
          registration_number?: string | null
          tax_expiry_date?: string | null
          tax_identification_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          company_id: string
          created_at: string
          deleted_at: string | null
          document_name: string
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_filename: string | null
          sha256_hash: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          version: number | null
        }
        Insert: {
          analysis_json?: Json
          analysis_status?: Database["public"]["Enums"]["document_analysis_status"]
          behavior?: Database["public"]["Enums"]["document_behavior"]
          category?: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          document_name: string
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          document_type?: string | null
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          original_filename?: string | null
          sha256_hash: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          version?: number | null
        }
        Update: {
          analysis_json?: Json
          analysis_status?: Database["public"]["Enums"]["document_analysis_status"]
          behavior?: Database["public"]["Enums"]["document_behavior"]
          category?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          document_name?: string
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          document_type?: string | null
          expiry_date?: string | null
          file_size?: number | null
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          original_filename?: string | null
          sha256_hash?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_matches: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string | null
          id: string
          notes: string | null
          organization_id: string
          requirement: string
          requirement_type: string | null
          status: string
          tender_id: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          requirement: string
          requirement_type?: string | null
          status?: string
          tender_id: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          requirement?: string
          requirement_type?: string | null
          status?: string
          tender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "company_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "vw_document_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "vw_expiring_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_matches_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          created_at: string | null
          id: string
          layout: Json | null
          organization_id: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          organization_id?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          organization_id?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "dashboard_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string | null
          document_type: string | null
          id: string
          organization_id: string | null
          template: Json | null
          title: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          id?: string
          organization_id?: string | null
          template?: Json | null
          title?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          id?: string
          organization_id?: string | null
          template?: Json | null
          title?: string | null
          version?: number | null
        }
        Relationships: []
      }
      document_types: {
        Row: {
          active: boolean | null
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          behavior?: Database["public"]["Enums"]["document_behavior"]
          category?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_usage_history: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          organization_id: string
          proposal_id: string | null
          tender_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          organization_id: string
          proposal_id?: string | null
          tender_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          organization_id?: string
          proposal_id?: string | null
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_usage_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "company_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "vw_document_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "vw_expiring_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "document_usage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_usage_history_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean | null
          key: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean | null
          key: string
        }
        Update: {
          description?: string | null
          enabled?: boolean | null
          key?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          approved: boolean | null
          content_markdown: string | null
          created_at: string | null
          created_by: string | null
          document_type: string
          id: string
          organization_id: string
          storage_path: string | null
          tender_id: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved?: boolean | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type: string
          id?: string
          organization_id: string
          storage_path?: string | null
          tender_id?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved?: boolean | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          id?: string
          organization_id?: string
          storage_path?: string | null
          tender_id?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      greeting_messages: {
        Row: {
          active: boolean | null
          display_order: number | null
          greeting: string | null
          id: string
        }
        Insert: {
          active?: boolean | null
          display_order?: number | null
          greeting?: string | null
          id?: string
        }
        Update: {
          active?: boolean | null
          display_order?: number | null
          greeting?: string | null
          id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          analysis_notifications: boolean | null
          deadline_notifications: boolean | null
          email_notifications: boolean | null
          id: string
          profile_id: string | null
          proposal_notifications: boolean | null
          renewal_notifications: boolean | null
        }
        Insert: {
          analysis_notifications?: boolean | null
          deadline_notifications?: boolean | null
          email_notifications?: boolean | null
          id?: string
          profile_id?: string | null
          proposal_notifications?: boolean | null
          renewal_notifications?: boolean | null
        }
        Update: {
          analysis_notifications?: boolean | null
          deadline_notifications?: boolean | null
          email_notifications?: boolean | null
          id?: string
          profile_id?: string | null
          proposal_notifications?: boolean | null
          renewal_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string | null
          id: string
          is_sent: boolean | null
          message: string | null
          notification_type: string | null
          organization_id: string | null
          profile_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          notification_type?: string | null
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          notification_type?: string | null
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          priority: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organization_health: {
        Row: {
          activity_score: number | null
          compliance_score: number | null
          document_score: number | null
          health_score: number | null
          last_calculated: string | null
          organization_id: string
          readiness_score: number | null
          risk_level: string | null
        }
        Insert: {
          activity_score?: number | null
          compliance_score?: number | null
          document_score?: number | null
          health_score?: number | null
          last_calculated?: string | null
          organization_id: string
          readiness_score?: number | null
          risk_level?: string | null
        }
        Update: {
          activity_score?: number | null
          compliance_score?: number | null
          document_score?: number | null
          health_score?: number | null
          last_calculated?: string | null
          organization_id?: string
          readiness_score?: number | null
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_health_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_health_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_health_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          is_owner: boolean | null
          joined_at: string | null
          organization_id: string | null
          profile_id: string | null
          role_id: string | null
        }
        Insert: {
          id?: string
          is_owner?: boolean | null
          joined_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          role_id?: string | null
        }
        Update: {
          id?: string
          is_owner?: boolean | null
          joined_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_metrics: {
        Row: {
          active_documents: number | null
          average_readiness_score: number | null
          expired_documents: number | null
          expiring_documents: number | null
          id: string
          organization_id: string
          proposals_generated: number | null
          tenders_analyzed: number | null
          tenders_uploaded: number | null
          updated_at: string | null
        }
        Insert: {
          active_documents?: number | null
          average_readiness_score?: number | null
          expired_documents?: number | null
          expiring_documents?: number | null
          id?: string
          organization_id: string
          proposals_generated?: number | null
          tenders_analyzed?: number | null
          tenders_uploaded?: number | null
          updated_at?: string | null
        }
        Update: {
          active_documents?: number | null
          average_readiness_score?: number | null
          expired_documents?: number | null
          expiring_documents?: number | null
          id?: string
          organization_id?: string
          proposals_generated?: number | null
          tenders_analyzed?: number | null
          tenders_uploaded?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_readiness_history: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          id: string
          organization_id: string
          readiness_score: number
          readiness_status: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          id?: string
          organization_id: string
          readiness_score: number
          readiness_status?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          id?: string
          organization_id?: string
          readiness_score?: number
          readiness_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_readiness_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_readiness_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_readiness_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_statistics: {
        Row: {
          active_documents: number | null
          expired_documents: number | null
          lost_tenders: number | null
          organization_id: string
          readiness_average: number | null
          total_documents: number | null
          total_tenders: number | null
          updated_at: string | null
          won_tenders: number | null
        }
        Insert: {
          active_documents?: number | null
          expired_documents?: number | null
          lost_tenders?: number | null
          organization_id: string
          readiness_average?: number | null
          total_documents?: number | null
          total_tenders?: number | null
          updated_at?: string | null
          won_tenders?: number | null
        }
        Update: {
          active_documents?: number | null
          expired_documents?: number | null
          lost_tenders?: number | null
          organization_id?: string
          readiness_average?: number | null
          total_documents?: number | null
          total_tenders?: number | null
          updated_at?: string | null
          won_tenders?: number | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          industry: string | null
          last_assessed_at: string | null
          logo_url: string | null
          name: string
          organization_type:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone: string | null
          primary_color: string | null
          readiness_score: number | null
          readiness_status: string | null
          secondary_color: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_assessed_at?: string | null
          logo_url?: string | null
          name: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone?: string | null
          primary_color?: string | null
          readiness_score?: number | null
          readiness_status?: string | null
          secondary_color?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_assessed_at?: string | null
          logo_url?: string | null
          name?: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone?: string | null
          primary_color?: string | null
          readiness_score?: number | null
          readiness_status?: string | null
          secondary_color?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module: string | null
          name: string
          permission_key: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
          name: string
          permission_key: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
          name?: string
          permission_key?: string
        }
        Relationships: []
      }
      procurement_calendar: {
        Row: {
          created_at: string | null
          event_date: string | null
          event_type: string | null
          id: string
          organization_id: string | null
          reference_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          organization_id?: string | null
          reference_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          organization_id?: string | null
          reference_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      procurement_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          organization_id: string
          tender_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          tender_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          tender_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_events_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_events_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_events_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_knowledge: {
        Row: {
          category: string | null
          confidence: number | null
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      procurement_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          notification_type: string | null
          organization_id: string | null
          profile_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          organization_id?: string | null
          profile_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "procurement_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          priority: string | null
          status: string | null
          task: string | null
          tender_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          task?: string | null
          tender_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          task?: string | null
          tender_id?: string | null
        }
        Relationships: []
      }
      procurement_tips: {
        Row: {
          active: boolean | null
          category: string | null
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          tip: string
          title: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          tip: string
          title?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          tip?: string
          title?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          default_organization_id: string | null
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          default_organization_id?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          default_organization_id?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          organization_id: string | null
          proposal_type: string | null
          storage_path: string | null
          template_name: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          proposal_type?: string | null
          storage_path?: string | null
          template_name: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          proposal_type?: string | null
          storage_path?: string | null
          template_name?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "proposal_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          created_at: string | null
          generated_by: string | null
          id: string
          organization_id: string | null
          storage_path: string | null
          tender_id: string | null
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string | null
          storage_path?: string | null
          tender_id?: string | null
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string | null
          storage_path?: string | null
          tender_id?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "proposal_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_history: {
        Row: {
          created_at: string | null
          expired: number | null
          id: string
          matched: number | null
          missing: number | null
          organization_id: string | null
          score: number | null
          tender_id: string | null
        }
        Insert: {
          created_at?: string | null
          expired?: number | null
          id?: string
          matched?: number | null
          missing?: number | null
          organization_id?: string | null
          score?: number | null
          tender_id?: string | null
        }
        Update: {
          created_at?: string | null
          expired?: number | null
          id?: string
          matched?: number | null
          missing?: number | null
          organization_id?: string | null
          score?: number | null
          tender_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          organization_id: string | null
          status: Database["public"]["Enums"]["record_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["record_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_decisions: {
        Row: {
          created_at: string | null
          decision: string | null
          id: string
          organization_id: string | null
          reason: string | null
          tender_id: string | null
        }
        Insert: {
          created_at?: string | null
          decision?: string | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          tender_id?: string | null
        }
        Update: {
          created_at?: string | null
          decision?: string | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          tender_id?: string | null
        }
        Relationships: []
      }
      tender_eligibility: {
        Row: {
          eligibility_score: number | null
          expired: number | null
          generated_at: string | null
          id: string
          matched: number | null
          missing: number | null
          organization_id: string | null
          tender_id: string | null
        }
        Insert: {
          eligibility_score?: number | null
          expired?: number | null
          generated_at?: string | null
          id?: string
          matched?: number | null
          missing?: number | null
          organization_id?: string | null
          tender_id?: string | null
        }
        Update: {
          eligibility_score?: number | null
          expired?: number | null
          generated_at?: string | null
          id?: string
          matched?: number | null
          missing?: number | null
          organization_id?: string | null
          tender_id?: string | null
        }
        Relationships: []
      }
      tender_files: {
        Row: {
          analysis_json: Json | null
          created_at: string | null
          extracted_text: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          mime_type: string | null
          organization_id: string
          sha256_hash: string | null
          storage_path: string
          tender_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          analysis_json?: Json | null
          created_at?: string | null
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          organization_id: string
          sha256_hash?: string | null
          storage_path: string
          tender_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          analysis_json?: Json | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          sha256_hash?: string | null
          storage_path?: string
          tender_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_files_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_files_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_files_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_outcomes: {
        Row: {
          contract_value: number | null
          created_at: string | null
          entered_by: string | null
          id: string
          lessons_learned: string | null
          organization_id: string
          outcome: string
          reason_for_loss: string | null
          tender_id: string
          updated_at: string | null
          winning_company: string | null
        }
        Insert: {
          contract_value?: number | null
          created_at?: string | null
          entered_by?: string | null
          id?: string
          lessons_learned?: string | null
          organization_id: string
          outcome: string
          reason_for_loss?: string | null
          tender_id: string
          updated_at?: string | null
          winning_company?: string | null
        }
        Update: {
          contract_value?: number | null
          created_at?: string | null
          entered_by?: string | null
          id?: string
          lessons_learned?: string | null
          organization_id?: string
          outcome?: string
          reason_for_loss?: string | null
          tender_id?: string
          updated_at?: string | null
          winning_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_outcomes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_outcomes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_outcomes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_requirements: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string | null
          display_order: number | null
          explanation: string | null
          id: string
          matched_document_id: string | null
          organization_id: string
          requirement_name: string | null
          requirement_text: string
          source: Database["public"]["Enums"]["requirement_source"] | null
          status: Database["public"]["Enums"]["requirement_status"] | null
          tender_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          matched_document_id?: string | null
          organization_id: string
          requirement_name?: string | null
          requirement_text: string
          source?: Database["public"]["Enums"]["requirement_source"] | null
          status?: Database["public"]["Enums"]["requirement_status"] | null
          tender_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          matched_document_id?: string | null
          organization_id?: string
          requirement_name?: string | null
          requirement_text?: string
          source?: Database["public"]["Enums"]["requirement_source"] | null
          status?: Database["public"]["Enums"]["requirement_status"] | null
          tender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_matched_document_id_fkey"
            columns: ["matched_document_id"]
            isOneToOne: false
            referencedRelation: "company_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_matched_document_id_fkey"
            columns: ["matched_document_id"]
            isOneToOne: false
            referencedRelation: "document_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_matched_document_id_fkey"
            columns: ["matched_document_id"]
            isOneToOne: false
            referencedRelation: "vw_document_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_matched_document_id_fkey"
            columns: ["matched_document_id"]
            isOneToOne: false
            referencedRelation: "vw_expiring_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_similarity: {
        Row: {
          created_at: string | null
          id: string
          similar_tender_id: string
          similarity_score: number | null
          tender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          similar_tender_id: string
          similarity_score?: number | null
          tender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          similar_tender_id?: string
          similarity_score?: number | null
          tender_id?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          analysis_error: string | null
          analysis_json: Json | null
          analysis_status: string | null
          analyzed_at: string | null
          company_id: string
          compliance_percentage: number | null
          created_at: string | null
          created_by: string | null
          id: string
          industry: string | null
          lot_description: string | null
          lot_number: string | null
          notes: string | null
          opening_date: string | null
          organization_id: string
          procurement_method: string | null
          procuring_entity: string | null
          raw_text: string | null
          reference_number: string | null
          requires_affidavit: boolean | null
          requires_bank_reference: boolean | null
          requires_bid_security: boolean | null
          status: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline: string | null
          tender_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          analysis_error?: string | null
          analysis_json?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id: string
          compliance_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          lot_description?: string | null
          lot_number?: string | null
          notes?: string | null
          opening_date?: string | null
          organization_id: string
          procurement_method?: string | null
          procuring_entity?: string | null
          raw_text?: string | null
          reference_number?: string | null
          requires_affidavit?: boolean | null
          requires_bank_reference?: boolean | null
          requires_bid_security?: boolean | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          tender_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          analysis_error?: string | null
          analysis_json?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_id?: string
          compliance_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          lot_description?: string | null
          lot_number?: string | null
          notes?: string | null
          opening_date?: string | null
          organization_id?: string
          procurement_method?: string | null
          procuring_entity?: string | null
          raw_text?: string | null
          reference_number?: string | null
          requires_affidavit?: boolean | null
          requires_bank_reference?: boolean | null
          requires_bid_security?: boolean | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          tender_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_activity: {
        Row: {
          activity: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          activity?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workspace_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          created_at: string | null
          default_company: boolean | null
          organization_id: string
          show_ai_brief: boolean | null
          show_procurement_tip: boolean | null
          theme: string | null
          updated_at: string | null
          workspace_name: string | null
        }
        Insert: {
          created_at?: string | null
          default_company?: boolean | null
          organization_id: string
          show_ai_brief?: boolean | null
          show_procurement_tip?: boolean | null
          theme?: string | null
          updated_at?: string | null
          workspace_name?: string | null
        }
        Update: {
          created_at?: string | null
          default_company?: boolean | null
          organization_id?: string
          show_ai_brief?: boolean | null
          show_procurement_tip?: boolean | null
          theme?: string | null
          updated_at?: string | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workspace_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_alerts: {
        Row: {
          days_remaining: number | null
          document_name: string | null
          expiry_date: string | null
          organization_id: string | null
          severity: string | null
        }
        Insert: {
          days_remaining?: never
          document_name?: string | null
          expiry_date?: string | null
          organization_id?: string | null
          severity?: never
        }
        Update: {
          days_remaining?: never
          document_name?: string | null
          expiry_date?: string | null
          organization_id?: string | null
          severity?: never
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_view: {
        Row: {
          active_documents: number | null
          expired_documents: number | null
          expiring_documents: number | null
          health_percentage: number | null
          name: string | null
          organization_id: string | null
          total_documents: number | null
          verified_documents: number | null
        }
        Relationships: []
      }
      company_profile_completion: {
        Row: {
          active_documents: number | null
          completion_percentage: number | null
          id: string | null
          name: string | null
          total_documents: number | null
        }
        Relationships: []
      }
      company_readiness_summary: {
        Row: {
          active_documents: number | null
          document_health_score: number | null
          expired_documents: number | null
          expiring_documents: number | null
          organization_id: string | null
          total_documents: number | null
          verified_documents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_summary: {
        Row: {
          compliance_percentage: number | null
          expired: number | null
          matched: number | null
          missing: number | null
          organization_id: string | null
          tender_id: string | null
          total_requirements: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_summary: {
        Row: {
          expired: number | null
          organization_id: string | null
          renewing_soon: number | null
          total_documents: number | null
          verified: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_usage: {
        Row: {
          document_name: string | null
          id: string | null
          usage_count: number | null
        }
        Relationships: []
      }
      organization_pipeline: {
        Row: {
          active: number | null
          next_deadline: string | null
          organization_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_health: {
        Row: {
          expired: number | null
          expiring: number | null
          healthy: number | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_dashboard: {
        Row: {
          active_tenders: number | null
          analyzed: number | null
          closed: number | null
          organization_id: string | null
          total_tenders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_prediction: {
        Row: {
          matched: number | null
          organization_id: string | null
          predicted_readiness: number | null
          tender_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_readiness: {
        Row: {
          expired: number | null
          matched: number | null
          missing: number | null
          organization_id: string | null
          readiness_percentage: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_summary: {
        Row: {
          analysis_status: string | null
          analyzed_at: string | null
          created_at: string | null
          id: string | null
          organization_id: string | null
          title: string | null
        }
        Insert: {
          analysis_status?: string | null
          analyzed_at?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          title?: string | null
        }
        Update: {
          analysis_status?: string | null
          analyzed_at?: string | null
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_renewals: {
        Row: {
          days_remaining: number | null
          document_name: string | null
          document_type: string | null
          expiry_date: string | null
          organization_id: string | null
        }
        Insert: {
          days_remaining?: never
          document_name?: string | null
          document_type?: string | null
          expiry_date?: string | null
          organization_id?: string | null
        }
        Update: {
          days_remaining?: never
          document_name?: string | null
          document_type?: string | null
          expiry_date?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_document_reminders: {
        Row: {
          days_remaining: number | null
          document_name: string | null
          document_type: string | null
          expiry_date: string | null
          id: string | null
          reminder_level: string | null
        }
        Insert: {
          days_remaining?: never
          document_name?: string | null
          document_type?: string | null
          expiry_date?: string | null
          id?: string | null
          reminder_level?: never
        }
        Update: {
          days_remaining?: never
          document_name?: string | null
          document_type?: string | null
          expiry_date?: string | null
          id?: string | null
          reminder_level?: never
        }
        Relationships: []
      }
      vw_expiring_documents: {
        Row: {
          days_remaining: number | null
          document_name: string | null
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          id: string | null
          organization_id: string | null
        }
        Insert: {
          days_remaining?: never
          document_name?: string | null
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          document_type?: string | null
          expiry_date?: string | null
          id?: string | null
          organization_id?: string | null
        }
        Update: {
          days_remaining?: never
          document_name?: string | null
          document_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
          document_type?: string | null
          expiry_date?: string | null
          id?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_missing_requirements: {
        Row: {
          category: string | null
          confidence_score: number | null
          id: string | null
          organization_id: string | null
          requirement_name: string | null
          status: Database["public"]["Enums"]["requirement_status"] | null
          tender_id: string | null
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          id?: string | null
          organization_id?: string | null
          requirement_name?: string | null
          status?: Database["public"]["Enums"]["requirement_status"] | null
          tender_id?: string | null
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          id?: string | null
          organization_id?: string | null
          requirement_name?: string | null
          status?: Database["public"]["Enums"]["requirement_status"] | null
          tender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tender_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "vw_tender_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_tender_dashboard: {
        Row: {
          analysis_status: string | null
          compliance_percentage: number | null
          created_at: string | null
          id: string | null
          lot_number: string | null
          organization_id: string | null
          procuring_entity: string | null
          requires_affidavit: boolean | null
          requires_bank_reference: boolean | null
          requires_bid_security: boolean | null
          status: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline: string | null
          title: string | null
        }
        Insert: {
          analysis_status?: string | null
          compliance_percentage?: number | null
          created_at?: string | null
          id?: string | null
          lot_number?: string | null
          organization_id?: string | null
          procuring_entity?: string | null
          requires_affidavit?: boolean | null
          requires_bank_reference?: boolean | null
          requires_bid_security?: boolean | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          title?: string | null
        }
        Update: {
          analysis_status?: string | null
          compliance_percentage?: number | null
          created_at?: string | null
          id?: string | null
          lot_number?: string | null
          organization_id?: string | null
          procuring_entity?: string | null
          requires_affidavit?: boolean | null
          requires_bank_reference?: boolean | null
          requires_bid_security?: boolean | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_health_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "company_profile_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      active_tender_count: { Args: never; Returns: number }
      calculate_company_completion: { Args: { p_org: string }; Returns: number }
      calculate_company_score: { Args: { p_org: string }; Returns: number }
      calculate_tender_compliance: {
        Args: { p_tender_id: string }
        Returns: number
      }
      check_duplicate_document: {
        Args: { p_hash: string; p_org: string }
        Returns: boolean
      }
      current_organization_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      current_role_id: { Args: never; Returns: string }
      document_exists: { Args: { p_sha256_hash: string }; Returns: boolean }
      expiring_document_count: {
        Args: { days_ahead?: number }
        Returns: number
      }
      fail_document: { Args: { p_document: string }; Returns: boolean }
      get_corporate_score: { Args: { p_org: string }; Returns: number }
      get_dashboard_summary: {
        Args: { p_org: string }
        Returns: {
          active_tenders: number
          documents: number
          expiring_documents: number
          generated_documents: number
        }[]
      }
      get_document: {
        Args: { p_document: string }
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          category: string
          document_name: string
          document_status: string
          document_type: string
          expiry_date: string
          id: string
          organization_id: string
        }[]
      }
      get_documents_by_category: {
        Args: { p_category: string }
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          company_id: string
          created_at: string
          deleted_at: string | null
          document_name: string
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_filename: string | null
          sha256_hash: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          version: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_documents_for_review: {
        Args: never
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          company_id: string
          created_at: string
          deleted_at: string | null
          document_name: string
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_filename: string | null
          sha256_hash: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          version: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_expired_documents: {
        Args: never
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          company_id: string
          created_at: string
          deleted_at: string | null
          document_name: string
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_filename: string | null
          sha256_hash: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          version: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_expiring_documents:
        | {
            Args: { days_ahead?: number }
            Returns: {
              analysis_json: Json
              analysis_status: Database["public"]["Enums"]["document_analysis_status"]
              behavior: Database["public"]["Enums"]["document_behavior"]
              category: string
              company_id: string
              created_at: string
              deleted_at: string | null
              document_name: string
              document_status:
                | Database["public"]["Enums"]["document_status"]
                | null
              document_type: string | null
              expiry_date: string | null
              file_size: number | null
              id: string
              issue_date: string | null
              mime_type: string | null
              notes: string | null
              organization_id: string
              original_filename: string | null
              sha256_hash: string
              storage_path: string
              updated_at: string
              uploaded_by: string | null
              verified_at: string | null
              version: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "company_documents"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_days?: number; p_org: string }
            Returns: {
              days_remaining: number
              document_name: string
              document_type: string
              expiry_date: string
              id: string
            }[]
          }
      get_organization_dashboard_stats: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_pending_analysis: {
        Args: never
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          company_id: string
          created_at: string
          deleted_at: string | null
          document_name: string
          document_status: Database["public"]["Enums"]["document_status"] | null
          document_type: string | null
          expiry_date: string | null
          file_size: number | null
          id: string
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          original_filename: string | null
          sha256_hash: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          version: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_tender_summary: { Args: { p_tender: string }; Returns: Json }
      get_upcoming_expiries: {
        Args: { p_org: string }
        Returns: {
          category: string
          days_remaining: number
          document_name: string
          document_type: string
          expiry_date: string
        }[]
      }
      is_org_member: { Args: { org: string }; Returns: boolean }
      is_org_owner: { Args: { org: string }; Returns: boolean }
      mark_tender_analysis_failed: {
        Args: { p_error: string; p_tender_id: string }
        Returns: undefined
      }
      mark_tender_analyzed:
        | {
            Args: { p_analysis: Json; p_tender_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_analysis_json: Json
              p_procuring_entity: string
              p_requirements: Json
              p_submission_deadline: string
              p_tender_id: string
            }
            Returns: undefined
          }
      normalize_requirement: {
        Args: { p_requirement: string }
        Returns: string
      }
      organization_document_count: { Args: never; Returns: number }
      register_document_upload: {
        Args: {
          p_category: string
          p_company_id: string
          p_document_name: string
          p_document_type: string
          p_file_size: number
          p_mime_type: string
          p_original_filename: string
          p_sha256_hash: string
          p_storage_path: string
        }
        Returns: string
      }
      supersede_existing_document: {
        Args: { p_document_type: string }
        Returns: number
      }
      verified_document_count: { Args: never; Returns: number }
      verify_document: { Args: { p_document: string }; Returns: boolean }
    }
    Enums: {
      document_analysis_status:
        | "pending"
        | "processing"
        | "analyzed"
        | "failed"
        | "requires_review"
        | "verified"
      document_behavior:
        | "permanent"
        | "renewable"
        | "tender_specific"
        | "generated"
      document_status: "active" | "expired" | "superseded" | "archived"
      organization_type:
        | "company"
        | "school"
        | "church"
        | "government"
        | "ngo"
        | "personal"
      record_status: "active" | "inactive" | "suspended" | "deleted"
      requirement_source: "ai_extracted" | "user_created" | "user_edited"
      requirement_status:
        | "pending"
        | "matched"
        | "missing"
        | "expired"
        | "manual_review"
      tender_status: "draft" | "active" | "submitted" | "cancelled" | "archived"
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
      document_analysis_status: [
        "pending",
        "processing",
        "analyzed",
        "failed",
        "requires_review",
        "verified",
      ],
      document_behavior: [
        "permanent",
        "renewable",
        "tender_specific",
        "generated",
      ],
      document_status: ["active", "expired", "superseded", "archived"],
      organization_type: [
        "company",
        "school",
        "church",
        "government",
        "ngo",
        "personal",
      ],
      record_status: ["active", "inactive", "suspended", "deleted"],
      requirement_source: ["ai_extracted", "user_created", "user_edited"],
      requirement_status: [
        "pending",
        "matched",
        "missing",
        "expired",
        "manual_review",
      ],
      tender_status: ["draft", "active", "submitted", "cancelled", "archived"],
    },
  },
} as const
