"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface QuizNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  hasAnswer: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isLoading?: boolean;
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentQuestionIndex,
  totalQuestions,
  hasAnswer,
  onPrevious,
  onNext,
  onFinish,
  isLoading = false,
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="bg-white border-t border-border-gray px-6 py-4 shadow-sm">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            disabled={isFirstQuestion || isLoading}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-poppins font-medium transition-colors min-w-[140px] ${
              isFirstQuestion || isLoading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white border-2 border-border-gray text-text-body-black hover:border-primary/50 hover:text-primary"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Önceki Soru</span>
          </button>

          {/* Center Status */}
          <div className="flex flex-col items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-poppins text-sm text-blue-700 font-medium">
                  Yükleniyor...
                </span>
              </div>
            ) : !hasAnswer ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-poppins text-sm text-yellow-700 font-medium">
                  Cevap bekleniyor
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-poppins text-sm text-green-700 font-medium">
                  Cevap verildi
                </span>
              </div>
            )}
          </div>

          {/* Next/Finish Button */}
          {isLastQuestion ? (
            <button
              onClick={onFinish}
              disabled={!hasAnswer || isLoading}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-poppins font-semibold transition-all min-w-[140px] ${
                !hasAnswer || isLoading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
              }`}
            >
              <Flag className="w-5 h-5" />
              Testi Bitir
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!hasAnswer || isLoading}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-poppins font-medium transition-all min-w-[140px] ${
                !hasAnswer || isLoading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
              <span>Sonraki Soru</span>
            </button>
          )}
        </div>

        {/* Validation Message */}
        {!hasAnswer && (
          <div className="text-center mt-4">
            <p className="font-poppins text-sm text-red-500">
              ⚠️ Devam etmek için bir seçenek seçiniz
            </p>
          </div>
        )}

        {/* Progress Hint */}
        <div className="text-center mt-2">
          <p className="font-poppins text-xs text-text-light">
            {isLastQuestion
              ? "Son soru - test tamamlanmak üzere"
              : `${totalQuestions - currentQuestionIndex - 1} soru kaldı`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizNavigation;
