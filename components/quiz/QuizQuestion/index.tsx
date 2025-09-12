"use client";

import React from "react";
import { QuizQuestion } from "@/types/type";
import QuestionOption from "./QuestionOption";

interface QuizQuestionProps {
  question: QuizQuestion;
  selectedOption?: string;
  onOptionSelect: (optionId: string, userAnswer?: string) => void;
}

const QuizQuestionComponent: React.FC<QuizQuestionProps> = ({
  question,
  selectedOption,
  onOptionSelect,
}) => {
  return (
    <div className="flex-1 px-6 py-8 bg-bg-main overflow-y-auto">
      <div className="max-w-3xl mx-auto">
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
                value={selectedOption || ''}
                onChange={(e) => onOptionSelect('fill-in-blank', e.target.value)}
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

        {/* Validation Message */}
        {!selectedOption && (
          <div className="mt-6 text-center">
            <p className="font-poppins text-sm text-text-light">
              Devam etmek için bir seçenek seçiniz
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizQuestionComponent;