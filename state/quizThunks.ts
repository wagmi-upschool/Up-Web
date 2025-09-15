import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from './api'
import { RootState } from '@/components/wrapper/redux'
import { 
  startQuiz, 
  quizStarted, 
  quizStartFailed,
  submitAnswer,
  answerSubmitted,
  answerSubmitFailed,
  finishQuiz,
  quizFinished,
  quizFinishFailed,
  setConversationId,
  setAnswer,
} from './quizSlice'
import { CreateQuizSessionResponse, QuizAnswerRequest, QuizResults, QuizQuestionState } from '@/types/type'

// Start Quiz Thunk
export const startQuizThunk = createAsyncThunk<
  CreateQuizSessionResponse,
  { assistantId: string; assistantGroupId?: string; type?: string; title?: string; questionCount?: number },
  { state: RootState }
>(
  'quiz/startQuiz',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      dispatch(startQuiz())
      
      const result = await dispatch(
        api.endpoints.startQuizSession.initiate(params)
      ).unwrap()
      
      if (result && result.conversationId && result.questions) {
        dispatch(quizStarted({
          conversationId: result.conversationId,
          questions: result.questions.map((q: any, index: number) => ({
            id: q.question_id || q.id || `question-${index}`,
            questionId: q.question_id || q.id || `question-${index}`,
            title: q.question_text || q.title,
            description: q.answer_text || q.description,
            options: (q.options || []).map((optionText: string, optionIndex: number) => ({
              id: `option-${optionIndex}`,
              text: optionText,
              value: optionText,
            })),
            correctOptionId: q.correct_option_index !== undefined ? `option-${q.correct_option_index}` : q.correctOptionId,
            sequenceNumber: q.sequence_number || (index + 1),
            state: QuizQuestionState.Initial,
          }))
        }))
        return result
      } else {
        dispatch(quizStartFailed())
        return rejectWithValue('Invalid response from server')
      }
    } catch (error: any) {
      dispatch(quizStartFailed())
      return rejectWithValue(error.message || 'Failed to start quiz')
    }
  }
)

// Submit Answer Thunk
export const submitAnswerThunk = createAsyncThunk<
  void,
  { questionId: string; answer: string },
  { state: RootState }
>(
  'quiz/submitAnswer',
  async ({ questionId, answer }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState()
      const { conversationId } = state.quiz
      
      if (!conversationId) {
        return rejectWithValue('No conversation ID available')
      }

      dispatch(submitAnswer())

      // Find current question to get option mapping
      const currentQuestion = state.quiz.questions.find(q => q.questionId === questionId)
      if (!currentQuestion) {
        dispatch(answerSubmitFailed())
        return rejectWithValue('Question not found')
      }

      // Convert answer text to option index for backend
      const optionIndex = currentQuestion.options.findIndex(opt => opt.text === answer)
      const selectedOptionId = optionIndex >= 0 ? `option-${optionIndex}` : answer

      const answerRequest: QuizAnswerRequest = {
        sessionId: conversationId,
        questionId,
        selectedOptionId,
        userAnswer: answer,
        timeSpentSeconds: 0, // TODO: Track actual time
      }

      await dispatch(
        api.endpoints.submitQuizAnswer.initiate(answerRequest)
      ).unwrap()

      // Store the answer in Redux state after successful submission
      dispatch(setAnswer({ questionId, answer }))
      dispatch(answerSubmitted())
    } catch (error: any) {
      dispatch(answerSubmitFailed())
      return rejectWithValue(error.message || 'Failed to submit answer')
    }
  }
)

// Finish Quiz Thunk  
export const finishQuizThunk = createAsyncThunk<
  QuizResults,
  void,
  { state: RootState }
>(
  'quiz/finishQuiz',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState()
      const { conversationId, questions, answers, currentQuestionIndex } = state.quiz
      
      if (!conversationId) {
        return rejectWithValue('No conversation ID available')
      }

      dispatch(finishQuiz())

      // Calculate results locally from Redux state
      let correctAnswers = 0
      questions.forEach(question => {
        const userAnswer = answers[question.questionId]
        if (userAnswer && question.options.length > 0) {
          const correctOption = question.options.find(opt => opt.id === question.correctOptionId)
          if (correctOption && correctOption.text === userAnswer) {
            correctAnswers++
          }
        }
      })

      const answeredCount = Object.keys(answers).length
      const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0

      const localResults: QuizResults = {
        sessionId: conversationId,
        score,
        correctAnswers,
        incorrectAnswers: answeredCount - correctAnswers,
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
        answers,
        timeSpent: 0,
      }

      dispatch(quizFinished(localResults))
      return localResults
    } catch (error: any) {
      dispatch(quizFinishFailed())
      return rejectWithValue(error.message || 'Failed to finish quiz')
    }
  }
)

// Load Existing Quiz Thunk
export const loadExistingQuizThunk = createAsyncThunk<
  void,
  { conversationId: string },
  { state: RootState }
>(
  'quiz/loadExistingQuiz',
  async ({ conversationId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setConversationId(conversationId))
      
      const sessionData = await dispatch(
        api.endpoints.getQuizSession.initiate({ sessionId: conversationId })
      ).unwrap()

      if (sessionData?.session?.questions && sessionData.session.questions.length > 0) {
        const transformedQuestions = sessionData.session.questions.map((q: any, index: number) => ({
          id: q.question_id || q.id || `question-${index}`,
          questionId: q.question_id || q.id || `question-${index}`,
          title: q.question_text || q.title,
          description: q.answer_text || q.description,
          options: (q.options || []).map((optionText: string, optionIndex: number) => ({
            id: `option-${optionIndex}`,
            text: optionText,
            value: optionText,
          })),
          correctOptionId: q.correct_option_index !== undefined ? `option-${q.correct_option_index}` : q.correctOptionId,
          sequenceNumber: q.sequence_number || (index + 1),
          state: QuizQuestionState.Initial,
        }))

        dispatch(quizStarted({
          conversationId,
          questions: transformedQuestions
        }))
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load existing quiz')
    }
  }
)