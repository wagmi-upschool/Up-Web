"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import {
  FeedbackSurveyType,
  FeedbackReceiver,
  QuestionsResponse,
  SubmitSurveyPayload,
  getQuestions,
  getReceivers,
  submitSurvey,
} from "@/lib/feedbackClient";
import {
  buildFeedbackSubmitAnswers,
  getQuestionScaleMax,
  getQuestionScaleMin,
  MAX_FEEDBACK_FREE_TEXT,
  parsePercentageValue,
  sanitizePercentageInput,
  validateFeedbackAnswer,
} from "@/lib/feedbackSurvey";
import LottieSpinner from "@/components/global/loader/lottie-spinner";

type FeedbackFormValues = {
  receiverId: string;
  answers: Record<string, string>;
  finalComment: string;
};

const LIKERT_GUIDE_TEXT =
  "1 - Zayıf, 2 - Kısmen yeterli, 3 - Güçlü, 4 - Rol Model";
const PERCENTAGE_GUIDE_TEXT =
  "0-100 arası ham yüzde değeri gir. Ondalık gerekiyorsa yalnızca virgül kullan.";
const PERCENTAGE_SLIDER_COLOR = "#0057FF";
const LIKERT_LEVEL_LABELS: Record<number, string> = {
  1: "Zayıf",
  2: "Kısmen yeterli",
  3: "Güçlü",
  4: "Rol Model",
};

function getReceiverEmail(receiver: FeedbackReceiver) {
  return (
    receiver.email ||
    receiver.email_address ||
    receiver.receiver_email ||
    ""
  ).trim();
}

function formatReceiverLabel(receiver: FeedbackReceiver) {
  const email = getReceiverEmail(receiver);
  const name = receiver.name?.trim();
  if (name) return name;
  if (email) return email;
  return `ID: ${receiver.feedback_receiver_id}`;
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [codePart, ...rest] = raw.split(":");
  const code = codePart?.trim();
  const message = rest.join(":").trim();

  if (code === "403" || code === "AUTH_001" || code === "AUTH_002") {
    return "Geri bildirimi şu anda yükleyemedik. Lütfen tekrar deneyin.";
  }

  if (
    code === "404" ||
    code === "QUEST_001" ||
    code === "COMP_001" ||
    code === "COMP_002"
  ) {
    return "Şu anda kullanılabilir soru veya yetkinlik yok.";
  }

  if (code?.startsWith("VAL_")) {
    return message || "Bazı yanıtlar geçersiz. Lütfen kontrol edip tekrar deneyin.";
  }

  return message || raw || "Bir şeyler ters gitti. Lütfen tekrar deneyin.";
}

function FeedbackPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh] relative">
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-[url('/bg-df.png')] bg-cover bg-center bg-no-repeat pointer-events-none"
      />
      <style jsx>{`
        .percentage-slider {
          -webkit-appearance: none;
          appearance: none;
          background: ${PERCENTAGE_SLIDER_COLOR};
        }

        .percentage-slider::-webkit-slider-runnable-track {
          height: 12px;
          border-radius: 999px;
          background: ${PERCENTAGE_SLIDER_COLOR};
        }

        .percentage-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          margin-top: -7px;
          height: 24px;
          width: 24px;
          border-radius: 999px;
          border: 3px solid #ffffff;
          background: ${PERCENTAGE_SLIDER_COLOR};
          box-shadow: 0 10px 18px rgba(0, 87, 255, 0.22);
        }

        .percentage-slider::-moz-range-track {
          height: 12px;
          border-radius: 999px;
          background: ${PERCENTAGE_SLIDER_COLOR};
        }

        .percentage-slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 999px;
          border: 3px solid #ffffff;
          background: ${PERCENTAGE_SLIDER_COLOR};
          box-shadow: 0 10px 18px rgba(0, 87, 255, 0.22);
        }
      `}</style>
      {children}
    </div>
  );
}

function FeedbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const giverId = searchParams?.get("feedbackGiverId") || "";
  const rawSurveyType = searchParams?.get("feedbackSurveyType");
  const surveyType: FeedbackSurveyType = rawSurveyType === "self" ? "self" : "peer";
  const isSelfMode = surveyType === "self";

  const [receiverId, setReceiverId] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastQuestionReceiver, setLastQuestionReceiver] = useState<
    string | null
  >(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const queryClient = useQueryClient();
  const form = useForm<FeedbackFormValues>({
    defaultValues: { receiverId: "", answers: {}, finalComment: "" },
    mode: "onChange",
  });

  const canQuery = !!giverId;
  const selfModeParam = isSelfMode ? surveyType : undefined;
  const canQueryQuestions =
    canQuery && !!receiverId && (!isSelfMode || receiverId === giverId);

  const {
    data: receivers,
    isLoading: loadingReceivers,
    error: receiversError,
  } = useQuery({
    queryKey: ["feedbackReceivers", giverId, surveyType],
    queryFn: () => getReceivers(giverId, selfModeParam),
    enabled: canQuery,
    refetchOnWindowFocus: false,
  });

  const {
    data: questionsResp,
    isLoading: loadingQuestions,
    error: questionsError,
  } = useQuery<QuestionsResponse>({
    queryKey: ["feedbackQuestions", giverId, receiverId, surveyType],
    queryFn: () => getQuestions(giverId, receiverId, selfModeParam),
    enabled: canQueryQuestions,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setReceiverId("");
    setStartTime(null);
    setLastQuestionReceiver(null);
    setShowSuccess(false);
    form.reset({ receiverId: "", answers: {}, finalComment: "" });
  }, [form, surveyType]);

  useEffect(() => {
    if (!isSelfMode) return;
    const feedbackReceivers = receivers?.feedback_receivers || [];
    if (feedbackReceivers.length !== 1) return;

    const selfReceiverId = feedbackReceivers[0]?.feedback_receiver_id || "";
    if (!selfReceiverId || receiverId === selfReceiverId) return;

    setReceiverId(selfReceiverId);
    form.reset({ receiverId: selfReceiverId, answers: {}, finalComment: "" });
    setStartTime(null);
    setLastQuestionReceiver(null);
    setShowSuccess(false);
  }, [form, isSelfMode, receiverId, receivers]);

  useEffect(() => {
    if (
      questionsResp?.feedback_receiver_id &&
      questionsResp.feedback_receiver_id !== lastQuestionReceiver
    ) {
      setLastQuestionReceiver(questionsResp.feedback_receiver_id);
      form.reset({ receiverId, answers: {} });
      setStartTime(Date.now());
    }
  }, [form, lastQuestionReceiver, questionsResp, receiverId]);

  useEffect(() => {
    if (questionsResp?.competency) {
      console.log("En düşük puanlı yetkinlik:", questionsResp.competency);
    }
  }, [questionsResp]);

  const sortedQuestions = useMemo(
    () =>
      (questionsResp?.questions || [])
        .slice()
        .sort((a, b) => a.order - b.order),
    [questionsResp],
  );

  const submitMutation = useMutation({
    mutationFn: submitSurvey,
    onSuccess: (data) => {
      form.reset({ receiverId, answers: {} });
      setStartTime(Date.now());
      setShowSuccess(true);
      if (questionsResp?.competency?.competency_id) {
        queryClient.invalidateQueries({
          queryKey: ["feedbackQuestions", giverId, receiverId, surveyType],
        });
      }
    },
    onError: (error) => {
      toast.error(formatApiError(error));
    },
  });

  const handleReceiverChange = (value: string) => {
    setReceiverId(value);
    form.reset({ receiverId: value, answers: {}, finalComment: "" });
    setStartTime(null);
    setLastQuestionReceiver(null);
    setShowSuccess(false);

    if (giverId && canQuery) {
      queryClient.prefetchQuery({
        queryKey: ["feedbackQuestions", giverId, value, surveyType],
        queryFn: () => getQuestions(giverId, value, selfModeParam),
      });
    }
  };

  const validateBeforeSubmit = (values: FeedbackFormValues) => {
    for (const question of sortedQuestions) {
      const rawValue = values.answers?.[question.question_id];
      if (rawValue === undefined || rawValue === null || rawValue === "") {
        return "Lütfen tüm soruları yanıtlayın.";
      }

      const verdict = validateFeedbackAnswer(question, rawValue);
      if (verdict !== true) {
        return verdict;
      }
    }
    return null;
  };

  const onSubmit = (values: FeedbackFormValues) => {
    if (!questionsResp) return;

    const validationMessage = validateBeforeSubmit(values);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const answers = buildFeedbackSubmitAnswers(sortedQuestions, values.answers);

    const completion_time_seconds = startTime
      ? Math.round((Date.now() - startTime) / 1000)
      : undefined;
    const submitReceiverId = isSelfMode ? giverId : receiverId;

    const payload: SubmitSurveyPayload = {
      feedback_giver_id: giverId,
      feedback_receiver_id: submitReceiverId,
      competency_id: questionsResp.competency.competency_id,
      answers,
      channel: "in_app",
      completion_time_seconds,
    };

    if (isSelfMode) {
      payload.survey_type = "self";
    }

    const finalComment = values.finalComment?.trim();
    if (finalComment) {
      payload.free_text_general = finalComment;
    }

    submitMutation.mutate(payload);
  };

  const receiversEmpty =
    !loadingReceivers &&
    !receiversError &&
    receivers?.feedback_receivers?.length === 0;

  const formDisabled =
    submitMutation.isPending || loadingQuestions || !questionsResp;

  const answerErrors = form.formState.errors
    .answers as Record<string, { message?: string }> | undefined;

  const handleStartOver = () => {
    setReceiverId("");
    setStartTime(null);
    setLastQuestionReceiver(null);
    setShowSuccess(false);
    form.reset({ receiverId: "", answers: {}, finalComment: "" });
  };

  const selfReceiver =
    isSelfMode && receivers?.feedback_receivers?.length === 1
      ? receivers.feedback_receivers[0]
      : null;

  if (!giverId) {
    return (
      <FeedbackPageShell>
        <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-10 space-y-6 text-center">
          <div className="flex justify-center">
            <img src="/up.svg" alt="UP" className="h-16 sm:h-20 w-auto" />
          </div>
          <div className="bg-white/95 border border-gray-200 rounded-2xl shadow-sm px-6 sm:px-10 py-10 space-y-4">
            <p className="text-primary font-semibold font-poppins text-lg uppercase tracking-wide">
              404
            </p>
            <h1 className="text-4xl sm:text-5xl font-righteous text-title-black">
              Geçersiz geri bildirim bağlantısı
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 font-poppins max-w-2xl mx-auto">
              Geçersiz link.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-md bg-primary px-5 py-2 text-xl font-semibold text-white font-poppins shadow-sm hover:bg-blue-700 transition-colors"
              >
                Ana sayfaya dön
              </button>
            </div>
          </div>
        </div>
      </FeedbackPageShell>
    );
  }

  return (
    <FeedbackPageShell>
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <header className="bg-white/95 border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <img src="/up.svg" alt="UP" className="h-12 sm:h-16 w-auto" />
          <div className="flex-1 space-y-1">
            <div className="space-y-1">
              <h1 className="font-righteous text-3xl sm:text-4xl text-title-black">
                {isSelfMode ? "Öz Değerlendirme" : "Geri Bildirim Ver"}
              </h1>
              <p className="text-xl sm:text-2xl font-poppins text-text-description-gray">
                {isSelfMode
                  ? "Soruları yanıtla, kendini değerlendir, öz farkındalığını geliştir."
                  : "Bir ekip arkadaşı seç, soruları yanıtla ve geri bildirimi gönder."}
              </p>
            </div>
          </div>
        </header>

        {showSuccess ? (
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2 text-primary font-semibold font-poppins">
              Geri bildirimin ulaştı!
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-righteous text-title-black">
                Teşekkürler
              </h2>
              <p className="text-xl sm:text-2xl text-gray-700 font-poppins max-w-2xl mx-auto">
                {isSelfMode
                  ? "Yanıtların kaydedildi. İstersen öz değerlendirme anketini yeniden başlatabilirsin."
                  : "Yanıtların kaydedildi. Başka bir ekip arkadaşın için yeni bir anket başlatabilirsin."}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleStartOver}
                className="rounded-md bg-primary px-5 py-2 text-xl font-semibold text-white font-poppins shadow-sm hover:bg-blue-700 transition-colors"
              >
                {isSelfMode ? "Öz değerlendirmeyi yeniden başlat" : "Yeni geri bildirim başlat"}
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-title-black text-2xl font-semibold font-poppins">
                  {isSelfMode ? "Değerlendirilen kişi" : "Değerlendirilecek kişiyi seç"}
                </p>
                {loadingReceivers && (
                  <div className="h-4 w-20 rounded bg-primary/20 animate-pulse" />
                )}
              </div>

              {receiversError && (
                <p className="text-xl text-red-600 font-poppins">
                  {formatApiError(receiversError)}
                </p>
              )}

              {receiversEmpty && (
                <p className="text-xl text-gray-600 font-poppins">
                  {isSelfMode
                    ? "Öz değerlendirme için kullanıcı bilgisi bulunamadı."
                    : "Şu anda değerlendirebileceğin kimse yok. Bir alıcı atanınca haber vereceğiz."}
                </p>
              )}

              {loadingReceivers ? (
                <LottieSpinner size={140} className="py-6" />
              ) : isSelfMode && selfReceiver ? (
                <div className="rounded-md border border-gray-300 bg-gray-50 px-4 py-3">
                  <p className="text-xl sm:text-2xl text-title-black font-poppins">
                    {formatReceiverLabel(selfReceiver)}
                  </p>
                  <p className="text-sm sm:text-base text-gray-600 font-poppins mt-1">
                    Öz değerlendirme modunda alıcı otomatik seçilir.
                  </p>
                </div>
              ) : receivers?.feedback_receivers?.length ? (
                <select
                  value={receiverId}
                  onChange={(event) => handleReceiverChange(event.target.value)}
                  disabled={!canQuery}
                  className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl sm:text-2xl text-title-black font-poppins"
                >
                  <option value="">Seç...</option>
                  {receivers.feedback_receivers.map((receiver) => (
                    <option
                      key={receiver.feedback_receiver_id}
                      value={receiver.feedback_receiver_id}
                    >
                      {formatReceiverLabel(receiver)}
                    </option>
                  ))}
                </select>
              ) : !receiversEmpty ? (
                <p className="text-xl text-gray-600 font-poppins">
                  Alıcılar burada görünecek.
                </p>
              ) : null}
            </section>

            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
              {loadingQuestions && receiverId ? (
                <LottieSpinner size={160} className="py-8" />
              ) : null}

              {!receiverId && (
                <p className="text-xl text-gray-600 font-poppins">
                  {isSelfMode
                    ? "Sorular hazırlanıyor. Öz değerlendirme alıcısı otomatik seçilecek."
                    : "Yetkinlik ve soruları görmek için bir alıcı seç."}
                </p>
              )}

              {questionsError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-xl text-red-700 font-poppins">
                    {formatApiError(questionsError)}
                  </p>
                </div>
              )}

              {questionsResp && (
                <div className="space-y-4">
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    {sortedQuestions.map((question) => {
                      const errorMessage =
                        answerErrors?.[question.question_id]?.message;
                      const questionValue =
                        form.watch(`answers.${question.question_id}`) || "";
                      const questionScaleMin = getQuestionScaleMin(question);
                      const questionScaleMax = getQuestionScaleMax(question);
                      const parsedPercentageSliderValue =
                        parsePercentageValue(questionValue);
                      const percentageSliderValue =
                        questionValue === ""
                          ? String(questionScaleMin ?? 0)
                          : Number.isFinite(parsedPercentageSliderValue)
                            ? String(parsedPercentageSliderValue)
                            : String(questionScaleMin ?? 0);

                      return (
                        <div key={question.question_id} className="space-y-1.5">
                          <label className="block text-title-black text-2xl sm:text-3xl font-semibold font-poppins">
                            {question.order}. {question.question_text}
                          </label>
                          {question.type === "likert" ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {Array.from({
                                  length:
                                    (questionScaleMax ?? 5) -
                                    (questionScaleMin ?? 1) +
                                    1,
                                }).map((_, idx) => {
                                  const value = (questionScaleMin ?? 1) + idx;
                                  const current = Number(questionValue || 0);
                                  const active = current >= value;
                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() =>
                                        form.setValue(
                                          `answers.${question.question_id}`,
                                          String(value),
                                          {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                          },
                                        )
                                      }
                                      className="p-1 rounded focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none"
                                      aria-label={
                                        LIKERT_LEVEL_LABELS[value]
                                          ? `Puan ${value} - ${LIKERT_LEVEL_LABELS[value]}`
                                          : `Puan ${value}`
                                      }
                                    >
                                      <Star
                                        className="h-8 w-8 sm:h-9 sm:w-9"
                                        strokeWidth={1.5}
                                        fill={active ? "#fbbf24" : "transparent"}
                                        color={active ? "#f59e0b" : "#d1d5db"}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                              <input
                                type="hidden"
                                {...form.register(
                                  `answers.${question.question_id}`,
                                  {
                                    validate: (value) =>
                                      validateFeedbackAnswer(question, value),
                                  },
                                )}
                              />
                            </div>
                          ) : question.type === "percentage" ? (
                            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                              <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-5">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-semibold text-sky-800">
                                    %
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={questionValue}
                                    onChange={(event) =>
                                      form.setValue(
                                        `answers.${question.question_id}`,
                                        sanitizePercentageInput(event.target.value),
                                        {
                                          shouldValidate: true,
                                          shouldDirty: true,
                                        },
                                      )
                                    }
                                    placeholder="0"
                                    className="w-28 rounded-xl border border-sky-200 bg-white px-3 py-2 text-center text-lg sm:text-xl text-title-black font-poppins shadow-sm outline-none transition focus:border-sky-400"
                                  />
                                </div>
                                <div className="flex w-full max-w-3xl items-center gap-4">
                                  <input
                                    type="range"
                                    min={questionScaleMin ?? 0}
                                    max={questionScaleMax ?? 100}
                                    step="0.1"
                                    value={percentageSliderValue}
                                    style={{ accentColor: PERCENTAGE_SLIDER_COLOR }}
                                    onChange={(event) =>
                                      form.setValue(
                                        `answers.${question.question_id}`,
                                        event.target.value.replace(".", ","),
                                        {
                                          shouldValidate: true,
                                          shouldDirty: true,
                                        },
                                      )
                                    }
                                    className="percentage-slider h-3 w-full cursor-pointer rounded-full"
                                  />
                                  <div className="min-w-fit text-sm text-sky-900/70 font-poppins">
                                    {`${questionScaleMin ?? 0} - ${questionScaleMax ?? 100}`}
                                  </div>
                                </div>
                              </div>
                              <input
                                type="hidden"
                                {...form.register(
                                  `answers.${question.question_id}`,
                                  {
                                    validate: (value) =>
                                      validateFeedbackAnswer(question, value),
                                  },
                                )}
                              />
                            </div>
                          ) : (
                            <textarea
                              rows={4}
                              maxLength={MAX_FEEDBACK_FREE_TEXT}
                              className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl sm:text-2xl text-title-black font-poppins"
                              {...form.register(
                                `answers.${question.question_id}`,
                                {
                                  required: "Bu soru zorunlu.",
                                  maxLength: {
                                    value: MAX_FEEDBACK_FREE_TEXT,
                                    message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
                                  },
                                },
                              )}
                            />
                          )}
                          <p className="text-lg text-gray-600 font-poppins">
                            {question.type === "likert" ? (
                              <span>{LIKERT_GUIDE_TEXT}</span>
                            ) : question.type === "percentage" ? (
                              <span>{PERCENTAGE_GUIDE_TEXT}</span>
                            ) : (
                              `${MAX_FEEDBACK_FREE_TEXT - (form.watch(
                                `answers.${question.question_id}`,
                              )?.length || 0)} karakter kaldı`
                            )}
                          </p>
                          {errorMessage ? (
                            <p className="text-lg text-red-600 font-poppins">
                              {errorMessage}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="space-y-2">
                      <label className="block text-title-black text-2xl sm:text-3xl font-semibold font-poppins">
                        Eklemek istediğin not var mı?
                      </label>
                      <textarea
                        rows={4}
                        maxLength={MAX_FEEDBACK_FREE_TEXT}
                        className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl sm:text-2xl text-title-black font-poppins"
                        placeholder="İsteğe bağlı"
                        {...form.register("finalComment", {
                          maxLength: {
                            value: MAX_FEEDBACK_FREE_TEXT,
                            message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
                          },
                        })}
                      />
                      <p className="text-lg text-gray-600 font-poppins">
                        {MAX_FEEDBACK_FREE_TEXT -
                          (form.watch("finalComment")?.length || 0)}{" "}
                        karakter kaldı.
                      </p>
                      {form.formState.errors.finalComment?.message ? (
                        <p className="text-lg text-red-600 font-poppins">
                          {form.formState.errors.finalComment?.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={
                          formDisabled ||
                          submitMutation.isPending ||
                          !form.formState.isValid
                        }
                        className={`rounded-md px-5 py-2 text-xl font-semibold font-poppins shadow-sm transition-colors ${
                          formDisabled || submitMutation.isPending || !form.formState.isValid
                            ? "bg-[#99BCFF] text-white cursor-not-allowed"
                            : "bg-primary text-white hover:bg-blue-700"
                        }`}
                      >
                        {submitMutation.isPending ? "Gönderiliyor..." : "Geri bildirimi gönder"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </FeedbackPageShell>
  );
}

export default function FeedbackPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackPageContent />
    </QueryClientProvider>
  );
}
