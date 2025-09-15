"use client";

import React from "react";
import { QuizQuestion } from "@/types/type";
import QuestionOption from "./QuestionOption";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface QuizQuestionProps {
  question: QuizQuestion;
  selectedOption?: string;
  onOptionSelect: (optionId: string, userAnswer?: string) => void;
  // Navigation props
  currentQuestionIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isLoading?: boolean;
}

const QuizQuestionComponent: React.FC<QuizQuestionProps> = ({
  question,
  selectedOption,
  onOptionSelect,
  currentQuestionIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onFinish,
  isLoading = false,
}) => {
  const hasAnswer = !!selectedOption;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  return (
    <div
      className="flex-1 overflow-y-auto relative"
      style={{
        backgroundImage: "url(/bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background overlay with opacity */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>

      {/* Combined top section with white background */}
      <div className="relative z-10 bg-white px-6 py-4 shadow-sm">
        {/* UP Logo */}
        <div className="absolute top-4 left-6">
          <img src="/up.png" alt="UP" className="h-8 w-auto" />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="font-righteous text-xl text-title-black mb-1">
              Test
            </h1>
            <p className="font-poppins text-sm text-text-light mb-3">
              Test / Sınav - değerlendirme
            </p>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mt-2">
              <span className="font-poppins text-xs text-text-body-black min-w-fit">
                İlerleme
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max((currentQuestionIndex / totalQuestions) * 100, 5)}%`,
                  }}
                />
              </div>
              <span className="font-poppins text-xs font-medium text-primary min-w-fit">
                {Math.round((currentQuestionIndex / totalQuestions) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          {/* Question Header */}
          <div className="mb-8">
            <h2 className="font-righteous text-2xl text-title-black mb-4 leading-relaxed">
              {question.title.replaceAll("{blank}", "______")}
            </h2>
          </div>

          {/* Answer Required Notice */}
          {!selectedOption && (
            <div className="bg-light-blue border border-primary/20 rounded-lg p-4 mb-6">
              <p className="font-poppins text-sm text-primary font-medium">
                ⚠️ Bu soruyu yanıtlamanız zorunludur
              </p>
            </div>
          )}

          {/* Options or Fill-in-blank input */}
          {question.options && question.options.length > 0 ? (
            <div className="space-y-4">
              {question.options.map((option, index) => (
                <QuestionOption
                  key={option.id || index}
                  option={option}
                  isSelected={selectedOption === option.text}
                  onSelect={() => onOptionSelect(option.id, option.text)}
                />
              ))}
            </div>
          ) : (
            // Fill-in-blanks input
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
                <input
                  type="text"
                  value={selectedOption || ""}
                  onChange={(e) =>
                    onOptionSelect("fill-in-blank", e.target.value)
                  }
                  placeholder="Cevabınızı yazın..."
                  className="w-full font-poppins text-lg text-text-body-black placeholder-text-light focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Selection Feedback */}
          {selectedOption && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-poppins text-sm text-green-700 font-medium">
                ✅ Cevabınız kaydedildi. Sonraki soruya geçebilirsiniz.
              </p>
            </div>
          )}

          {/* Navigation Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              {/* Previous Button */}
              <button
                onClick={onPrevious}
                disabled={isFirstQuestion || isLoading}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-poppins font-medium transition-colors ${
                  isFirstQuestion || isLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border-2 border-gray-300 text-text-body-black hover:border-primary/50 hover:text-primary"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Önceki Soru
              </button>

              {/* Center Status */}
              <div className="flex flex-col items-center gap-2">
                {!hasAnswer && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="font-poppins text-sm text-yellow-700 font-medium">
                      Cevap bekleniyor
                    </span>
                  </div>
                )}

                {hasAnswer && (
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
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-poppins font-semibold transition-all ${
                    !hasAnswer || isLoading
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Flag className="w-5 h-5" />
                  )}
                  {isLoading ? "Tamamlanıyor..." : "Testi Bitir"}
                </button>
              ) : (
                <button
                  onClick={onNext}
                  disabled={!hasAnswer || isLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-poppins font-medium transition-all ${
                    !hasAnswer || isLoading
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Sonraki Soru
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress Hint */}
            <div className="text-center mt-4">
              {!hasAnswer ? (
                <p className="font-poppins text-sm text-red-500">
                  ⚠️ Devam etmek için bir seçenek seçiniz
                </p>
              ) : (
                <p className="font-poppins text-xs text-text-light">
                  {isLastQuestion
                    ? "Son soru - test tamamlanmak üzere"
                    : `${totalQuestions - currentQuestionIndex - 1} soru kaldı`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestionComponent;
