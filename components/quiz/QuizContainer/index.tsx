"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useStartQuizSessionMutation,
  useGetQuizSessionQuery,
  useSubmitQuizAnswerMutation,
  useFinishQuizMutation,
  useGetQuizResultsQuery,
} from "@/state/api";
import QuizIntroduction from "../QuizIntroduction";
import QuizQuestionComponent from "../QuizQuestion";
import QuizResultsComponent from "../QuizResults/indexNew";
import toast from "react-hot-toast";
import { ExistingQuizData, QuizQuestion, QuizQuestionState } from "@/types/type";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface QuizContainerProps {
  assistantId: string;
  assistantGroupId?: string;
  title?: string;
  conversationId?: string;
  existingQuizData?: ExistingQuizData;
  onExit?: () => void;
}

type QuizPhase = 'introduction' | 'question' | 'results';

const QuizContainer: React.FC<QuizContainerProps> = ({
  assistantId,
  assistantGroupId,
  title,
  conversationId: propConversationId,
  existingQuizData,
  onExit,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [phase, setPhase] = useState<QuizPhase>('introduction');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>([]);
  const [apiQuestions, setApiQuestions] = useState<QuizQuestion[]>([]); // Store questions from API
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [isFinishingQuiz, setIsFinishingQuiz] = useState(false);
  
  // Robust initialization flags
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const startingQuizRef = useRef(false);

  const [startQuizSession] = useStartQuizSessionMutation();
  const [submitQuizAnswer] = useSubmitQuizAnswerMutation();
  const [finishQuiz] = useFinishQuizMutation();

  // Handle hydration - wait for client-side to be ready
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useGetQuizSessionQuery(
    { sessionId: conversationId! },
    { skip: !conversationId }
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
  
  // Extract URL parameters for dependency optimization
  const urlConversationId = searchParams?.get('conversationId');
  const isNewQuiz = searchParams?.get('new') === 'true';
  
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
        
        // ONLY go to question phase if we have actual questions
        console.log("Session loaded with questions, going to question phase");
        setPhase('question');
      } else {
        console.log("No questions in session, staying on introduction");
        // If session has no questions, stay on introduction - don't force navigation
        setPhase('introduction');
      }
    }
    
    // Handle case where session exists but has no questions (invalid session)
    if (sessionError || (currentSession && (!currentSession.questions || currentSession.questions.length === 0))) {
      console.log("Invalid session or no questions, resetting to introduction");
      setPhase('introduction');
    }
  }, [currentSession, apiQuestions.length, sessionError]);
  
  // Use the most appropriate questions source
  const activeQuestions = existingQuestions.length > 0 
    ? existingQuestions 
    : apiQuestions.length > 0 
      ? apiQuestions 
      : currentSession?.questions || [];
  
  const currentQuestion = activeQuestions[currentQuestionIndex] || null;

  // Handle quiz start with robust debouncing
  const handleStartQuiz = useCallback(async () => {
    // Robust debouncing - check ref first (survives re-renders)
    if (startingQuizRef.current || isStartingQuiz) {
      console.log("Quiz start blocked - already in progress");
      return;
    }
    
    // Set both ref and state for maximum protection
    startingQuizRef.current = true;
    setIsStartingQuiz(true);
    
    console.log("Starting quiz...");
    
    // If we have existing quiz data, skip API call and go to questions
    if (existingQuizData && existingQuestions.length > 0) {
      setPhase('question');
      toast.success("Quiz başlatıldı!");
      // Reset both state and ref
      startingQuizRef.current = false;
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
      // Reset both state and ref in all cases
      startingQuizRef.current = false;
      setIsStartingQuiz(false);
    }
  }, [existingQuizData, existingQuestions.length, assistantId, assistantGroupId, title, startQuizSession, pathname, router]);

  // Robust initialization - handles conversationId from props or URL after hydration
  useEffect(() => {
    // Only initialize once and after hydration
    if (isInitialized || !isHydrated) return;
    
    // If this is a new quiz, ignore any conversationId and start fresh
    if (isNewQuiz) {
      console.log("New quiz requested, ignoring existing conversationId");
      setConversationId(null);
      setPhase('introduction');
      setIsInitialized(true);
      return;
    }
    
    // Priority: prop > URL > null (for existing quizzes)
    const finalConversationId = propConversationId || urlConversationId;
    
    console.log("Robust initialization:", {
      propConversationId,
      urlConversationId,
      finalConversationId,
      isHydrated,
      isNewQuiz
    });
    
    if (finalConversationId && !conversationId) {
      console.log("Setting conversationId from initialization:", finalConversationId);
      setConversationId(finalConversationId);
      // NOTE: conversationId is set here for existing quizzes
      console.log("ConversationId set, waiting for session data to load");
    }
    
    setIsInitialized(true);
  }, [propConversationId, urlConversationId, isHydrated, isInitialized, conversationId, isNewQuiz]);

  // Handle URL parameter changes after initialization
  useEffect(() => {
    if (!isInitialized || !isHydrated) return;
    
    // If new quiz is requested, reset everything
    if (isNewQuiz && phase !== 'introduction') {
      console.log("New quiz detected, resetting to introduction");
      setConversationId(null);
      setPhase('introduction');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setApiQuestions([]);
      return;
    }
    
    const finalConversationId = propConversationId || urlConversationId;
    
    console.log("URL change detected:", {
      current: conversationId,
      new: finalConversationId,
      phase,
      isNewQuiz
    });
    
    // If conversationId is removed from URL, reset to introduction phase
    if (!finalConversationId && conversationId && !isNewQuiz) {
      console.log("ConversationId removed from URL, resetting to introduction");
      setConversationId(null);
      setPhase('introduction');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setApiQuestions([]);
    }
    // If new conversationId is provided, update it but stay on introduction until session loads
    else if (finalConversationId && finalConversationId !== conversationId && !isNewQuiz) {
      console.log("New conversationId detected, updating:", finalConversationId);
      setConversationId(finalConversationId);
      // Don't automatically go to question phase - wait for session data
    }
  }, [propConversationId, urlConversationId, isInitialized, isHydrated, conversationId, phase, isNewQuiz]);

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
        
        const answerResult = await submitQuizAnswer({
          sessionId: conversationId,
          questionId: currentQuestion.questionId,
          selectedOptionId: selectedOptionId,
          userAnswer: selectedAnswer,
          timeSpentSeconds: 0,
        });

        console.log("Answer submission result:", answerResult);

        // Ensure we got a successful response before proceeding
        if ('data' in answerResult && answerResult.data) {
          if (currentQuestionIndex < activeQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
          } else {
            // Last question - finish quiz
            await handleFinishQuiz();
          }
        } else {
          console.error("Answer submission failed:", answerResult);
          toast.error("Cevap kaydedilirken hata oluştu");
          return; // Don't proceed if answer submission failed
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
        toast.error("Cevap kaydedilirken hata oluştu");
      }
      return;
    }

    // For API-based sessions, submit answer to backend
    if (!conversationId) return;

    try {
      // Convert option text to option index for backend
      const optionIndex = currentQuestion.options.findIndex(opt => opt.text === selectedAnswer);
      const selectedOptionId = optionIndex >= 0 ? `option-${optionIndex}` : selectedAnswer;
      
      await submitQuizAnswer({
        sessionId: conversationId,
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
    setIsFinishingQuiz(true);
    
    try {
      // IMPORTANT: Submit the current (last) question's answer before finishing
      if (currentQuestion) {
        const selectedAnswer = answers[currentQuestion.questionId];
      
      // If we have an answer for the current question, submit it first
      if (selectedAnswer && apiQuestions.length > 0 && conversationId) {
        try {
          console.log("Submitting final question answer before finishing quiz");
          // Convert option text to option index for backend
          const optionIndex = currentQuestion.options.findIndex(opt => opt.text === selectedAnswer);
          const selectedOptionId = optionIndex >= 0 ? `option-${optionIndex}` : selectedAnswer;
          
          const answerResult = await submitQuizAnswer({
            sessionId: conversationId,
            questionId: currentQuestion.questionId,
            selectedOptionId: selectedOptionId,
            userAnswer: selectedAnswer,
            timeSpentSeconds: 0,
          });
          
          console.log("Final answer submission result:", answerResult);
          
          if ('data' in answerResult && answerResult.data) {
            console.log("Final answer submitted successfully - backend confirmed");
            // Additional delay to ensure backend processes the answer completely
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error("Final answer submission returned error:", answerResult);
            // Still continue but with warning
            toast.error("Son cevap kaydedilirken sorun oluştu, ancak quiz tamamlandı");
          }
        } catch (error) {
          console.error("Error submitting final answer:", error);
          toast.error("Son cevap kaydedilirken hata oluştu");
          // Continue with quiz finish even if final answer submission fails
        }
      }
    }

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
    if (!conversationId) return;

    try {
      await finishQuiz({ sessionId: conversationId });
      setPhase('results');
      toast.success("Quiz tamamlandı!");
    } catch (error) {
      console.error("Error finishing quiz:", error);
      toast.error("Quiz tamamlanırken hata oluştu");
    }
    } finally {
      setIsFinishingQuiz(false);
    }
  };

  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  
  // For introduction phase, show expected question count; for other phases, show actual loaded questions
  const totalQuestions = phase === 'introduction' 
    ? (existingQuizData?.questions?.length || 15) // Use existing data or default expected count
    : activeQuestions.length;
  const hasAnswerForCurrentQuestion = currentQuestion 
    ? !!answers[currentQuestion.questionId] 
    : false;

  // Debug log
  console.log("Render Debug:", {
    phase,
    currentQuestion: !!currentQuestion,
    currentQuestionIndex,
    currentSession: !!currentSession,
    existingQuestions: existingQuestions.length,
    apiQuestions: apiQuestions.length,
    totalQuestions,
    activeQuestions: activeQuestions.length,
    conversationId,
    isNewQuiz
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

        {phase === 'question' && activeQuestions.length > 0 && currentQuestion && (
            <QuizQuestionComponent
              question={currentQuestion}
              selectedOption={answers[currentQuestion.questionId]}
              onOptionSelect={(optionId, userAnswer) => handleAnswerSelect(currentQuestion.questionId, optionId, userAnswer)}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onFinish={handleFinishQuiz}
              isLoading={isFinishingQuiz}
            />
        )}

        {phase === 'results' && (resultsData || existingQuestions.length > 0 || apiQuestions.length > 0) && (
          <QuizResultsComponent
            onReturnHome={onExit}
            isLoading={isLoadingResults}
          />
        )}
      </div>
    </div>
  );
};

export default QuizContainer;