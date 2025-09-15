"use client";

import React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import QuizContainer from "@/components/quiz/QuizContainer/indexNew";

const QuizPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const assistantId = params.assistantId as string;
  const title = searchParams.get("title") || "Test";
  const assistantGroupId = searchParams.get("assistantGroupId");
  const conversationId = searchParams.get("conversationId");

  const handleExit = () => {
    router.push("/");
  };

  // Error state for missing assistantId
  if (!assistantId) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="font-poppins text-red-500 mb-4">
            Geçersiz test parametresi
          </p>
          <button
            onClick={handleExit}
            className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Ana Sayfa
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizContainer
      assistantId={assistantId}
      assistantGroupId={assistantGroupId || undefined}
      title={title}
      conversationId={conversationId || undefined}
      onExit={handleExit}
    />
  );
};

export default QuizPage;