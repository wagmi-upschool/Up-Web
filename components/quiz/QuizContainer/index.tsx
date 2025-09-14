"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useStartQuizSessionMutation,
  useGetQuizSessionQuery,
  useSubmitQuizAnswerMutation,
  useFinishQuizMutation,
  useGetQuizResultsQuery,
} from "@/state/api";
import QuizIntroduction from "../QuizIntroduction";
import QuizQuestionComponent from "../QuizQuestion";
import QuizResultsComponent from "../QuizResults";
import QuizProgress from "../QuizProgress";
import QuizNavigation from "../QuizNavigation";
import toast from "react-hot-toast";
import { ExistingQuizData, QuizQuestion, QuizQuestionState } from "@/types/type";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface QuizContainerProps {
  assistantId: string;
  assistantGroupId?: string;
  title?: string;
  existingQuizData?: ExistingQuizData;
  onExit?: () => void;
}

type QuizPhase = 'introduction' | 'question' | 'results';

const QuizContainer: React.FC<QuizContainerProps> = ({
  assistantId,
  assistantGroupId,
  title,
  existingQuizData,
  onExit,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [phase, setPhase] = useState<QuizPhase>('introduction');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>([]);
  const [apiQuestions, setApiQuestions] = useState<QuizQuestion[]>([]); // Store questions from API
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  const [startQuizSession] = useStartQuizSessionMutation();
  const [submitQuizAnswer] = useSubmitQuizAnswerMutation();
  const [finishQuiz] = useFinishQuizMutation();

  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useGetQuizSessionQuery(
    { sessionId: sessionId! },
    { skip: !sessionId }
  );

  const {
    data: resultsData,
    isLoading: isLoadingResults,
  } = useGetQuizResultsQuery(
    { sessionId: conversationId! },
    { skip: !conversationId || phase !== 'results' }
  );


  // Process existing quiz data
  useEffect(() => {
    if (existingQuizData && existingQuizData.questions) {
      // Convert existing quiz data to internal format
      const processedQuestions: QuizQuestion[] = existingQuizData.questions.map((q: any, index: number) => ({
        id: q.id || `question-${index}`,
        questionId: q.questionId || q.id || `question-${index}`,
        title: q.title || q.question || q.text,
        description: q.description,
        options: q.options || q.choices || [],
        correctOptionId: q.correctOptionId || q.correctAnswer,
        sequenceNumber: index + 1,
        state: QuizQuestionState.Initial,
      }));
      
      setExistingQuestions(processedQuestions);
      
      // If we have existing quiz data, we can skip introduction and go to questions
      if (processedQuestions.length > 0) {
        console.log('Processed existing quiz questions:', processedQuestions);
      }
    }
  }, [existingQuizData]);

  const currentSession = sessionData?.session;
  
  // Handle session data when it loads from URL conversationId
  useEffect(() => {
    if (currentSession && apiQuestions.length === 0) {
      console.log("Setting questions from session data:", currentSession.questions);
      if (currentSession.questions && currentSession.questions.length > 0) {
        // Transform session questions to our format
        const transformedQuestions: QuizQuestion[] = currentSession.questions.map((q: any, index: number) => ({
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
        }));
        
        console.log("Raw session questions from backend:", currentSession.questions.slice(0, 2)); // First 2 questions for debugging
        console.log("Transformed session questions:", transformedQuestions.slice(0, 2)); // First 2 for debugging
        setApiQuestions(transformedQuestions);
        
        // If we have conversationId from URL and session has questions, go to question phase
        if (searchParams.get('conversationId')) {
          console.log("Session loaded with questions, going to question phase");
          setPhase('question');
        }
      } else {
        console.log("No questions in session, need to fetch from backend or show introduction");
        // If session has no questions, go back to introduction
        setPhase('introduction');
      }
    }
  }, [currentSession, apiQuestions.length, searchParams]);
  
  // Use the most appropriate questions source
  const activeQuestions = existingQuestions.length > 0 
    ? existingQuestions 
    : apiQuestions.length > 0 
      ? apiQuestions 
      : currentSession?.questions || [];
  
  const currentQuestion = activeQuestions[currentQuestionIndex];

  // Handle quiz start
  const handleStartQuiz = useCallback(async () => {
    setIsStartingQuiz(true);
    
    // If we have existing quiz data, skip API call and go to questions
    if (existingQuizData && existingQuestions.length > 0) {
      setPhase('question');
      toast.success("Quiz başlatıldı!");
      setIsStartingQuiz(false);
      return;
    }

    // Otherwise, create new quiz session via API
    try {
      const result = await startQuizSession({
        assistantId,
        assistantGroupId: assistantGroupId || "06261033-dfa1-4196-8334-50592cb6490f", // Use provided or default group ID
        type: "flashcard", // Use flashcard type to match backend expectations  
        title: title || "Quiz",
        questionCount: 15, // Request 15 questions from backend
      });

      if ("data" in result && result.data) {
        setSessionId(result.data.sessionId);
        setConversationId(result.data.conversationId);
        
        // Update URL with conversationId parameter
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('conversationId', result.data.conversationId);
        const newUrl = `${pathname}?${newSearchParams.toString()}`;
        console.log("Updating URL with conversationId:", newUrl);
        router.replace(newUrl);
        
        // Transform backend questions to our format
        const transformedQuestions: QuizQuestion[] = (result.data.questions || []).map((q: any, index: number) => ({
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
        }));
        
        console.log("Setting API questions:", transformedQuestions.length, "questions");
        setApiQuestions(transformedQuestions);
        setPhase('question');
        toast.success("Quiz başlatıldı!");
        console.log("Quiz questions loaded:", transformedQuestions);
      } else {
        toast.error("Quiz başlatılırken hata oluştu");
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error("Quiz başlatılırken hata oluştu");
    } finally {
      setIsStartingQuiz(false);
    }
  }, [existingQuizData, existingQuestions.length, assistantId, assistantGroupId, title, startQuizSession, pathname, router]);

  // Check if conversationId is in URL on mount
  useEffect(() => {
    const urlConversationId = searchParams.get('conversationId');
    
    console.log("URL conversationId on mount:", urlConversationId);
    
    if (urlConversationId && !conversationId) {
      console.log("Setting conversationId from URL:", urlConversationId);
      setConversationId(urlConversationId);
      setSessionId(urlConversationId);
      
      // Don't skip to questions immediately - wait for session data to load
      console.log("ConversationId found in URL, waiting for session data to load");
    }
  }, [searchParams, conversationId]);

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, selectedOptionId: string, userAnswer?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: userAnswer || selectedOptionId, // userAnswer is the actual text like "1923"
    }));
  };

  // Handle navigation to next question
  const handleNext = async () => {
    if (!currentQuestion) return;

    const selectedAnswer = answers[currentQuestion.questionId];
    if (!selectedAnswer) {
      toast.error("Bu soruyu yanıtlamanız zorunludur");
      return;
    }

    // For existing quiz data or API questions, just navigate locally
    if (existingQuizData && existingQuestions.length > 0) {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Last question - finish quiz
        await handleFinishQuiz();
      }
      return;
    }

    // For API-loaded questions, submit answer first
    if (apiQuestions.length > 0 && conversationId) {
      try {
        // Convert option text to option index for backend
        const optionIndex = currentQuestion.options.findIndex(opt => opt.text === selectedAnswer);
        const selectedOptionId = optionIndex >= 0 ? `option-${optionIndex}` : selectedAnswer;
        
        await submitQuizAnswer({
          sessionId: conversationId,
          questionId: currentQuestion.questionId,
          selectedOptionId: selectedOptionId,
          userAnswer: selectedAnswer,
          timeSpentSeconds: 0,
        });

        if (currentQuestionIndex < activeQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // Last question - finish quiz
          await handleFinishQuiz();
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
        toast.error("Cevap kaydedilirken hata oluştu");
      }
      return;
    }

    // For API-based sessions, submit answer to backend
    if (!sessionId) return;

    try {
      // Convert option text to option index for backend
      const optionIndex = currentQuestion.options.findIndex(opt => opt.text === selectedAnswer);
      const selectedOptionId = optionIndex >= 0 ? `option-${optionIndex}` : selectedAnswer;
      
      await submitQuizAnswer({
        sessionId,
        questionId: currentQuestion.questionId,
        selectedOptionId: selectedOptionId,
        userAnswer: selectedAnswer, // Support for fill-in-blanks
        timeSpentSeconds: 0, // TODO: Track actual time spent
      });

      if (currentQuestionIndex < (currentSession?.questions.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Last question - finish quiz
        await handleFinishQuiz();
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Cevap kaydedilirken hata oluştu");
    }
  };

  // Handle navigation to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Handle quiz finish
  const handleFinishQuiz = async () => {
    // For existing quiz data or API-loaded questions, just go to results phase
    if (existingQuizData && existingQuestions.length > 0) {
      setPhase('results');
      toast.success("Quiz tamamlandı!");
      return;
    }

    // For API-loaded questions, go to results directly 
    if (apiQuestions.length > 0) {
      setPhase('results');
      toast.success("Quiz tamamlandı!");
      return;
    }

    // For API-based sessions (legacy path), finish via API
    if (!sessionId) return;

    try {
      await finishQuiz({ sessionId });
      setPhase('results');
      toast.success("Quiz tamamlandı!");
    } catch (error) {
      console.error("Error finishing quiz:", error);
      toast.error("Quiz tamamlanırken hata oluştu");
    }
  };

  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = activeQuestions.length;
  const hasAnswerForCurrentQuestion = currentQuestion 
    ? !!answers[currentQuestion.questionId] 
    : false;

  // Debug log
  console.log("Render Debug:", {
    phase,
    currentQuestion: !!currentQuestion,
    currentSession: !!currentSession,
    existingQuestions: existingQuestions.length,
    apiQuestions: apiQuestions.length,
    totalQuestions,
    activeQuestions: activeQuestions.length
  });

  // Loading states - skip for existing quiz data
  if (isLoadingSession && !existingQuizData) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-poppins text-text-body-black">Quiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (sessionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="font-poppins text-red-500 mb-4">Quiz yüklenirken hata oluştu</p>
          <button
            onClick={onExit}
            className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Ana Sayfa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {phase === 'introduction' && (
          <QuizIntroduction
            title={title || "Quiz"}
            description="Bu quiz, bilginizi değerlendirmek için hazırlanmıştır."
            totalQuestions={totalQuestions}
            onStart={handleStartQuiz}
            onExit={onExit}
            isLoading={isStartingQuiz}
          />
        )}

        {phase === 'question' && activeQuestions.length > 0 && (
          <>
            <QuizProgress
              currentQuestion={currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              answeredCount={answeredCount}
              title={existingQuizData?.title || currentSession?.title || title || "Quiz"}
            />
            
            <QuizQuestionComponent
              question={currentQuestion}
              selectedOption={answers[currentQuestion.questionId]}
              onOptionSelect={(optionId, userAnswer) => handleAnswerSelect(currentQuestion.questionId, optionId, userAnswer)}
            />
            
            <QuizNavigation
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              hasAnswer={hasAnswerForCurrentQuestion}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onFinish={handleFinishQuiz}
            />
          </>
        )}

        {phase === 'results' && (resultsData || existingQuestions.length > 0 || apiQuestions.length > 0) && (
          <QuizResultsComponent
            results={resultsData || {
              sessionId: existingQuizData?.conversationId || 'local-session',
              score: Math.round((answeredCount / totalQuestions) * 100),
              correctAnswers: 0, // We don't have correct answer data for existing conversations
              incorrectAnswers: 0,
              totalQuestions,
              completedAt: new Date().toISOString(),
              answers,
              timeSpent: 0,
            }}
            onRestart={() => {
              setPhase('introduction');
              setSessionId(null);
              setConversationId(null);
              setCurrentQuestionIndex(0);
              setAnswers({});
              setExistingQuestions([]);
              setApiQuestions([]);
              
              // Remove conversationId from URL
              const newSearchParams = new URLSearchParams(searchParams.toString());
              newSearchParams.delete('conversationId');
              const newUrl = `${pathname}?${newSearchParams.toString()}`;
              router.replace(newUrl);
            }}
            onReturnHome={onExit}
            isLoading={isLoadingResults}
          />
        )}
      </div>
    </div>
  );
};

export default QuizContainer;