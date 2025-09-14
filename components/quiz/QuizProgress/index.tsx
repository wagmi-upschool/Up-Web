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
    <div 
      className="border-b border-border-gray px-6 py-4 shadow-sm relative"
      style={{
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
      
      <div className="max-w-3xl mx-auto relative z-10">
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

        {/* Single Progress Bar - İlerliyoruz */}
        <div className="flex items-center gap-3">
          <span className="font-poppins text-sm text-text-body-black min-w-fit">
            İlerliyoruz
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
    </div>
  );
};

export default QuizProgress;