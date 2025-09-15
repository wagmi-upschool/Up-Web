"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Clock, Target, Trophy, Plus } from "lucide-react";

const QuizSelectionPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assistantId, setAssistantId] = useState<string | null>(null);

  useEffect(() => {
    const paramAssistantId = searchParams.get("assistantId");
    if (paramAssistantId) {
      setAssistantId(paramAssistantId);
    }
  }, [searchParams]);

  // Mock quiz options - would come from API in real implementation
  const availableQuizzes: any = [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Kolay":
        return "text-green-600 bg-green-50";
      case "Orta":
        return "text-yellow-600 bg-yellow-50";
      case "Zor":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleStartQuiz = (quizAssistantId: string, title: string) => {
    router.push(`/quiz/${quizAssistantId}?title=${encodeURIComponent(title)}`);
  };

  const handleCreateNewQuiz = () => {
    if (assistantId) {
      // Start new quiz session with the provided assistant ID
      router.push(
        `/quiz/${assistantId}?new=true&title=${encodeURIComponent("Yeni Quiz Oturumu")}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-bg-main py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-righteous text-3xl text-title-black mb-4">
            Test ve Değerlendirme Merkezi
          </h1>
          <p className="font-poppins text-lg text-text-body-black max-w-2xl mx-auto">
            Bilgi seviyenizi ölçmek ve gelişim alanlarınızı belirlemek için
            tasarlanmış testler arasından seçim yapın.
          </p>
        </div>
        {/* New Quiz Creation Section - Shows when assistantId is provided */}
        {assistantId && (
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-righteous text-2xl mb-2">
                  Yeni Quiz Oturumu Oluştur
                </h2>
                <p className="font-poppins text-blue-100 mb-4">
                  Asistan ID:{" "}
                  <code className="bg-blue-800 px-2 py-1 rounded text-xs">
                    {assistantId}
                  </code>
                </p>
                <p className="font-poppins text-blue-100">
                  Bu asistan ile yeni bir quiz oturumu başlatmak için aşağıdaki
                  butona tıklayın.
                </p>
              </div>
              <div className="flex-shrink-0 ml-6">
                <button
                  onClick={handleCreateNewQuiz}
                  className="bg-white text-primary px-6 py-3 rounded-xl font-poppins font-semibold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Quiz Başlat
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* {availableQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border-gray hover:shadow-md transition-shadow"
            >
              {/* Category Badge */}
          {/* <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-light-blue text-primary text-sm font-poppins font-medium rounded-lg">
                  {quiz.category}
                </span>
                <span
                  className={`px-3 py-1 text-sm font-poppins font-medium rounded-lg ${getDifficultyColor(quiz.difficulty)}`}
                >
                  {quiz.difficulty}
                </span>
              </div> */}

          {/* Quiz Info */}
          {/* <h3 className="font-righteous text-xl text-title-black mb-3">
                {quiz.title}
              </h3>
              <p className="font-poppins text-text-body-black text-sm mb-6 leading-relaxed">
                {quiz.description}
              </p> */}

          {/* Stats */}
          {/* <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-poppins text-sm text-text-body-black">
                    {quiz.questionCount} Soru
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-poppins text-sm text-text-body-black">
                    ~{quiz.estimatedTime} dk
                  </span>
                </div>
              </div> */}

          {/* Start Button */}
          {/* <button
                onClick={() => handleStartQuiz(quiz.assistantId, quiz.title)}
                className="w-full bg-primary text-white py-3 px-4 rounded-xl font-poppins font-semibold hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
              >
                Teste Başla
              </button> */}
          {/* </div> */}
          {/* ))} */}
        </div>
        {/* Info Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border-gray">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-primary" />
            <h2 className="font-righteous text-xl text-title-black">
              Test Hakkında Bilgiler
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-poppins font-semibold text-title-black mb-2">
                📋 Test Kuralları
              </h4>
              <ul className="font-poppins text-sm text-text-body-black space-y-1">
                <li>• Her soru için tek cevap seçebilirsiniz</li>
                <li>• Cevap vermeden sonraki soruya geçemezsiniz</li>
                <li>• Önceki sorulara geri dönebilirsiniz</li>
                <li>• Test tamamlandıktan sonra tekrar başlayamazsınız</li>
              </ul>
            </div>

            <div>
              <h4 className="font-poppins font-semibold text-title-black mb-2">
                🎯 Değerlendirme Kriterleri
              </h4>
              <ul className="font-poppins text-sm text-text-body-black space-y-1">
                <li>• %90+ Mükemmel performans</li>
                <li>• %80+ Çok iyi seviye</li>
                <li>• %70+ İyi seviye</li>
                <li>• %60+ Orta seviye</li>
                <li>• %60 altı geliştirilmeli</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSelectionPage;
