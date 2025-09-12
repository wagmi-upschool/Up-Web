"use client";

import React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import QuizContainer from "@/components/quiz/QuizContainer";
import { useGetChatMessagesQuery } from "@/state/api";
import { ExistingQuizData } from "@/types/type";

const QuizPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const assistantId = params.assistantId as string;
  const title = searchParams.get("title") || "Test";
  const assistantGroupId = searchParams.get("assistantGroupId");
  const conversationId = searchParams.get("conversationId");

  // Fetch conversation messages if this is an existing quiz conversation
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useGetChatMessagesQuery(
    { chatId: conversationId!, limit: "100" },
    { skip: !conversationId }
  );

  const handleExit = () => {
    router.push("/");
  };

  // Process existing quiz data from conversation messages
  const existingQuizData: ExistingQuizData | undefined = conversationId && messagesData ? {
    conversationId,
    assistantId,
    title,
    questions: messagesData.messages
      .filter(msg => msg.content && typeof msg.content === 'string')
      .map(msg => {
        try {
          const content = JSON.parse(msg.content!);
          return content.questions || content;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .flat(),
  } : undefined;

  // Loading state for messages
  if (conversationId && isLoadingMessages) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-poppins text-text-body-black">Quiz verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error states
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

  if (conversationId && messagesError) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="font-poppins text-red-500 mb-4">
            Quiz verisi yüklenirken hata oluştu
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
      existingQuizData={existingQuizData}
      onExit={handleExit}
    />
  );
};

export default QuizPage;