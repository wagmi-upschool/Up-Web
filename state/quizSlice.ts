import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit'
import { QuizQuestion, QuizResults } from '@/types/type'

// Quiz State Types
export interface QuizState {
  // Session Management
  conversationId: string | null
  assistantId: string | null
  assistantGroupId: string | null
  title: string | null
  
  // Quiz Data
  questions: QuizQuestion[]
  currentQuestionIndex: number
  answers: Record<string, string> // questionId -> answer
  
  // UI State
  phase: 'introduction' | 'question' | 'results'
  isStarting: boolean
  isSubmitting: boolean
  isFinishing: boolean
  
  // Results
  results: QuizResults | null
  
  // Metadata
  startedAt: string | null
  completedAt: string | null
}

const initialState: QuizState = {
  // Session Management
  conversationId: null,
  assistantId: null,
  assistantGroupId: null,
  title: null,
  
  // Quiz Data
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  
  // UI State
  phase: 'introduction',
  isStarting: false,
  isSubmitting: false,
  isFinishing: false,
  
  // Results
  results: null,
  
  // Metadata
  startedAt: null,
  completedAt: null,
}

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    // Session Management
    initializeQuiz: (state, action: PayloadAction<{
      assistantId: string
      assistantGroupId?: string
      title?: string
      conversationId?: string
    }>) => {
      state.assistantId = action.payload.assistantId
      state.assistantGroupId = action.payload.assistantGroupId || null
      state.title = action.payload.title || 'Quiz'
      state.conversationId = action.payload.conversationId || null
      state.phase = 'introduction'
    },

    setConversationId: (state, action: PayloadAction<string>) => {
      state.conversationId = action.payload
    },

    // Quiz Flow Control
    setPhase: (state, action: PayloadAction<QuizState['phase']>) => {
      state.phase = action.payload
    },

    startQuiz: (state) => {
      state.isStarting = true
      state.startedAt = new Date().toISOString()
    },

    quizStarted: (state, action: PayloadAction<{
      conversationId: string
      questions: QuizQuestion[]
    }>) => {
      state.isStarting = false
      state.conversationId = action.payload.conversationId
      state.questions = action.payload.questions
      state.phase = 'question'
      state.currentQuestionIndex = 0
    },

    quizStartFailed: (state) => {
      state.isStarting = false
    },

    // Question Navigation
    setQuestions: (state, action: PayloadAction<QuizQuestion[]>) => {
      state.questions = action.payload
    },

    goToQuestion: (state, action: PayloadAction<number>) => {
      const index = action.payload
      if (index >= 0 && index < state.questions.length) {
        state.currentQuestionIndex = index
      }
    },

    nextQuestion: (state) => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1
      }
    },

    previousQuestion: (state) => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex -= 1
      }
    },

    // Answer Management
    setAnswer: (state, action: PayloadAction<{
      questionId: string
      answer: string
    }>) => {
      state.answers[action.payload.questionId] = action.payload.answer
    },

    submitAnswer: (state) => {
      state.isSubmitting = true
    },

    answerSubmitted: (state) => {
      state.isSubmitting = false
    },

    answerSubmitFailed: (state) => {
      state.isSubmitting = false
    },

    // Quiz Completion
    finishQuiz: (state) => {
      state.isFinishing = true
      state.completedAt = new Date().toISOString()
    },

    quizFinished: (state, action: PayloadAction<QuizResults>) => {
      state.isFinishing = false
      state.results = action.payload
      state.phase = 'results'
    },

    quizFinishFailed: (state) => {
      state.isFinishing = false
    },

    // Reset
    resetQuiz: (state) => {
      // Keep session info but reset quiz state
      const { assistantId, assistantGroupId, title } = state
      return {
        ...initialState,
        assistantId,
        assistantGroupId,
        title,
      }
    },

    completeReset: () => initialState,
  },
})

// Actions
export const {
  initializeQuiz,
  setConversationId,
  setPhase,
  startQuiz,
  quizStarted,
  quizStartFailed,
  setQuestions,
  goToQuestion,
  nextQuestion,
  previousQuestion,
  setAnswer,
  submitAnswer,
  answerSubmitted,
  answerSubmitFailed,
  finishQuiz,
  quizFinished,
  quizFinishFailed,
  resetQuiz,
  completeReset,
} = quizSlice.actions

// Selectors
export const selectQuiz = (state: { quiz: QuizState }) => state.quiz

export const selectCurrentQuestion = createSelector(
  [selectQuiz],
  (quiz) => quiz.questions[quiz.currentQuestionIndex] || null
)

export const selectProgress = createSelector(
  [selectQuiz],
  (quiz) => ({
    current: quiz.currentQuestionIndex + 1,
    total: quiz.questions.length,
    percentage: quiz.questions.length > 0 
      ? Math.round(((quiz.currentQuestionIndex + 1) / quiz.questions.length) * 100)
      : 0
  })
)

export const selectAnsweredQuestions = createSelector(
  [selectQuiz],
  (quiz) => Object.keys(quiz.answers).length
)

export const selectCurrentAnswer = createSelector(
  [selectQuiz, selectCurrentQuestion],
  (quiz, currentQuestion) => 
    currentQuestion ? quiz.answers[currentQuestion.questionId] || null : null
)

export const selectCanGoNext = createSelector(
  [selectQuiz, selectCurrentAnswer],
  (quiz, currentAnswer) => !!currentAnswer && !quiz.isSubmitting
)

export const selectCanGoPrevious = createSelector(
  [selectQuiz],
  (quiz) => quiz.currentQuestionIndex > 0 && !quiz.isSubmitting
)

export const selectIsLastQuestion = createSelector(
  [selectQuiz],
  (quiz) => quiz.currentQuestionIndex === quiz.questions.length - 1
)

export const selectQuizSession = createSelector(
  [selectQuiz],
  (quiz) => ({
    conversationId: quiz.conversationId,
    assistantId: quiz.assistantId,
    assistantGroupId: quiz.assistantGroupId,
    title: quiz.title,
  })
)

export default quizSlice.reducer