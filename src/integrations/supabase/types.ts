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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      company_documents: {
        Row: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      procurement_tips: {
        Row: {
          active: boolean | null
          category: string | null
          display_order: number | null
          id: string
          tip: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          display_order?: number | null
          id?: string
          tip: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          display_order?: number | null
          id?: string
          tip?: string
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      tenders: {
        Row: {
          analysis_error: string | null
          analysis_json: Json | null
          analysis_status: string | null
          analyzed_at: string | null
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      active_tender_count: { Args: never; Returns: number }
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
          created_at: string
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
          created_at: string
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
          created_at: string
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
      get_expiring_documents: {
        Args: { days_ahead?: number }
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          created_at: string
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
      get_pending_analysis: {
        Args: never
        Returns: {
          analysis_json: Json
          analysis_status: Database["public"]["Enums"]["document_analysis_status"]
          behavior: Database["public"]["Enums"]["document_behavior"]
          category: string
          created_at: string
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
