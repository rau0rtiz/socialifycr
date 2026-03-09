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
      audit_logs: {
        Row: {
          action: string
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
        Relationships: []
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
          ai_insights: boolean
          campaigns: boolean
          client_id: string
          competitors: boolean
          contenido_section: boolean
          content_grid: boolean
          created_at: string | null
          dashboard: boolean
          funnel: boolean
          id: string
          instagram_posts: boolean
          monthly_sales_report: boolean
          reportes_section: boolean
          sales_tracking: boolean
          setter_tracker: boolean
          social_followers: boolean
          updated_at: string | null
          ventas_section: boolean
          video_ideas: boolean
          youtube_videos: boolean
        }
        Insert: {
          ai_insights?: boolean
          campaigns?: boolean
          client_id: string
          competitors?: boolean
          contenido_section?: boolean
          content_grid?: boolean
          created_at?: string | null
          dashboard?: boolean
          funnel?: boolean
          id?: string
          instagram_posts?: boolean
          monthly_sales_report?: boolean
          reportes_section?: boolean
          sales_tracking?: boolean
          setter_tracker?: boolean
          social_followers?: boolean
          updated_at?: string | null
          ventas_section?: boolean
          video_ideas?: boolean
          youtube_videos?: boolean
        }
        Update: {
          ai_insights?: boolean
          campaigns?: boolean
          client_id?: string
          competitors?: boolean
          contenido_section?: boolean
          content_grid?: boolean
          created_at?: string | null
          dashboard?: boolean
          funnel?: boolean
          id?: string
          instagram_posts?: boolean
          monthly_sales_report?: boolean
          reportes_section?: boolean
          sales_tracking?: boolean
          setter_tracker?: boolean
          social_followers?: boolean
          updated_at?: string | null
          ventas_section?: boolean
          video_ideas?: boolean
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
      message_sales: {
        Row: {
          ad_campaign_id: string | null
          ad_campaign_name: string | null
          ad_id: string | null
          ad_name: string | null
          amount: number
          client_id: string
          created_at: string | null
          created_by: string
          currency: string
          customer_name: string | null
          id: string
          message_platform: string | null
          notes: string | null
          product: string | null
          sale_date: string
          source: string
          status: string
          updated_at: string | null
        }
        Insert: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          amount: number
          client_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          customer_name?: string | null
          id?: string
          message_platform?: string | null
          notes?: string | null
          product?: string | null
          sale_date?: string
          source: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          ad_campaign_id?: string | null
          ad_campaign_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          amount?: number
          client_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          customer_name?: string | null
          id?: string
          message_platform?: string | null
          notes?: string | null
          product?: string | null
          sale_date?: string
          source?: string
          status?: string
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
      setter_appointments: {
        Row: {
          ad_campaign_id: string | null
          ad_campaign_name: string | null
          ad_id: string | null
          ad_name: string | null
          appointment_date: string
          client_id: string
          created_at: string | null
          created_by: string
          currency: string
          estimated_value: number | null
          id: string
          lead_email: string | null
          lead_goal: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          sale_id: string | null
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
          client_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          estimated_value?: number | null
          id?: string
          lead_email?: string | null
          lead_goal?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          sale_id?: string | null
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
          client_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          estimated_value?: number | null
          id?: string
          lead_email?: string | null
          lead_goal?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          sale_id?: string | null
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
      is_team_member: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      client_role: "account_manager" | "editor" | "viewer"
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
      system_role: "owner" | "admin" | "manager" | "analyst" | "viewer"
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
      client_role: ["account_manager", "editor", "viewer"],
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
      system_role: ["owner", "admin", "manager", "analyst", "viewer"],
    },
  },
} as const
