"use client";

import React from "react";
import { useAppSelector } from "@/components/wrapper/redux";
import { selectQuiz } from "@/state/quizSlice";
import { Trophy, Target, XCircle, Home } from "lucide-react";

interface QuizResultsReduxProps {
  onReturnHome?: () => void;
  isLoading?: boolean;
}

const QuizResultsRedux: React.FC<QuizResultsReduxProps> = ({
  onReturnHome,
  isLoading = false,
}) => {
  const quiz = useAppSelector(selectQuiz);
  const { results } = quiz;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  const getPerformanceText = (score: number) => {
    if (score >= 90) return "Mükemmel!";
    if (score >= 80) return "Çok İyi!";
    if (score >= 70) return "İyi!";
    if (score >= 60) return "Orta";
    return "Geliştirilmeli";
  };

  if (isLoading || !results) {
    return (
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{
          backgroundImage: "url(/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Background overlay with opacity */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>

        {/* UP Logo */}
        <div className="absolute top-6 left-6 z-10">
          <img src="/up.png" alt="UP" className="h-12 w-auto" />
        </div>

        <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-poppins text-text-body-black">
            Sonuçlar hesaplanıyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto py-12 px-6 relative"
      style={{
        backgroundImage: "url(/bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background overlay with opacity */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>

      {/* UP Logo */}
      <div className="absolute top-6 left-6 z-10">
        <img src="/up.png" alt="UP" className="h-12 w-auto" />
      </div>

      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {/* Congratulations Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h1 className="font-righteous text-3xl text-title-black mb-4">
            Tebrikler, testi tamamladınız! 🎉
          </h1>
          <p className="font-poppins text-lg text-text-body-black">
            Test sonuçlarınız aşağıda detaylı olarak gösterilmektedir.
          </p>
        </div>

        {/* Score Card */}
        <div
          className={`rounded-2xl p-8 shadow-sm border border-border-gray mb-8 ${getScoreBgColor(results.score)}`}
        >
          <div className="text-center">
            <h2 className="font-poppins font-semibold text-title-black text-xl mb-4">
              Genel Başarı Oranı
            </h2>

            <div
              className={`text-6xl font-bold mb-4 ${getScoreColor(results.score)}`}
            >
              {Math.round(results.score)}%
            </div>

            <div
              className={`inline-block px-4 py-2 rounded-lg font-poppins font-semibold ${
                results.score >= 80
                  ? "bg-green-100 text-green-800"
                  : results.score >= 60
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {getPerformanceText(results.score)}
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Correct Answers */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-title-black text-lg">
                  Doğru Yanıt
                </h3>
                <p className="font-poppins text-2xl font-bold text-green-600">
                  {results.correctAnswers}
                </p>
                <p className="font-poppins text-sm text-text-light">
                  {results.totalQuestions} sorudan
                </p>
              </div>
            </div>
          </div>

          {/* Incorrect Answers */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-title-black text-lg">
                  Yanlış Yanıt
                </h3>
                <p className="font-poppins text-2xl font-bold text-red-600">
                  {results.incorrectAnswers}
                </p>
                <p className="font-poppins text-sm text-text-light">
                  {results.totalQuestions} sorudan
                </p>
              </div>
            </div>
          </div>

          {/* Completion Date */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-title-black text-lg">
                  Tamamlanma
                </h3>
                <p className="font-poppins text-lg font-bold text-purple-600">
                  {new Date(results.completedAt).toLocaleDateString("tr-TR")}
                </p>
                <p className="font-poppins text-sm text-text-light">
                  {new Date(results.completedAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Important Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-poppins font-semibold text-yellow-800 mb-2">
            Önemli Not
          </h3>
          <p className="font-poppins text-sm text-yellow-700 leading-relaxed">
            Bu teste tekrar başlayamazsınız. Test sonuçlarınız kaydedilmiştir ve
            sistem yöneticileri tarafından değerlendirilebilir.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* {onRestart && (
            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-border-gray text-text-body-black rounded-xl font-poppins font-medium hover:border-primary/50 hover:text-primary transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Yeni Test
            </button>
          )} */}

          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-poppins font-semibold hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5" />
              Ana Sayfa
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="font-poppins text-sm text-text-light">
            Sonuçlarınızı daha sonra görüntülemek için sistem yöneticinizle
            iletişime geçebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizResultsRedux;
