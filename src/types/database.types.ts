export type ExamStatus = 'draft' | 'published' | 'active' | 'expired'
export type QuestionType = 'mcq' | 'true_false' | 'short_answer'
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded'
export type UserRole = 'admin' | 'student'

export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row:    { key: string; value: string | null; updated_at: string }
        Insert: { key: string; value?: string | null; updated_at?: string }
        Update: { value?: string | null; updated_at?: string }
      }
      trades: {
        Row: {
          id: string
          name: string
          description: string | null
          code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          code?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          admin_id: string
          trade_id: string | null
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          trade_id?: string | null
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          trade_id?: string | null
          title?: string
          description?: string | null
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          instructions: string | null
          status: ExamStatus
          is_public: boolean
          duration_mins: number | null
          pass_score: number | null
          shuffle_questions: boolean
          show_results: boolean
          starts_at: string | null
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          instructions?: string | null
          status?: ExamStatus
          is_public?: boolean
          duration_mins?: number | null
          pass_score?: number | null
          shuffle_questions?: boolean
          show_results?: boolean
          starts_at?: string | null
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          instructions?: string | null
          status?: ExamStatus
          is_public?: boolean
          duration_mins?: number | null
          pass_score?: number | null
          shuffle_questions?: boolean
          show_results?: boolean
          starts_at?: string | null
          ends_at?: string | null
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          exam_id: string
          type: QuestionType
          prompt: string
          points: number
          position: number
          explanation: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          type: QuestionType
          prompt: string
          points?: number
          position?: number
          explanation?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          prompt?: string
          points?: number
          position?: number
          explanation?: string | null
          updated_at?: string
        }
      }
      question_library: {
        Row: {
          id: string
          type: QuestionType
          prompt: string
          points: number
          explanation: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: QuestionType
          prompt: string
          points?: number
          explanation?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: QuestionType
          prompt?: string
          points?: number
          explanation?: string | null
          updated_at?: string
        }
      }
      question_library_options: {
        Row: {
          id: string
          question_library_id: string
          text: string
          is_correct: boolean
          position: number
        }
        Insert: {
          id?: string
          question_library_id: string
          text: string
          is_correct?: boolean
          position?: number
        }
        Update: {
          text?: string
          is_correct?: boolean
          position?: number
        }
      }
      answer_options: {
        Row: {
          id: string
          question_id: string
          text: string
          is_correct: boolean
          position: number
        }
        Insert: {
          id?: string
          question_id: string
          text: string
          is_correct?: boolean
          position?: number
        }
        Update: {
          text?: string
          is_correct?: boolean
          position?: number
        }
      }
      exam_assignments: {
        Row: {
          id: string
          exam_id: string
          student_id: string
          assigned_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          student_id: string
          assigned_at?: string
        }
        Update: {
          assigned_at?: string
        }
      }
      attempts: {
        Row: {
          id: string
          exam_id: string
          student_id: string
          status: AttemptStatus
          started_at: string
          submitted_at: string | null
          time_spent_secs: number | null
          score_raw: number | null
          score_pct: number | null
          passed: boolean | null
          graded_at: string | null
          grader_notes: string | null
        }
        Insert: {
          id?: string
          exam_id: string
          student_id: string
          status?: AttemptStatus
          started_at?: string
          submitted_at?: string | null
          time_spent_secs?: number | null
          score_raw?: number | null
          score_pct?: number | null
          passed?: boolean | null
          graded_at?: string | null
          grader_notes?: string | null
        }
        Update: {
          status?: AttemptStatus
          submitted_at?: string | null
          time_spent_secs?: number | null
          score_raw?: number | null
          score_pct?: number | null
          passed?: boolean | null
          graded_at?: string | null
          grader_notes?: string | null
        }
      }
      responses: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          selected_option_id: string | null
          text_answer: string | null
          is_correct: boolean | null
          points_awarded: number | null
          created_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          selected_option_id?: string | null
          text_answer?: string | null
          is_correct?: boolean | null
          points_awarded?: number | null
          created_at?: string
        }
        Update: {
          selected_option_id?: string | null
          text_answer?: string | null
          is_correct?: boolean | null
          points_awarded?: number | null
        }
      }
    }
    Functions: {
      grade_attempt: {
        Args: { p_attempt_id: string }
        Returns: undefined
      }
      expire_past_exams: {
        Args: Record<string, never>
        Returns: undefined
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      admin_create_student: {
        Args: { p_email: string; p_password: string; p_full_name: string }
        Returns: string
      }
      admin_update_student_password: {
        Args: { p_user_id: string; p_password: string }
        Returns: undefined
      }
    }
  }
}
