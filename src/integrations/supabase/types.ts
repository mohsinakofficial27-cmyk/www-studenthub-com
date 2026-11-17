export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          title?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          mode: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          conversation_id: string;
          created_at?: string;
          id: string;
          mode?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          mode?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          count: number;
          day: string;
          user_id: string;
        };
        Insert: {
          count?: number;
          day: string;
          user_id: string;
        };
        Update: {
          count?: number;
          day?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          created_at: string;
          deadline: string | null;
          id: string;
          institution: string;
          kind: string;
          notes: string;
          program: string;
          requirements: Json;
          status: string;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deadline?: string | null;
          id: string;
          institution: string;
          kind: string;
          notes?: string;
          program?: string;
          requirements?: Json;
          status?: string;
          updated_at?: string;
          url?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deadline?: string | null;
          id?: string;
          institution?: string;
          kind?: string;
          notes?: string;
          program?: string;
          requirements?: Json;
          status?: string;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      assignment_rubrics: {
        Row: {
          created_at: string;
          criteria: Json;
          id: string;
          subject: string;
          task_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          criteria?: Json;
          id: string;
          subject?: string;
          task_id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          criteria?: Json;
          id?: string;
          subject?: string;
          task_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budget_entries: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          currency: string;
          date: string;
          description: string;
          id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          currency?: string;
          date?: string;
          description?: string;
          id: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          currency?: string;
          date?: string;
          description?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budget_profiles: {
        Row: {
          currency: string;
          monthly_income: number;
          monthly_limit: number;
          savings_goal: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          currency?: string;
          monthly_income?: number;
          monthly_limit?: number;
          savings_goal?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          currency?: string;
          monthly_income?: number;
          monthly_limit?: number;
          savings_goal?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exam_roadmaps: {
        Row: {
          created_at: string;
          daily_minutes: number;
          exam_date: string;
          exam_title: string;
          id: string;
          subject: string;
          topics: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_minutes?: number;
          exam_date: string;
          exam_title: string;
          id: string;
          subject?: string;
          topics?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          exam_date?: string;
          exam_title?: string;
          id?: string;
          subject?: string;
          topics?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      research_sources: {
        Row: {
          authors: string;
          category: string;
          created_at: string;
          id: string;
          notes: string;
          published_at: string;
          tags: Json;
          title: string;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          authors?: string;
          category?: string;
          created_at?: string;
          id: string;
          notes?: string;
          published_at?: string;
          tags?: Json;
          title: string;
          updated_at?: string;
          url?: string;
          user_id: string;
        };
        Update: {
          authors?: string;
          category?: string;
          created_at?: string;
          id?: string;
          notes?: string;
          published_at?: string;
          tags?: Json;
          title?: string;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          color: string;
          created_at: string;
          credits: number;
          grade: string;
          id: string;
          instructor: string;
          name: string;
          target_grade: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          credits?: number;
          grade?: string;
          id: string;
          instructor?: string;
          name?: string;
          target_grade?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          credits?: number;
          grade?: string;
          id?: string;
          instructor?: string;
          name?: string;
          target_grade?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      feedback: {
        Row: {
          created_at: string;
          fair_price: string;
          id: string;
          issues: string;
          likes: string;
          rating: number;
          user_id: string | null;
          wanted_feature: string;
          would_pay: boolean;
        };
        Insert: {
          created_at?: string;
          fair_price?: string;
          id?: string;
          issues?: string;
          likes?: string;
          rating: number;
          user_id?: string | null;
          wanted_feature?: string;
          would_pay?: boolean;
        };
        Update: {
          created_at?: string;
          fair_price?: string;
          id?: string;
          issues?: string;
          likes?: string;
          rating?: number;
          user_id?: string | null;
          wanted_feature?: string;
          would_pay?: boolean;
        };
        Relationships: [];
      };
      flashcard_decks: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          subject: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name?: string;
          subject?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          subject?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          back: string;
          confidence: string;
          deck_id: string;
          due_date: string;
          ease_factor: number;
          front: string;
          id: string;
          interval_days: number;
          last_reviewed_at: string | null;
          repetitions: number;
          review_count: number;
          user_id: string;
        };
        Insert: {
          back?: string;
          confidence?: string;
          deck_id: string;
          due_date?: string;
          ease_factor?: number;
          front?: string;
          id: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          review_count?: number;
          user_id: string;
        };
        Update: {
          back?: string;
          confidence?: string;
          deck_id?: string;
          due_date?: string;
          ease_factor?: number;
          front?: string;
          id?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          review_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          content: string;
          created_at: string;
          favorite: boolean;
          id: string;
          key_points: Json | null;
          subject: string;
          summary: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          favorite?: boolean;
          id: string;
          key_points?: Json | null;
          subject?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          key_points?: Json | null;
          subject?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id: string;
          kind?: string;
          read?: boolean;
          title?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_color: string;
          daily_hours: number;
          exams: string;
          goals: string;
          grade: string;
          name: string;
          onboarded: boolean;
          subjects: Json;
          user_id: string;
        };
        Insert: {
          avatar_color?: string;
          daily_hours?: number;
          exams?: string;
          goals?: string;
          grade?: string;
          name?: string;
          onboarded?: boolean;
          subjects?: Json;
          user_id: string;
        };
        Update: {
          avatar_color?: string;
          daily_hours?: number;
          exams?: string;
          goals?: string;
          grade?: string;
          name?: string;
          onboarded?: boolean;
          subjects?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          id: string;
          quiz_id: string;
          score: number;
          taken_at: string;
          total: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          id: string;
          quiz_id: string;
          score?: number;
          taken_at?: string;
          total?: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          id?: string;
          quiz_id?: string;
          score?: number;
          taken_at?: string;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          created_at: string;
          difficulty: string;
          id: string;
          questions: Json;
          subject: string;
          topic: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty?: string;
          id: string;
          questions?: Json;
          subject?: string;
          topic?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: string;
          id?: string;
          questions?: Json;
          subject?: string;
          topic?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      site_ratings: {
        Row: {
          created_at: string;
          id: string;
          rating: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          rating: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          rating?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          ended_at: string;
          id: string;
          kind: string;
          minutes: number;
          user_id: string;
        };
        Insert: {
          ended_at?: string;
          id: string;
          kind?: string;
          minutes?: number;
          user_id: string;
        };
        Update: {
          ended_at?: string;
          id?: string;
          kind?: string;
          minutes?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      study_tasks: {
        Row: {
          date: string;
          done: boolean;
          id: string;
          is_exam: boolean;
          minutes: number;
          priority: string;
          subject: string;
          time: string;
          title: string;
          topic: string;
          user_id: string;
        };
        Insert: {
          date?: string;
          done?: boolean;
          id: string;
          is_exam?: boolean;
          minutes?: number;
          priority?: string;
          subject?: string;
          time?: string;
          title?: string;
          topic?: string;
          user_id: string;
        };
        Update: {
          date?: string;
          done?: boolean;
          id?: string;
          is_exam?: boolean;
          minutes?: number;
          priority?: string;
          subject?: string;
          time?: string;
          title?: string;
          topic?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          history: Json;
          mode: string;
          plan: string;
          renews_at: string;
          started_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          history?: Json;
          mode?: string;
          plan?: string;
          renews_at?: string;
          started_at?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          history?: Json;
          mode?: string;
          plan?: string;
          renews_at?: string;
          started_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          country: string;
          date_format: string;
          grading_system: string;
          high_contrast: boolean;
          language: string;
          notify_billing: boolean;
          notify_exams: boolean;
          notify_streak: boolean;
          notify_tasks: boolean;
          reduced_motion: boolean;
          time_format: string;
          time_zone: string;
          user_id: string;
          week_starts_on: number;
        };
        Insert: {
          country?: string;
          date_format?: string;
          grading_system?: string;
          high_contrast?: boolean;
          language?: string;
          notify_billing?: boolean;
          notify_exams?: boolean;
          notify_streak?: boolean;
          notify_tasks?: boolean;
          reduced_motion?: boolean;
          time_format?: string;
          time_zone?: string;
          user_id: string;
          week_starts_on?: number;
        };
        Update: {
          country?: string;
          date_format?: string;
          grading_system?: string;
          high_contrast?: boolean;
          language?: string;
          notify_billing?: boolean;
          notify_exams?: boolean;
          notify_streak?: boolean;
          notify_tasks?: boolean;
          reduced_motion?: boolean;
          time_format?: string;
          time_zone?: string;
          user_id?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      provider_integrations: {
        Row: {
          connected_at: string;
          encrypted_tokens: Json;
          instance_url: string | null;
          last_sync_at: string | null;
          last_sync_error: string | null;
          last_sync_status: "success" | "error" | null;
          preferences: Json;
          provider: string;
          scopes: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          connected_at?: string;
          encrypted_tokens: Json;
          instance_url?: string | null;
          last_sync_at?: string | null;
          last_sync_error?: string | null;
          last_sync_status?: "success" | "error" | null;
          preferences?: Json;
          provider: string;
          scopes?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          connected_at?: string;
          encrypted_tokens?: Json;
          instance_url?: string | null;
          last_sync_at?: string | null;
          last_sync_error?: string | null;
          last_sync_status?: "success" | "error" | null;
          preferences?: Json;
          provider?: string;
          scopes?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      provider_oauth_states: {
        Row: {
          code_verifier: string;
          created_at: string;
          expires_at: string;
          instance_url: string | null;
          provider: string;
          state_hash: string;
          user_id: string;
        };
        Insert: {
          code_verifier: string;
          created_at?: string;
          expires_at: string;
          instance_url?: string | null;
          provider: string;
          state_hash: string;
          user_id: string;
        };
        Update: {
          code_verifier?: string;
          created_at?: string;
          expires_at?: string;
          instance_url?: string | null;
          provider?: string;
          state_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      calendar_event_sync: {
        Row: {
          provider: string;
          remote_event_id: string;
          source_id: string;
          source_kind: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          provider: string;
          remote_event_id: string;
          source_id: string;
          source_kind: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          provider?: string;
          remote_event_id?: string;
          source_id?: string;
          source_kind?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_ai_question: { Args: { _limit: number }; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      record_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
