import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ResponseDraft {
  questionId: string
  selectedOptionId?: string
  textAnswer?: string
}

interface ExamSessionState {
  attemptId: string | null
  examId: string | null
  startedAt: number | null
  durationMins: number | null
  responses: Record<string, ResponseDraft>
  currentQuestionIndex: number
  setAttempt: (attemptId: string, examId: string, durationMins: number | null) => void
  saveResponse: (draft: ResponseDraft) => void
  setCurrentIndex: (i: number) => void
  clearSession: () => void
}

export const useExamSessionStore = create<ExamSessionState>()(
  persist(
    (set) => ({
      attemptId: null,
      examId: null,
      startedAt: null,
      durationMins: null,
      responses: {},
      currentQuestionIndex: 0,
      setAttempt: (attemptId, examId, durationMins) =>
        set({
          attemptId,
          examId,
          durationMins,
          startedAt: Date.now(),
          responses: {},
          currentQuestionIndex: 0,
        }),
      saveResponse: (draft) =>
        set((s) => ({
          responses: { ...s.responses, [draft.questionId]: draft },
        })),
      setCurrentIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
      clearSession: () =>
        set({
          attemptId: null,
          examId: null,
          startedAt: null,
          durationMins: null,
          responses: {},
          currentQuestionIndex: 0,
        }),
    }),
    { name: 'exam-session' }
  )
)
