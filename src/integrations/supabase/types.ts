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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admission_tracks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_cache: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string
          key: string
          value?: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      chat_usage: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          model: string | null
          tokens_completion: number | null
          tokens_prompt: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          model?: string | null
          tokens_completion?: number | null
          tokens_prompt?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          model?: string | null
          tokens_completion?: number | null
          tokens_prompt?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      colleges: {
        Row: {
          admission_track_id: string | null
          capacity: number | null
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          min_gpa: number | null
          name_ar: string
          name_en: string | null
          notes: string | null
          registration_deadline: string | null
          required_documents: string[] | null
          university_id: string
          updated_at: string
        }
        Insert: {
          admission_track_id?: string | null
          capacity?: number | null
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          min_gpa?: number | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          registration_deadline?: string | null
          required_documents?: string[] | null
          university_id: string
          updated_at?: string
        }
        Update: {
          admission_track_id?: string | null
          capacity?: number | null
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          min_gpa?: number | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          registration_deadline?: string | null
          required_documents?: string[] | null
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_admission_track_id_fkey"
            columns: ["admission_track_id"]
            isOneToOne: false
            referencedRelation: "admission_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colleges_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_logs: {
        Row: {
          created_at: string
          deleted_by: string
          deleted_by_name: string | null
          deleted_user_id: string
          deleted_user_name: string | null
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          deleted_by: string
          deleted_by_name?: string | null
          deleted_user_id: string
          deleted_user_name?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          deleted_by?: string
          deleted_by_name?: string | null
          deleted_user_id?: string
          deleted_user_name?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: string
          major_id: string
          score: number
          started_at: string
          student_id: string
          total: number
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          major_id: string
          score?: number
          started_at?: string
          student_id: string
          total?: number
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          major_id?: string
          score?: number
          started_at?: string
          student_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "mv_leaderboard"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "mv_leaderboard"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lesson_id: string
          rating: number
          student_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          rating: number
          student_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          rating?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "mv_leaderboard"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "lesson_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          college_id: string | null
          content: string
          created_at: string
          display_order: number
          grade_level: number | null
          id: string
          is_free: boolean
          is_published: boolean
          lesson_code: string | null
          major_id: string | null
          presentation_url: string | null
          subject_id: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          content?: string
          created_at?: string
          display_order?: number
          grade_level?: number | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          lesson_code?: string | null
          major_id?: string | null
          presentation_url?: string | null
          subject_id?: string | null
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          content?: string
          created_at?: string
          display_order?: number
          grade_level?: number | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          lesson_code?: string | null
          major_id?: string | null
          presentation_url?: string | null
          subject_id?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      major_subjects: {
        Row: {
          created_at: string
          id: string
          major_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          major_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          major_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "major_subjects_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "major_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      majors: {
        Row: {
          code: string
          college_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          college_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          college_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "majors_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      moderator_scopes: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          scope_id: string | null
          scope_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      past_exam_model_questions: {
        Row: {
          created_at: string
          id: string
          model_id: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_exam_model_questions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "past_exam_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_exam_model_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      past_exam_models: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          is_paid: boolean
          is_published: boolean
          title: string
          track: string | null
          university_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_paid?: boolean
          is_published?: boolean
          title: string
          track?: string | null
          university_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_paid?: boolean
          is_published?: boolean
          title?: string
          track?: string | null
          university_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "past_exam_models_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          barcode_url: string | null
          created_at: string
          details: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          barcode_url?: string | null
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          barcode_url?: string | null
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          duplicate_count: number
          expected_amount: number | null
          extracted_amount: number | null
          extracted_date: string | null
          extracted_reference: string | null
          fraud_status: string
          id: string
          payment_method_id: string | null
          pricing_source: string | null
          pricing_zone: string | null
          promo_code_id: string | null
          receipt_hash: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscription_id: string | null
          university_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          duplicate_count?: number
          expected_amount?: number | null
          extracted_amount?: number | null
          extracted_date?: string | null
          extracted_reference?: string | null
          fraud_status?: string
          id?: string
          payment_method_id?: string | null
          pricing_source?: string | null
          pricing_zone?: string | null
          promo_code_id?: string | null
          receipt_hash?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          university_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          duplicate_count?: number
          expected_amount?: number | null
          extracted_amount?: number | null
          extracted_date?: string | null
          extracted_reference?: string | null
          fraud_status?: string
          id?: string
          payment_method_id?: string | null
          pricing_source?: string | null
          pricing_zone?: string | null
          promo_code_id?: string | null
          receipt_hash?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscription_id?: string | null
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: string
          created_at: string
          display_order: number
          explanation: string
          id: string
          lesson_id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          question_type: string
          subject: string
          updated_at: string
        }
        Insert: {
          correct_option?: string
          created_at?: string
          display_order?: number
          explanation?: string
          id?: string
          lesson_id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          question_type?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          display_order?: number
          explanation?: string
          id?: string
          lesson_id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          question_type?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          college_id: string | null
          coordination_number: string | null
          created_at: string
          first_name: string | null
          fourth_name: string | null
          governorate: string | null
          gpa: number | null
          id: string
          major_id: string | null
          phone: string | null
          second_name: string | null
          third_name: string | null
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          college_id?: string | null
          coordination_number?: string | null
          created_at?: string
          first_name?: string | null
          fourth_name?: string | null
          governorate?: string | null
          gpa?: number | null
          id?: string
          major_id?: string | null
          phone?: string | null
          second_name?: string | null
          third_name?: string | null
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          college_id?: string | null
          coordination_number?: string | null
          created_at?: string
          first_name?: string | null
          fourth_name?: string | null
          governorate?: string | null
          gpa?: number | null
          id?: string
          major_id?: string | null
          phone?: string | null
          second_name?: string | null
          third_name?: string | null
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          allowed_major_ids: string[] | null
          created_at: string
          currency: string
          default_price_zone_a: number
          default_price_zone_b: number
          description: string | null
          discount_zone_a: number
          discount_zone_b: number
          display_order: number
          features: string[] | null
          id: string
          is_active: boolean
          is_free: boolean
          name: string
          price_default: number
          price_zone_a: number
          price_zone_b: number
          slug: string
          updated_at: string
        }
        Insert: {
          allowed_major_ids?: string[] | null
          created_at?: string
          currency?: string
          default_price_zone_a?: number
          default_price_zone_b?: number
          description?: string | null
          discount_zone_a?: number
          discount_zone_b?: number
          display_order?: number
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name: string
          price_default?: number
          price_zone_a?: number
          price_zone_b?: number
          slug: string
          updated_at?: string
        }
        Update: {
          allowed_major_ids?: string[] | null
          created_at?: string
          currency?: string
          default_price_zone_a?: number
          default_price_zone_b?: number
          description?: string | null
          discount_zone_a?: number
          discount_zone_b?: number
          display_order?: number
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name?: string
          price_default?: number
          price_zone_a?: number
          price_zone_b?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_settings: {
        Row: {
          currency: string
          description: string | null
          duration_months: number
          id: string
          price: number
          price_zone_a: number
          price_zone_b: number
          updated_at: string
        }
        Insert: {
          currency?: string
          description?: string | null
          duration_months?: number
          id?: string
          price?: number
          price_zone_a?: number
          price_zone_b?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          description?: string | null
          duration_months?: number
          id?: string
          price?: number
          price_zone_a?: number
          price_zone_b?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string | null
          starts_at: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      track_subjects: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_subjects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "admission_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          code: string
          coordination_instructions: string | null
          coordination_timeline: Json | null
          created_at: string
          display_order: number
          guide_files: Json
          guide_text: string | null
          guide_url: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          pricing_zone: string
          updated_at: string
        }
        Insert: {
          code: string
          coordination_instructions?: string | null
          coordination_timeline?: Json | null
          created_at?: string
          display_order?: number
          guide_files?: Json
          guide_text?: string | null
          guide_url?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          pricing_zone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          coordination_instructions?: string | null
          coordination_timeline?: Json | null
          created_at?: string
          display_order?: number
          guide_files?: Json
          guide_text?: string | null
          guide_url?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          pricing_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_leaderboard: {
        Row: {
          avg_score: number | null
          best_score: number | null
          college_name: string | null
          first_name: string | null
          fourth_name: string | null
          major_id: string | null
          major_name: string | null
          rank: number | null
          student_id: string | null
          total_exams: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_major_id_fkey"
            columns: ["major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_phone_exists: { Args: { _phone: string }; Returns: boolean }
      get_cache: { Args: { _key: string }; Returns: Json }
      get_chat_stats: {
        Args: { _days?: number }
        Returns: {
          daily_breakdown: Json
          today_messages: number
          today_users: number
          total_messages: number
          unique_users: number
        }[]
      }
      get_leaderboard: {
        Args: { _limit?: number; _major_id?: string }
        Returns: {
          avg_score: number
          best_score: number
          college_name: string
          first_name: string
          fourth_name: string
          major_name: string
          rank: number
          student_id: string
          total_exams: number
        }[]
      }
      get_published_lessons_by_college: {
        Args: { _college_id: string }
        Returns: {
          display_order: number
          id: string
          is_free: boolean
          major_id: string
          summary: string
          title: string
        }[]
      }
      get_published_lessons_list: {
        Args: { _major_id: string }
        Returns: {
          display_order: number
          id: string
          is_free: boolean
          major_id: string
          summary: string
          title: string
        }[]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_free_lesson: { Args: { _lesson_id: string }; Returns: boolean }
      refresh_leaderboard: { Args: never; Returns: undefined }
      set_cache: {
        Args: { _key: string; _ttl_seconds?: number; _value: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student"
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
      app_role: ["admin", "moderator", "student"],
    },
  },
} as const
