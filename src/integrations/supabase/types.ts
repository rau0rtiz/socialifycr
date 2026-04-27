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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          framework_id: string
          id: string
          name: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          framework_id: string
          id?: string
          name: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          framework_id?: string
          id?: string
          name?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "ad_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_framework_dimensions: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          dimension_type: string
          framework_id: string
          id: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          dimension_type: string
          framework_id: string
          id?: string
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          dimension_type?: string
          framework_id?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_framework_dimensions_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "ad_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_frameworks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_variants: {
        Row: {
          angle_id: string
          assets: Json
          assigned_to: string | null
          campaign_id: string
          copy: string | null
          created_at: string
          cta: string | null
          format_id: string
          hook_id: string
          hook_text: string | null
          id: string
          notes: string | null
          script: string | null
          status: string
          updated_at: string
        }
        Insert: {
          angle_id: string
          assets?: Json
          assigned_to?: string | null
          campaign_id: string
          copy?: string | null
          created_at?: string
          cta?: string | null
          format_id: string
          hook_id: string
          hook_text?: string | null
          id?: string
          notes?: string | null
          script?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          angle_id?: string
          assets?: Json
          assigned_to?: string | null
          campaign_id?: string
          copy?: string | null
          created_at?: string
          cta?: string | null
          format_id?: string
          hook_id?: string
          hook_text?: string | null
          id?: string
          notes?: string | null
          script?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_variants_angle_id_fkey"
            columns: ["angle_id"]
            isOneToOne: false
            referencedRelation: "ad_framework_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_variants_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "ad_framework_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_variants_hook_id_fkey"
            columns: ["hook_id"]
            isOneToOne: false
            referencedRelation: "ad_framework_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_stories: {
        Row: {
          captured_at: string
          client_id: string
          created_at: string | null
          exits: number | null
          id: string
          impressions: number | null
          media_type: string | null
          media_url: string | null
          permalink: string | null
          reach: number | null
          replies: number | null
          scanned_data: Json | null
          story_id: string
          taps_back: number | null
          taps_forward: number | null
          thumbnail_url: string | null
          timestamp: string
        }
        Insert: {
          captured_at?: string
          client_id: string
          created_at?: string | null
          exits?: number | null
          id?: string
          impressions?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          reach?: number | null
          replies?: number | null
          scanned_data?: Json | null
          story_id: string
          taps_back?: number | null
          taps_forward?: number | null
          thumbnail_url?: string | null
          timestamp: string
        }
        Update: {
          captured_at?: string
          client_id?: string
          created_at?: string | null
          exits?: number | null
          id?: string
          impressions?: number | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          reach?: number | null
          replies?: number | null
          scanned_data?: Json | null
          story_id?: string
          taps_back?: number | null
          taps_forward?: number | null
          thumbnail_url?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_stories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          class_date: string
          client_id: string
          created_at: string
          group_id: string | null
          id: string
          marked_by: string | null
          notes: string | null
          status: string
          student_contact_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          class_date: string
          client_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_contact_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          class_date?: string
          client_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_contact_id_fkey"
            columns: ["student_contact_id"]
            isOneToOne: false
            referencedRelation: "student_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_goals: {
        Row: {
          action_type: string | null
          campaign_id: string
          client_id: string
          created_at: string | null
          goal_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          campaign_id: string
          client_id: string
          created_at?: string | null
          goal_type: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          campaign_id?: string
          client_id?: string
          created_at?: string | null
          goal_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_group_members: {
        Row: {
          enrolled_at: string
          group_id: string
          id: string
          sale_id: string | null
          status: string
          student_contact_id: string
        }
        Insert: {
          enrolled_at?: string
          group_id: string
          id?: string
          sale_id?: string | null
          status?: string
          student_contact_id: string
        }
        Update: {
          enrolled_at?: string
          group_id?: string
          id?: string
          sale_id?: string | null
          status?: string
          student_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_group_members_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "message_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_group_members_student_contact_id_fkey"
            columns: ["student_contact_id"]
            isOneToOne: false
            referencedRelation: "student_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_groups: {
        Row: {
          age_range_max: number | null
          age_range_min: number | null
          capacity: number
          classroom: string | null
          client_id: string
          created_at: string
          english_level: string | null
          id: string
          name: string
          product_id: string
          schedules: Json
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          age_range_max?: number | null
          age_range_min?: number | null
          capacity?: number
          classroom?: string | null
          client_id: string
          created_at?: string
          english_level?: string | null
          id?: string
          name: string
          product_id: string
          schedules?: Json
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          age_range_max?: number | null
          age_range_min?: number | null
          capacity?: number
          classroom?: string | null
          client_id?: string
          created_at?: string
          english_level?: string | null
          id?: string
          name?: string
          product_id?: string
          schedules?: Json
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "client_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_closers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_closers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_competitors: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          display_name: string | null
          id: string
          notes: string | null
          platform: string
          profile_url: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id?: string
          notes?: string | null
          platform: string
          profile_url?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id?: string
          notes?: string | null
          platform?: string
          profile_url?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_competitors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feature_flags: {
        Row: {
          ad_sales_ranking: boolean
          ai_insights: boolean
          ai_report_generator: boolean
          asistencia_section: boolean
          business_setup_section: boolean
          campaigns: boolean
          checklist_items: Json
          client_id: string
          closure_rate: boolean
          collections: boolean
          competitors: boolean
          contenido_section: boolean
          content_calendar: boolean
          content_grid: boolean
          created_at: string | null
          dashboard: boolean
          email_marketing_section: boolean
          funnel: boolean
          generador_pauta: boolean
          giveaway: boolean
          id: string
          instagram_posts: boolean
          lead_source: boolean
          monthly_sales_report: boolean
          pipeline_summary: boolean
          publication_goals: boolean
          reach_chart: boolean
          reportes_section: boolean
          reservations_widget: boolean
          sales_by_brand: boolean
          sales_by_product: boolean
          sales_goal: boolean
          sales_tracking: boolean
          setter_checklist: boolean
          setter_daily: boolean
          setter_tracker: boolean
          social_followers: boolean
          social_performance: boolean
          social_performance_report: boolean
          stories_section: boolean
          story_revenue_tracker: boolean
          story_store: boolean
          updated_at: string | null
          ventas_section: boolean
          video_ideas: boolean
          whatsapp_conversations: boolean
          youtube_videos: boolean
        }
        Insert: {
          ad_sales_ranking?: boolean
          ai_insights?: boolean
          ai_report_generator?: boolean
          asistencia_section?: boolean
          business_setup_section?: boolean
          campaigns?: boolean
          checklist_items?: Json
          client_id: string
          closure_rate?: boolean
          collections?: boolean
          competitors?: boolean
          contenido_section?: boolean
          content_calendar?: boolean
          content_grid?: boolean
          created_at?: string | null
          dashboard?: boolean
          email_marketing_section?: boolean
          funnel?: boolean
          generador_pauta?: boolean
          giveaway?: boolean
          id?: string
          instagram_posts?: boolean
          lead_source?: boolean
          monthly_sales_report?: boolean
          pipeline_summary?: boolean
          publication_goals?: boolean
          reach_chart?: boolean
          reportes_section?: boolean
          reservations_widget?: boolean
          sales_by_brand?: boolean
          sales_by_product?: boolean
          sales_goal?: boolean
          sales_tracking?: boolean
          setter_checklist?: boolean
          setter_daily?: boolean
          setter_tracker?: boolean
          social_followers?: boolean
          social_performance?: boolean
          social_performance_report?: boolean
          stories_section?: boolean
          story_revenue_tracker?: boolean
          story_store?: boolean
          updated_at?: string | null
          ventas_section?: boolean
          video_ideas?: boolean
          whatsapp_conversations?: boolean
          youtube_videos?: boolean
        }
        Update: {
          ad_sales_ranking?: boolean
          ai_insights?: boolean
          ai_report_generator?: boolean
          asistencia_section?: boolean
          business_setup_section?: boolean
          campaigns?: boolean
          checklist_items?: Json
          client_id?: string
          closure_rate?: boolean
          collections?: boolean
          competitors?: boolean
          contenido_section?: boolean
          content_calendar?: boolean
          content_grid?: boolean
          created_at?: string | null
          dashboard?: boolean
          email_marketing_section?: boolean
          funnel?: boolean
          generador_pauta?: boolean
          giveaway?: boolean
          id?: string
          instagram_posts?: boolean
          lead_source?: boolean
          monthly_sales_report?: boolean
          pipeline_summary?: boolean
          publication_goals?: boolean
          reach_chart?: boolean
          reportes_section?: boolean
          reservations_widget?: boolean
          sales_by_brand?: boolean
          sales_by_product?: boolean
          sales_goal?: boolean
          sales_tracking?: boolean
          setter_checklist?: boolean
          setter_daily?: boolean
          setter_tracker?: boolean
          social_followers?: boolean
          social_performance?: boolean
          social_performance_report?: boolean
          stories_section?: boolean
          story_revenue_tracker?: boolean
          story_store?: boolean
          updated_at?: string | null
          ventas_section?: boolean
          video_ideas?: boolean
          whatsapp_conversations?: boolean
          youtube_videos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_feature_flags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invitee_name: string | null
          role: Database["public"]["Enums"]["client_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invitee_name?: string | null
          role?: Database["public"]["Enums"]["client_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_name?: string | null
          role?: Database["public"]["Enums"]["client_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_product_categories: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_product_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_product_tags: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_product_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_products: {
        Row: {
          audience: string | null
          available_schedules: Json | null
          category: string | null
          class_frequency: Json | null
          client_id: string
          cost: number | null
          created_at: string
          currency: string
          description: string | null
          estimated_duration_min: number | null
          id: string
          is_recurring: boolean | null
          low_stock_threshold: number
          name: string
          photo_url: string | null
          price: number | null
          product_type: string
          stock_quantity: number
          stock_unit: string | null
          tax_applicable: boolean | null
          tax_rate: number | null
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          audience?: string | null
          available_schedules?: Json | null
          category?: string | null
          class_frequency?: Json | null
          client_id: string
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          estimated_duration_min?: number | null
          id?: string
          is_recurring?: boolean | null
          low_stock_threshold?: number
          name: string
          photo_url?: string | null
          price?: number | null
          product_type?: string
          stock_quantity?: number
          stock_unit?: string | null
          tax_applicable?: boolean | null
          tax_rate?: number | null
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          audience?: string | null
          available_schedules?: Json | null
          category?: string | null
          class_frequency?: Json | null
          client_id?: string
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          estimated_duration_min?: number | null
          id?: string
          is_recurring?: boolean | null
          low_stock_threshold?: number
          name?: string
          photo_url?: string | null
          price?: number | null
          product_type?: string
          stock_quantity?: number
          stock_unit?: string | null
          tax_applicable?: boolean | null
          tax_rate?: number | null
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_setters: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_setters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          plan_id: string
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          plan_id: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          plan_id?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_teachers: {
        Row: {
          audience_types: string[] | null
          available_schedules: Json | null
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          product_ids: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          audience_types?: string[] | null
          available_schedules?: Json | null
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          product_ids?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience_types?: string[] | null
          available_schedules?: Json | null
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          product_ids?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_teachers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_members: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["client_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["client_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["client_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accent_color: string | null
          ai_context: string | null
          banner_url: string | null
          created_at: string | null
          default_campaign_goal: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          preferred_region: string | null
          primary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          ai_context?: string | null
          banner_url?: string | null
          created_at?: string | null
          default_campaign_goal?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          preferred_region?: string | null
          primary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          ai_context?: string | null
          banner_url?: string | null
          created_at?: string | null
          default_campaign_goal?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          preferred_region?: string | null
          primary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      closer_commissions: {
        Row: {
          base_rate: number
          client_id: string
          closer_manual_id: string | null
          closer_name: string
          closer_user_id: string | null
          created_at: string
          currency: string
          earned_amount: number
          effective_rate: number
          full_payment_bonus: boolean
          id: string
          method_adjustment: number
          notes: string | null
          paid_amount: number
          payment_method: string | null
          sale_id: string
          sale_total: number
          status: string
          total_commission: number
          updated_at: string
        }
        Insert: {
          base_rate?: number
          client_id: string
          closer_manual_id?: string | null
          closer_name: string
          closer_user_id?: string | null
          created_at?: string
          currency?: string
          earned_amount?: number
          effective_rate: number
          full_payment_bonus?: boolean
          id?: string
          method_adjustment?: number
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          sale_id: string
          sale_total: number
          status?: string
          total_commission: number
          updated_at?: string
        }
        Update: {
          base_rate?: number
          client_id?: string
          closer_manual_id?: string | null
          closer_name?: string
          closer_user_id?: string | null
          created_at?: string
          currency?: string
          earned_amount?: number
          effective_rate?: number
          full_payment_bonus?: boolean
          id?: string
          method_adjustment?: number
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          sale_id?: string
          sale_total?: number
          status?: string
          total_commission?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closer_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closer_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "message_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payout_items: {
        Row: {
          amount_applied: number
          commission_id: string
          created_at: string
          id: string
          payout_id: string
        }
        Insert: {
          amount_applied: number
          commission_id: string
          created_at?: string
          id?: string
          payout_id: string
        }
        Update: {
          amount_applied?: number
          commission_id?: string
          created_at?: string
          id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payout_items_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "closer_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "commission_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          amount: number
          client_id: string
          closer_manual_id: string | null
          closer_name: string
          closer_user_id: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          closer_manual_id?: string | null
          closer_name: string
          closer_user_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          closer_manual_id?: string | null
          closer_name?: string
          closer_user_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metadata: {
        Row: {
          client_id: string
          created_at: string | null
          first_48h_captured_at: string | null
          first_48h_comments: number | null
          first_48h_likes: number | null
          first_48h_saves: number | null
          first_48h_shares: number | null
          first_48h_views: number | null
          id: string
          model_id: string | null
          post_id: string
          tag_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          first_48h_captured_at?: string | null
          first_48h_comments?: number | null
          first_48h_likes?: number | null
          first_48h_saves?: number | null
          first_48h_shares?: number | null
          first_48h_views?: number | null
          id?: string
          model_id?: string | null
          post_id: string
          tag_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          first_48h_captured_at?: string | null
          first_48h_comments?: number | null
          first_48h_likes?: number | null
          first_48h_saves?: number | null
          first_48h_shares?: number | null
          first_48h_views?: number | null
          id?: string
          model_id?: string | null
          post_id?: string
          tag_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_metadata_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "content_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metadata_models: {
        Row: {
          created_at: string
          id: string
          metadata_id: string
          model_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_id: string
          model_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata_id?: string
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_metadata_models_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "content_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "content_models"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metadata_tags: {
        Row: {
          created_at: string
          id: string
          metadata_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_metadata_tags_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "content_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_metadata_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_models: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_models_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          client_id: string
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          client_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crosspost_links: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          linked_post_id: string
          primary_post_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_post_id: string
          primary_post_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_post_id?: string
          primary_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crosspost_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          addresses: Json
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          garment_sizes: string[] | null
          id: string
          id_number: string | null
          last_name: string | null
          last_purchase_at: string | null
          notes: string | null
          phone: string | null
          preferred_brands: string[] | null
          total_purchases: number | null
          updated_at: string
        }
        Insert: {
          addresses?: Json
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          garment_sizes?: string[] | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_brands?: string[] | null
          total_purchases?: number | null
          updated_at?: string
        }
        Update: {
          addresses?: Json
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          garment_sizes?: string[] | null
          id?: string
          id_number?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_brands?: string[] | null
          total_purchases?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_story_tracker: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string
          currency: string
          daily_revenue: number
          id: string
          notes: string | null
          stories_count: number
          track_date: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          daily_revenue?: number
          id?: string
          notes?: string | null
          stories_count?: number
          track_date: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          daily_revenue?: number
          id?: string
          notes?: string | null
          stories_count?: number
          track_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_story_tracker_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          from_email: string
          from_name: string
          html_content: string
          id: string
          name: string
          recipients_snapshot: Json | null
          scheduled_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          target_tags: string[] | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          name: string
          recipients_snapshot?: Json | null
          scheduled_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          target_tags?: string[] | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          name?: string
          recipients_snapshot?: Json | null
          scheduled_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          target_tags?: string[] | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          status: string
          subscribed_at: string | null
          tags: string[] | null
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_logs: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string | null
          error_message: string | null
          id: string
          resend_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          name: string
          slug: string
          status: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          name: string
          slug: string
          status?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      funnel_leads: {
        Row: {
          answers: Json | null
          business_level: number
          calendly_clicked: boolean
          challenge: string | null
          created_at: string
          email: string
          funnel_id: string | null
          id: string
          industry: string | null
          name: string
          phone: string | null
          revenue_range: string | null
          team_size: string | null
        }
        Insert: {
          answers?: Json | null
          business_level: number
          calendly_clicked?: boolean
          challenge?: string | null
          created_at?: string
          email: string
          funnel_id?: string | null
          id?: string
          industry?: string | null
          name: string
          phone?: string | null
          revenue_range?: string | null
          team_size?: string | null
        }
        Update: {
          answers?: Json | null
          business_level?: number
          calendly_clicked?: boolean
          challenge?: string | null
          created_at?: string
          email?: string
          funnel_id?: string | null
          id?: string
          industry?: string | null
          name?: string
          phone?: string | null
          revenue_range?: string | null
          team_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          public_path: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          public_path?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          public_path?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_reservations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deposit_amount: number
          expires_at: string
          id: string
          lead_id: string | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          reserved_at: string
          sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number
          expires_at: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          reserved_at?: string
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number
          expires_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          reserved_at?: string
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_sales: {
        Row: {
          ad_campaign_id: string | null
          ad_campaign_name: string | null
          ad_id: string | null
          ad_name: string | null
          amount: number
          assigned_schedule: Json | null
          brand: string | null
          client_id: string
          closer_name: string | null
          created_at: string | null
          created_by: string
          currency: string
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          discount_reason: string | null
          garment_size: string | null
          group_id: string | null
          id: string
          installment_amount: number | null
          installments_paid: number | null
          message_platform: string | null
          notes: string | null
          num_installments: number | null
          payment_day: number | null
          payment_method: string | null
          payment_scheme_id: string | null
          product: string | null
          sale_date: string
          source: string
          status: string
          story_id: string | null
          student_contact_id: string | null
          subtotal: number | null
          tax_amount: number | null
          teacher_id: string | null
          total_sale_amount: number | null
          updated_at: string | null
        }
        Insert: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          amount: number
          assigned_schedule?: Json | null
          brand?: string | null
          client_id: string
          closer_name?: string | null
          created_at?: string | null
          created_by: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          garment_size?: string | null
          group_id?: string | null
          id?: string
          installment_amount?: number | null
          installments_paid?: number | null
          message_platform?: string | null
          notes?: string | null
          num_installments?: number | null
          payment_day?: number | null
          payment_method?: string | null
          payment_scheme_id?: string | null
          product?: string | null
          sale_date?: string
          source: string
          status?: string
          story_id?: string | null
          student_contact_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          teacher_id?: string | null
          total_sale_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          amount?: number
          assigned_schedule?: Json | null
          brand?: string | null
          client_id?: string
          closer_name?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          garment_size?: string | null
          group_id?: string | null
          id?: string
          installment_amount?: number | null
          installments_paid?: number | null
          message_platform?: string | null
          notes?: string | null
          num_installments?: number | null
          payment_day?: number | null
          payment_method?: string | null
          payment_scheme_id?: string | null
          product?: string | null
          sale_date?: string
          source?: string
          status?: string
          story_id?: string | null
          student_contact_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          teacher_id?: string | null
          total_sale_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sales_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sales_payment_scheme_id_fkey"
            columns: ["payment_scheme_id"]
            isOneToOne: false
            referencedRelation: "product_payment_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sales_student_contact_id_fkey"
            columns: ["student_contact_id"]
            isOneToOne: false
            referencedRelation: "student_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sales_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "client_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_collections: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_at: string | null
          payment_frequency: string
          sale_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_at?: string | null
          payment_frequency?: string
          sale_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_at?: string | null
          payment_frequency?: string
          sale_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collections_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "message_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          error_message: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_response: Json | null
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_response?: Json | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_response?: Json | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string | null
          ad_account_id: string | null
          client_id: string
          connected_by: string | null
          created_at: string | null
          id: string
          instagram_account_id: string | null
          permissions: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_page_id: string | null
          platform_page_name: string | null
          platform_user_id: string | null
          refresh_token: string | null
          status: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          ad_account_id?: string | null
          client_id: string
          connected_by?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          permissions?: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_page_id?: string | null
          platform_page_name?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          ad_account_id?: string | null
          client_id?: string
          connected_by?: string | null
          created_at?: string | null
          id?: string
          instagram_account_id?: string | null
          permissions?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_page_id?: string | null
          platform_page_name?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      product_payment_schemes: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          id: string
          installment_amount: number
          name: string
          num_installments: number
          product_id: string
          sort_order: number
          total_price: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          installment_amount?: number
          name: string
          num_installments?: number
          product_id: string
          sort_order?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          installment_amount?: number
          name?: string
          num_installments?: number
          product_id?: string
          sort_order?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_payment_schemes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_payment_schemes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          client_id: string
          currency: string
          id: string
          new_cost: number | null
          new_price: number | null
          old_cost: number | null
          old_price: number | null
          product_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          client_id: string
          currency?: string
          id?: string
          new_cost?: number | null
          new_price?: number | null
          old_cost?: number | null
          old_price?: number | null
          product_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          client_id?: string
          currency?: string
          id?: string
          new_cost?: number | null
          new_price?: number | null
          old_cost?: number | null
          old_price?: number | null
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_movements: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string
          quantity: number
          reason: string | null
          resulting_stock: number
          sale_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id: string
          quantity: number
          reason?: string | null
          resulting_stock: number
          sale_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          resulting_stock?: number
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_assignments: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "client_product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      publication_goals: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          month: string
          target_posts: number
          target_reach: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          month: string
          target_posts?: number
          target_reach?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          month?: string
          target_posts?: number
          target_reach?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          currency: string
          end_date: string
          id: string
          start_date: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          currency?: string
          end_date: string
          id?: string
          start_date?: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          end_date?: string
          id?: string
          start_date?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          prompt: string
          template_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          prompt: string
          template_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          prompt?: string
          template_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_emails: {
        Row: {
          attachments_meta: Json | null
          client_id: string | null
          created_at: string
          error_message: string | null
          html_content: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          parent_email_id: string | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_by: string | null
          source: string
          status: string
          subject: string
        }
        Insert: {
          attachments_meta?: Json | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          parent_email_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_by?: string | null
          source?: string
          status?: string
          subject: string
        }
        Update: {
          attachments_meta?: Json | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          parent_email_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_by?: string | null
          source?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_parent_email_id_fkey"
            columns: ["parent_email_id"]
            isOneToOne: false
            referencedRelation: "sent_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_appointments: {
        Row: {
          ad_campaign_id: string | null
          ad_campaign_name: string | null
          ad_id: string | null
          ad_name: string | null
          appointment_date: string
          checklist_quiz: boolean
          checklist_responses: Json
          checklist_testimonials: boolean
          checklist_video: boolean
          checklist_whatsapp: boolean
          client_id: string
          created_at: string | null
          created_by: string
          currency: string
          estimated_value: number | null
          id: string
          lead_context: string | null
          lead_email: string | null
          lead_goal: string | null
          lead_name: string
          lead_phone: string | null
          not_sold_reason: string | null
          notes: string | null
          product: string | null
          sale_id: string | null
          sales_call_date: string | null
          setter_name: string | null
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          appointment_date: string
          checklist_quiz?: boolean
          checklist_responses?: Json
          checklist_testimonials?: boolean
          checklist_video?: boolean
          checklist_whatsapp?: boolean
          client_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          estimated_value?: number | null
          id?: string
          lead_context?: string | null
          lead_email?: string | null
          lead_goal?: string | null
          lead_name: string
          lead_phone?: string | null
          not_sold_reason?: string | null
          notes?: string | null
          product?: string | null
          sale_id?: string | null
          sales_call_date?: string | null
          setter_name?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          appointment_date?: string
          checklist_quiz?: boolean
          checklist_responses?: Json
          checklist_testimonials?: boolean
          checklist_video?: boolean
          checklist_whatsapp?: boolean
          client_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          estimated_value?: number | null
          id?: string
          lead_context?: string | null
          lead_email?: string | null
          lead_goal?: string | null
          lead_name?: string
          lead_phone?: string | null
          not_sold_reason?: string | null
          notes?: string | null
          product?: string | null
          sale_id?: string | null
          sales_call_date?: string | null
          setter_name?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setter_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_daily_reports: {
        Row: {
          appointments_made: number
          client_id: string
          created_at: string | null
          created_by: string
          day_notes: string | null
          followups: number
          id: string
          ig_conversations: number
          links_sent: number
          report_date: string
          updated_at: string | null
          wa_conversations: number
        }
        Insert: {
          appointments_made?: number
          client_id: string
          created_at?: string | null
          created_by: string
          day_notes?: string | null
          followups?: number
          id?: string
          ig_conversations?: number
          links_sent?: number
          report_date: string
          updated_at?: string | null
          wa_conversations?: number
        }
        Update: {
          appointments_made?: number
          client_id?: string
          created_at?: string | null
          created_by?: string
          day_notes?: string | null
          followups?: number
          id?: string
          ig_conversations?: number
          links_sent?: number
          report_date?: string
          updated_at?: string | null
          wa_conversations?: number
        }
        Relationships: [
          {
            foreignKeyName: "setter_daily_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      student_contacts: {
        Row: {
          age: number | null
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_id_number: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          id_number: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_id_number?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_id_number?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_clients: number | null
          max_users: number | null
          name: string
          price_amount: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_users?: number | null
          name: string
          price_amount: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_users?: number | null
          name?: string
          price_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["system_role"]
          user_id?: string
        }
        Relationships: []
      }
      utm_tracking: {
        Row: {
          campaign_name: string
          client_id: string
          created_at: string
          created_by: string | null
          destination_url: string
          full_url: string
          id: string
          meta_ad_id: string | null
          meta_campaign_id: string | null
          notes: string | null
          updated_at: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
        }
        Insert: {
          campaign_name: string
          client_id: string
          created_at?: string
          created_by?: string | null
          destination_url: string
          full_url: string
          id?: string
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          notes?: string | null
          updated_at?: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
        }
        Update: {
          campaign_name?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          destination_url?: string
          full_url?: string
          id?: string
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          notes?: string | null
          updated_at?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ideas: {
        Row: {
          carousel_slides: Json | null
          client_id: string
          content_type: string | null
          copy_generated_at: string | null
          created_at: string
          description: string | null
          generated_copy: string | null
          id: string
          model_id: string | null
          platform: string
          post_description: string | null
          post_image_url: string | null
          reference_video_url: string | null
          script: string | null
          tag_id: string | null
          thumbnail_url: string | null
          title: string | null
          todos: Json | null
          updated_at: string
          url: string
        }
        Insert: {
          carousel_slides?: Json | null
          client_id: string
          content_type?: string | null
          copy_generated_at?: string | null
          created_at?: string
          description?: string | null
          generated_copy?: string | null
          id?: string
          model_id?: string | null
          platform: string
          post_description?: string | null
          post_image_url?: string | null
          reference_video_url?: string | null
          script?: string | null
          tag_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          todos?: Json | null
          updated_at?: string
          url: string
        }
        Update: {
          carousel_slides?: Json | null
          client_id?: string
          content_type?: string | null
          copy_generated_at?: string | null
          created_at?: string
          description?: string | null
          generated_copy?: string | null
          id?: string
          model_id?: string | null
          platform?: string
          post_description?: string | null
          post_image_url?: string | null
          reference_video_url?: string | null
          script?: string | null
          tag_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          todos?: Json | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_ideas_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "content_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_ideas_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_client_invitation: {
        Args: { _token: string }
        Returns: {
          client_id: string
          role: Database["public"]["Enums"]["client_role"]
        }[]
      }
      can_manage_ad_frameworks: { Args: { _user_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_ad_variants: { Args: { _campaign_id: string }; Returns: number }
      get_client_invitation_public: {
        Args: { _token: string }
        Returns: {
          client_id: string
          client_name: string
          email: string
          invitee_name: string
          role: Database["public"]["Enums"]["client_role"]
        }[]
      }
      get_safe_platform_connections: {
        Args: { _client_id: string }
        Returns: {
          ad_account_id: string
          client_id: string
          connected_by: string
          created_at: string
          id: string
          instagram_account_id: string
          permissions: Json
          platform: string
          platform_page_id: string
          platform_page_name: string
          platform_user_id: string
          status: string
          token_expires_at: string
          updated_at: string
        }[]
      }
      get_team_members_with_activity: {
        Args: { _client_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["client_role"]
          user_id: string
        }[]
      }
      get_users_last_sign_in: {
        Args: { user_ids: string[] }
        Returns: {
          last_sign_in_at: string
          user_id: string
        }[]
      }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_system_role: {
        Args: {
          _role: Database["public"]["Enums"]["system_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_manager: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_higher: { Args: { _user_id: string }; Returns: boolean }
      is_agency_member: { Args: { _user_id: string }; Returns: boolean }
      is_team_member: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      mark_expired_reservations: { Args: never; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sync_mindcoach_commission_from_sale_id: {
        Args: { _sale_id: string }
        Returns: undefined
      }
    }
    Enums: {
      client_role:
        | "account_manager"
        | "editor"
        | "viewer"
        | "media_buyer"
        | "closer"
        | "setter"
      connection_status: "active" | "expired" | "revoked" | "pending"
      payment_provider: "tilopay" | "onvopay" | "bac_compra_click"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      platform_type:
        | "meta"
        | "tiktok"
        | "linkedin"
        | "twitter"
        | "google"
        | "youtube"
      subscription_status:
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
        | "trialing"
      system_role:
        | "owner"
        | "admin"
        | "manager"
        | "analyst"
        | "viewer"
        | "media_buyer"
        | "closer"
        | "setter"
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
      client_role: [
        "account_manager",
        "editor",
        "viewer",
        "media_buyer",
        "closer",
        "setter",
      ],
      connection_status: ["active", "expired", "revoked", "pending"],
      payment_provider: ["tilopay", "onvopay", "bac_compra_click"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      platform_type: [
        "meta",
        "tiktok",
        "linkedin",
        "twitter",
        "google",
        "youtube",
      ],
      subscription_status: [
        "active",
        "past_due",
        "cancelled",
        "expired",
        "trialing",
      ],
      system_role: [
        "owner",
        "admin",
        "manager",
        "analyst",
        "viewer",
        "media_buyer",
        "closer",
        "setter",
      ],
    },
  },
} as const
