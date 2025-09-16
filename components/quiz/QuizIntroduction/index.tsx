"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Clock, FileText } from "lucide-react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface QuizIntroductionProps {
  title: string;
  description: string;
  totalQuestions: number;
  timeLimit?: number; // in minutes
  onStart: () => void;
  onExit?: () => void;
  isLoading?: boolean;
}

const QuizIntroduction: React.FC<QuizIntroductionProps> = ({
  title,
  description,
  totalQuestions,
  timeLimit,
  onStart,
  onExit,
  isLoading = false,
}) => {
  const [splashAnimation, setSplashAnimation] = useState<any>(null);

  useEffect(() => {
    import("../../../public/lotties/splash_loading.json")
      .then((data) => {
        setSplashAnimation(data.default);
      })
      .catch(() => {
        console.log("Could not load loading animation");
      });
  }, []);
  return (
    <div
      className="flex-1 overflow-y-auto relative"
      style={{
        backgroundImage: "url(/image.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* UP Logo */}
      <div className="absolute top-6 left-6 z-10">
        <img src="/up.svg" alt="UP" className="h-12 w-50" />
      </div>

      <div className="min-h-full flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-light-blue rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/up_face.svg" alt="UP" className="w-50 h-14" />
            </div>
            <h1 className="font-righteous text-3xl text-title-black mb-4">
              {title}
            </h1>
            <p className="font-poppins text-lg text-text-body-black leading-relaxed">
              {description}
            </p>
          </div>

          {/* Quiz Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Total Questions Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-light-blue rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-title-black text-lg">
                    Toplam Soru
                  </h3>
                  <p className="font-poppins text-2xl font-bold text-primary">
                    20
                  </p>
                </div>
              </div>
            </div>

            {/* Question Type Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-light-blue rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-title-black text-lg">
                    Soru Tipi
                  </h3>
                  <p className="font-poppins text-sm text-text-body-black">
                    Çoktan Seçmeli
                  </p>
                </div>
              </div>
            </div>

            {/* Time Limit Card (if applicable) */}
            {timeLimit && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray md:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-light-blue rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-title-black text-lg">
                      Süre Sınırı
                    </h3>
                    <p className="font-poppins text-2xl font-bold text-primary">
                      {timeLimit} dakika
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border-gray mb-8">
            <h3 className="font-poppins font-semibold text-title-black text-lg mb-4">
              Talimatlar
            </h3>
            <ul className="font-poppins text-text-body-black space-y-2">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  Her soruyu dikkatlice okuyun ve en uygun cevabı seçin.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Her soru için cevap vermeniz zorunludur.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  Önceki sorulara geri dönüp cevabınızı değiştirebilirsiniz.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  Tüm soruları tamamladıktan sonra sonuçlarınızı
                  görüntüleyebilirsiniz.
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onExit && (
              <button
                onClick={onExit}
                className="px-8 py-3 bg-white border-2 border-border-gray text-text-body-black rounded-xl font-poppins font-medium hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            )}
            <button
              onClick={onStart}
              disabled={isLoading}
              className={`px-8 py-3 rounded-xl font-poppins font-semibold transition-colors shadow-sm flex items-center gap-3 ${
                isLoading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-blue-600"
              }`}
            >
              {isLoading && splashAnimation && (
                <Lottie
                  animationData={splashAnimation}
                  loop
                  className="w-6 h-6"
                />
              )}
              {isLoading ? "Quiz Hazırlanıyor..." : "Teste Başla"}
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-8">
            <p className="font-poppins text-sm text-text-light leading-relaxed">
              Bu test değerlendirme amaçlıdır. Sonuçlarınız sistem yöneticileri
              tarafından görüntülenebilir ve analiz edilebilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizIntroduction;
