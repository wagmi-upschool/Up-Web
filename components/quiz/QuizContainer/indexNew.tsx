"use client";

import React, { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/components/wrapper/redux";
import {
  selectQuiz,
  selectCurrentQuestion,
  selectProgress,
  selectCurrentAnswer,
  selectCanGoNext,
  selectCanGoPrevious,
  selectIsLastQuestion,
  initializeQuiz,
  setPhase,
  setQuestions,
  setAnswer,
  nextQuestion,
  previousQuestion,
  resetQuiz,
  completeReset,
} from "@/state/quizSlice";
import {
  startQuizThunk,
  submitAnswerThunk,
  finishQuizThunk,
  loadExistingQuizThunk,
} from "@/state/quizThunks";
import QuizIntroduction from "../QuizIntroduction";
import QuizQuestionComponent from "../QuizQuestion";
import QuizResultsRedux from "../QuizResults/indexNew";
import toast from "react-hot-toast";
import { ExistingQuizData, QuizQuestionState } from "@/types/type";

interface QuizContainerProps {
  assistantId: string;
  assistantGroupId?: string;
  title?: string;
  conversationId?: string;
  existingQuizData?: ExistingQuizData;
  onExit?: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({
  assistantId,
  assistantGroupId,
  title,
  conversationId: propConversationId,
  existingQuizData,
  onExit,
}) => {
  const dispatch = useAppDispatch();
  
  // Redux Selectors
  const quiz = useAppSelector(selectQuiz);
  const currentQuestion = useAppSelector(selectCurrentQuestion);
  const progress = useAppSelector(selectProgress);
  const currentAnswer = useAppSelector(selectCurrentAnswer);
  const canGoNext = useAppSelector(selectCanGoNext);
  const canGoPrevious = useAppSelector(selectCanGoPrevious);
  const isLastQuestion = useAppSelector(selectIsLastQuestion);

  // Initialize quiz on mount
  useEffect(() => {
    dispatch(initializeQuiz({
      assistantId,
      assistantGroupId,
      title: title || "Quiz",
      conversationId: propConversationId,
    }));

    // If we have existing quiz data, process it
    if (existingQuizData && existingQuizData.questions && existingQuizData.questions.length > 0) {
      const processedQuestions = existingQuizData.questions.map((q: any, index: number) => ({
        id: q.id || `question-${index}`,
        questionId: q.questionId || q.id || `question-${index}`,
        title: q.title || q.question || q.text,
        description: q.description,
        options: q.options || q.choices || [],
        correctOptionId: q.correctOptionId || q.correctAnswer,
        sequenceNumber: index + 1,
        state: QuizQuestionState.Initial,
      }));
      
      dispatch(setQuestions(processedQuestions));
      if (processedQuestions.length > 0) {
        dispatch(setPhase('question'));
      }
    }
    // If we have a conversationId prop, try to load existing quiz
    else if (propConversationId) {
      dispatch(loadExistingQuizThunk({ conversationId: propConversationId }));
    }
  }, [dispatch, assistantId, assistantGroupId, title, propConversationId, existingQuizData]);

  // Handle quiz start
  const handleStartQuiz = useCallback(async () => {
    if (quiz.isStarting) {
      console.log("Quiz start blocked - already in progress");
      return;
    }

    try {
      const result = await dispatch(startQuizThunk({
        assistantId,
        assistantGroupId: assistantGroupId || "06261033-dfa1-4196-8334-50592cb6490f",
        type: "flashcard",
        title: title || "Quiz",
        questionCount: 15,
      })).unwrap();
      
      toast.success("Quiz başlatıldı!");
    } catch (error: any) {
      console.error("Error starting quiz:", error);
      toast.error("Quiz başlatılırken hata oluştu");
    }
  }, [dispatch, assistantId, assistantGroupId, title, quiz.isStarting]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((questionId: string, selectedOptionId: string, userAnswer?: string) => {
    dispatch(setAnswer({
      questionId,
      answer: userAnswer || selectedOptionId,
    }));
  }, [dispatch]);

  // Handle navigation to next question
  const handleNext = useCallback(async () => {
    if (!currentQuestion || !currentAnswer) {
      toast.error("Bu soruyu yanıtlamanız zorunludur");
      return;
    }

    try {
      await dispatch(submitAnswerThunk({
        questionId: currentQuestion.questionId,
        answer: currentAnswer,
      })).unwrap();

      dispatch(nextQuestion());
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      toast.error("Cevap kaydedilirken hata oluştu");
    }
  }, [dispatch, currentQuestion, currentAnswer]);

  // Handle navigation to previous question  
  const handlePrevious = useCallback(() => {
    dispatch(previousQuestion());
  }, [dispatch]);

  // Handle quiz finish
  const handleFinishQuiz = useCallback(async () => {
    if (quiz.isFinishing) return;
    
    // Son sorunun cevabını önce kaydet
    if (currentQuestion && currentAnswer) {
      try {
        await dispatch(submitAnswerThunk({
          questionId: currentQuestion.questionId,
          answer: currentAnswer,
        })).unwrap();
      } catch (error: any) {
        console.error("Error submitting last answer:", error);
        toast.error("Son cevap kaydedilirken hata oluştu");
        return;
      }
    }

    // Şimdi quiz'i bitir
    try {
      await dispatch(finishQuizThunk()).unwrap();
      toast.success("Quiz tamamlandı!");
    } catch (error: any) {
      console.error("Error finishing quiz:", error);
      toast.error("Quiz tamamlanırken hata oluştu");
    }
  }, [dispatch, quiz.isFinishing, currentQuestion, currentAnswer]);

  // Handle quiz restart
  const handleRestart = useCallback(() => {
    dispatch(resetQuiz());
    toast.success("Quiz sıfırlandı");
  }, [dispatch]);

  // Debug log
  console.log("Redux Quiz Debug:", {
    phase: quiz.phase,
    conversationId: quiz.conversationId,
    questionsCount: quiz.questions.length,
    currentQuestionIndex: quiz.currentQuestionIndex,
    currentQuestion: !!currentQuestion,
    currentAnswer,
    progress,
  });

  return (
    <div className="flex h-screen bg-bg-main">
      <div className="flex-1 flex flex-col">
        {quiz.phase === 'introduction' && (
          <QuizIntroduction
            title={quiz.title || "Quiz"}
            description="Bu quiz, bilginizi değerlendirmek için hazırlanmıştır."
            totalQuestions={20}
            onStart={handleStartQuiz}
            onExit={onExit}
            isLoading={quiz.isStarting}
          />
        )}

        {quiz.phase === 'question' && quiz.questions.length > 0 && currentQuestion && (
          <QuizQuestionComponent
            question={currentQuestion}
            selectedOption={currentAnswer || undefined}
            onOptionSelect={(optionId, userAnswer) => 
              handleAnswerSelect(currentQuestion.questionId, optionId, userAnswer)
            }
            currentQuestionIndex={quiz.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onFinish={handleFinishQuiz}
            isLoading={quiz.isSubmitting || quiz.isFinishing}
          />
        )}

        {quiz.phase === 'results' && quiz.results && (
          <QuizResultsRedux
            onReturnHome={onExit}
            isLoading={false}
          />
        )}
      </div>
    </div>
  );
};

export default QuizContainer;