import type { Database, ExamStatus, QuestionType, AttemptStatus, UserRole } from './database.types'

export type { ExamStatus, QuestionType, AttemptStatus, UserRole }

export type AppSetting = Database['public']['Tables']['app_settings']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Trade = Database['public']['Tables']['trades']['Row']
export type Course = Database['public']['Tables']['courses']['Row']

export interface TradeWithCourses extends Trade {
  courses: Course[]
}
export type Exam = Database['public']['Tables']['exams']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type AnswerOption = Database['public']['Tables']['answer_options']['Row']
export type ExamAssignment = Database['public']['Tables']['exam_assignments']['Row']
export type Attempt = Database['public']['Tables']['attempts']['Row']
export type Response = Database['public']['Tables']['responses']['Row']

export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

export type QuestionLibraryItem = Database['public']['Tables']['question_library']['Row']
export type QuestionLibraryOption = Database['public']['Tables']['question_library_options']['Row']

export interface ExamWithCourse extends Exam {
  courses: Course
}

export interface AttemptWithExam extends Attempt {
  exams: Exam & { courses: Course }
  profiles?: Profile
}

export interface ResponseWithQuestion extends Response {
  questions: QuestionWithOptions
}
