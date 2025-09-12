"use client";

import React from "react";

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  title: string;
}

const QuizProgress: React.FC<QuizProgressProps> = ({
  currentQuestion,
  totalQuestions,
  answeredCount,
  title,
}) => {
  const progressPercentage = totalQuestions > 0 
    ? (answeredCount / totalQuestions) * 100 
    : 0;

  const completionPercentage = totalQuestions > 0 
    ? ((currentQuestion - 1) / totalQuestions) * 100 
    : 0;

  return (
    <div className="bg-white border-b border-border-gray px-6 py-4 shadow-sm">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-righteous text-xl text-title-black">
              {title}
            </h1>
            <p className="font-poppins text-sm text-text-light">
              Test / Sınav - değerlendirme
            </p>
          </div>
          
          <div className="text-right">
            <div className="font-poppins text-lg font-semibold text-primary">
              Soru {currentQuestion} / {totalQuestions}
            </div>
            <div className="font-poppins text-sm text-text-light">
              {answeredCount} cevaplandı
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          {/* Main Progress */}
          <div className="flex items-center gap-3">
            <span className="font-poppins text-sm text-text-body-black min-w-fit">
              İlerleme
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(completionPercentage, 5)}%` }}
              />
            </div>
            <span className="font-poppins text-sm font-medium text-primary min-w-fit">
              {Math.round(completionPercentage)}%
            </span>
          </div>

        </div>

        {/* Progress Indicators */}
        <div className="flex justify-between items-center mt-4 pt-2">
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }, (_, index) => {
              const questionNumber = index + 1;
              const isAnswered = answeredCount > index;
              const isCurrent = currentQuestion === questionNumber;
              
              return (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    isCurrent
                      ? "bg-primary ring-2 ring-primary/30 scale-125"
                      : isAnswered
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  title={`Soru ${questionNumber}${isAnswered ? " - Cevaplandı" : ""}${isCurrent ? " - Şu anki" : ""}`}
                />
              );
            })}
          </div>
          
          {/* Status Text */}
          <div className="font-poppins text-xs text-text-light">
            {answeredCount === totalQuestions 
              ? "Tüm sorular cevaplandı!" 
              : `${totalQuestions - answeredCount} soru kaldı`
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizProgress;