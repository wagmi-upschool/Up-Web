"use client";

import React from "react";
import { QuizOption } from "@/types/type";

interface QuestionOptionProps {
  option: QuizOption;
  isSelected: boolean;
  onSelect: () => void;
}

const QuestionOption: React.FC<QuestionOptionProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-6 text-left rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? "bg-light-blue border-primary shadow-md"
          : "bg-white border-border-gray hover:border-primary/50 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Radio Button */}
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
          isSelected
            ? "border-primary bg-primary"
            : "border-gray-300"
        }`}>
          {isSelected && (
            <div className="w-2 h-2 bg-white rounded-full"></div>
          )}
        </div>

        {/* Option Text */}
        <div className="flex-1">
          <p className={`font-poppins text-base leading-relaxed ${
            isSelected
              ? "text-primary font-medium"
              : "text-text-body-black"
          }`}>
            {option.text}
          </p>
        </div>
      </div>
    </button>
  );
};

export default QuestionOption;