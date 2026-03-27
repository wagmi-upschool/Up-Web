"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type UseFormReturn, useForm } from "react-hook-form";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Frown, Smile, Star } from "lucide-react";
import toast from "react-hot-toast";
import {
  type FeedbackCompetency,
  type FeedbackModuleKey,
  type FeedbackQuestion,
  type FeedbackQuestionModule,
  type FeedbackReceiver,
  type FeedbackSurveyType,
  type QuestionsResponse,
  type SubmitSurveyPayload,
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

type FeedbackTab = FeedbackModuleKey;

type ModuleFormValues = {
  answers: Record<string, string>;
  finalComment: string;
};

type ModuleStartTimes = Record<FeedbackTab, number | null>;
type ModuleSuccessState = Record<FeedbackTab, boolean>;

type NormalizedFeedbackModule = {
  available: boolean;
  competency?: FeedbackCompetency;
  questions: FeedbackQuestion[];
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
const VALUES_OPTION_LABELS = {
  did: "Yaptı",
  didnt: "Yapmadı",
} as const;

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

function createEmptyModule(): NormalizedFeedbackModule {
  return { available: false, questions: [] };
}

function normalizeFeedbackModule(
  module: FeedbackQuestionModule | undefined,
): NormalizedFeedbackModule {
  if (!module) return createEmptyModule();

  return {
    available: module.available,
    competency: module.competency,
    questions: module.questions || [],
  };
}

function normalizeQuestionsResponse(
  response?: QuestionsResponse,
): Record<FeedbackTab, NormalizedFeedbackModule> {
  if (!response) {
    return {
      survey: createEmptyModule(),
      values: createEmptyModule(),
    };
  }

  const legacySurveyAvailable = Boolean(
    response.competency || response.questions?.length,
  );

  const survey =
    response.feedback_modules?.survey ||
    ({
      available: legacySurveyAvailable,
      competency: response.competency,
      questions: response.questions || [],
    } satisfies FeedbackQuestionModule);

  const values =
    response.feedback_modules?.values ||
    ({
      available: false,
      questions: [],
    } satisfies FeedbackQuestionModule);

  return {
    survey: normalizeFeedbackModule(survey),
    values: normalizeFeedbackModule(values),
  };
}

function sortQuestions(questions: FeedbackQuestion[]) {
  return questions.slice().sort((a, b) => a.order - b.order);
}

function getSubmitButtonLabel(module: FeedbackTab) {
  return module === "survey"
    ? "Anket Gönder"
    : "Davranış Değerlendirmesini Gönder";
}

function getSuccessCopy(module: FeedbackTab) {
  return module === "survey"
    ? "Anket yanıtların kaydedildi."
    : "Davranış değerlendirmesi kaydedildi.";
}

function validateRequiredModuleAnswers(
  questions: FeedbackQuestion[],
  answers: Record<string, string>,
) {
  for (const question of questions) {
    const rawValue = answers[question.question_id];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return "Lütfen tüm soruları yanıtlayın.";
    }

    const verdict = validateFeedbackAnswer(question, rawValue);
    if (verdict !== true) {
      return verdict;
    }
  }

  return null;
}

function validateOptionalModuleAnswers(
  questions: FeedbackQuestion[],
  answers: Record<string, string>,
) {
  let answeredQuestionCount = 0;

  for (const question of questions) {
    const rawValue = answers[question.question_id];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    answeredQuestionCount += 1;
    const verdict = validateFeedbackAnswer(question, rawValue);
    if (verdict !== true) {
      return verdict;
    }
  }

  if (answeredQuestionCount === 0) {
    return "Lütfen en az bir davranış ilkesi seçin.";
  }

  return null;
}

function getCompletionTimeSeconds(startTime: number | null) {
  if (!startTime) return undefined;
  return Math.round((Date.now() - startTime) / 1000);
}

function FeedbackPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/bg-df.png')] bg-cover bg-center bg-no-repeat"
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

function QuestionField({
  form,
  module,
  question,
}: {
  form: UseFormReturn<ModuleFormValues>;
  module: FeedbackTab;
  question: FeedbackQuestion;
}) {
  const questionValue = form.watch(`answers.${question.question_id}`) || "";
  const answerErrors = form.formState.errors
    .answers as Record<string, { message?: string }> | undefined;
  const errorMessage = answerErrors?.[question.question_id]?.message;

  const questionScaleMin = getQuestionScaleMin(question);
  const questionScaleMax = getQuestionScaleMax(question);
  const parsedPercentageSliderValue = parsePercentageValue(questionValue);
  const percentageSliderValue =
    questionValue === ""
      ? String(questionScaleMin ?? 0)
      : Number.isFinite(parsedPercentageSliderValue)
        ? String(parsedPercentageSliderValue)
        : String(questionScaleMin ?? 0);

  return (
    <div className="space-y-2">
      <label className="block text-2xl font-semibold text-title-black font-poppins sm:text-3xl">
        {question.order}. {question.question_text}
      </label>

      {question.type === "likert" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {Array.from({
              length: (questionScaleMax ?? 5) - (questionScaleMin ?? 1) + 1,
            }).map((_, index) => {
              const value = (questionScaleMin ?? 1) + index;
              const current = Number(questionValue || 0);
              const active = current >= value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    form.setValue(`answers.${question.question_id}`, String(value), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="rounded p-1 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
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
            {...form.register(`answers.${question.question_id}`, {
              validate: (value) => validateFeedbackAnswer(question, value),
            })}
          />
        </div>
      ) : question.type === "percentage" ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-5">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-sky-800">%</span>
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
                className="w-28 rounded-xl border border-sky-200 bg-white px-3 py-2 text-center text-lg text-title-black font-poppins shadow-sm outline-none transition focus:border-sky-400 sm:text-xl"
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
            {...form.register(`answers.${question.question_id}`, {
              validate: (value) => validateFeedbackAnswer(question, value),
            })}
          />
        </div>
      ) : question.type === "boolean" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {(["did", "didnt"] as const).map((value) => {
              const active = questionValue === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    form.setValue(`answers.${question.question_id}`, value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className={`flex min-w-[120px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-lg font-semibold font-poppins transition-colors ${
                    active
                      ? value === "did"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-rose-600 bg-rose-50 text-rose-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                  aria-pressed={active}
                >
                  {value === "did" ? (
                    <Smile className="h-5 w-5" />
                  ) : (
                    <Frown className="h-5 w-5" />
                  )}
                  <span>{VALUES_OPTION_LABELS[value]}</span>
                </button>
              );
            })}
          </div>
          <input
            type="hidden"
            {...form.register(`answers.${question.question_id}`, {
              validate: (value) => {
                if (module === "values" && (!value || value === "")) {
                  return true;
                }

                return validateFeedbackAnswer(question, value);
              },
            })}
          />
        </div>
      ) : (
        <textarea
          rows={4}
          maxLength={MAX_FEEDBACK_FREE_TEXT}
          className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl text-title-black font-poppins sm:text-2xl"
          {...form.register(`answers.${question.question_id}`, {
            required: "Bu soru zorunlu.",
            maxLength: {
              value: MAX_FEEDBACK_FREE_TEXT,
              message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
            },
          })}
        />
      )}

      <p className="text-lg text-gray-600 font-poppins">
        {question.type === "likert" ? (
          <span>{LIKERT_GUIDE_TEXT}</span>
        ) : question.type === "percentage" ? (
          <span>{PERCENTAGE_GUIDE_TEXT}</span>
        ) : question.type === "free_text" ? (
          `${MAX_FEEDBACK_FREE_TEXT - questionValue.length} karakter kaldı`
        ) : (
          "İstersen soruyu boş bırakabilirsin."
        )}
      </p>

      {errorMessage ? (
        <p className="text-lg text-red-600 font-poppins">{errorMessage}</p>
      ) : null}
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
  const [activeTab, setActiveTab] = useState<FeedbackTab>("survey");
  const [lastQuestionReceiver, setLastQuestionReceiver] = useState<string | null>(
    null,
  );
  const [moduleStartTimes, setModuleStartTimes] = useState<ModuleStartTimes>({
    survey: null,
    values: null,
  });
  const [moduleSuccess, setModuleSuccess] = useState<ModuleSuccessState>({
    survey: false,
    values: false,
  });

  const queryClient = useQueryClient();
  const surveyForm = useForm<ModuleFormValues>({
    defaultValues: { answers: {}, finalComment: "" },
    mode: "onChange",
  });
  const valuesForm = useForm<ModuleFormValues>({
    defaultValues: { answers: {}, finalComment: "" },
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

  const modules = useMemo(
    () => normalizeQuestionsResponse(questionsResp),
    [questionsResp],
  );
  const surveyModule = modules.survey;
  const valuesModule = modules.values;
  const surveyQuestions = useMemo(
    () => sortQuestions(surveyModule.questions),
    [surveyModule.questions],
  );
  const valuesQuestions = useMemo(
    () => sortQuestions(valuesModule.questions),
    [valuesModule.questions],
  );
  const valuesAvailable = valuesModule.available;
  const activeModule = activeTab === "survey" ? surveyModule : valuesModule;
  const activeQuestions = activeTab === "survey" ? surveyQuestions : valuesQuestions;

  const surveyFinalComment = surveyForm.watch("finalComment");
  const valuesAnswers = valuesForm.watch("answers");
  const valuesAnsweredCount = valuesQuestions.filter((question) => {
    const answer = valuesAnswers?.[question.question_id];
    return answer !== undefined && answer !== null && answer !== "";
  }).length;

  useEffect(() => {
    setReceiverId("");
    setActiveTab("survey");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    surveyForm.reset({ answers: {}, finalComment: "" });
    valuesForm.reset({ answers: {}, finalComment: "" });
  }, [surveyForm, surveyType, valuesForm]);

  useEffect(() => {
    if (!isSelfMode) return;
    const feedbackReceivers = receivers?.feedback_receivers || [];
    if (feedbackReceivers.length !== 1) return;

    const selfReceiverId = feedbackReceivers[0]?.feedback_receiver_id || "";
    if (!selfReceiverId || receiverId === selfReceiverId) return;

    setReceiverId(selfReceiverId);
    setActiveTab("survey");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    surveyForm.reset({ answers: {}, finalComment: "" });
    valuesForm.reset({ answers: {}, finalComment: "" });
  }, [isSelfMode, receiverId, receivers, surveyForm, valuesForm]);

  useEffect(() => {
    if (
      questionsResp?.feedback_receiver_id &&
      questionsResp.feedback_receiver_id !== lastQuestionReceiver
    ) {
      setLastQuestionReceiver(questionsResp.feedback_receiver_id);
      setActiveTab("survey");
      setModuleStartTimes({ survey: Date.now(), values: null });
      setModuleSuccess({ survey: false, values: false });
      surveyForm.reset({ answers: {}, finalComment: "" });
      valuesForm.reset({ answers: {}, finalComment: "" });
    }
  }, [lastQuestionReceiver, questionsResp, surveyForm, valuesForm]);

  useEffect(() => {
    if (!valuesAvailable && activeTab === "values") {
      setActiveTab("survey");
    }
  }, [activeTab, valuesAvailable]);

  useEffect(() => {
    if (!questionsResp || !receiverId || !activeModule.available) return;
    if (moduleStartTimes[activeTab] !== null) return;

    setModuleStartTimes((current) => ({
      ...current,
      [activeTab]: Date.now(),
    }));
  }, [activeModule.available, activeTab, moduleStartTimes, questionsResp, receiverId]);

  const handleModuleSubmitSuccess = (module: FeedbackTab) => {
    if (module === "survey") {
      surveyForm.reset({ answers: {}, finalComment: "" });
    } else {
      valuesForm.reset({ answers: {}, finalComment: "" });
    }

    setModuleSuccess((current) => ({ ...current, [module]: true }));
    setModuleStartTimes((current) => ({ ...current, [module]: Date.now() }));
    toast.success(getSuccessCopy(module));
    queryClient.invalidateQueries({
      queryKey: ["feedbackQuestions", giverId, receiverId, surveyType],
    });
  };

  const surveySubmitMutation = useMutation({
    mutationFn: submitSurvey,
    onSuccess: () => handleModuleSubmitSuccess("survey"),
    onError: (error) => {
      toast.error(formatApiError(error));
    },
  });

  const valuesSubmitMutation = useMutation({
    mutationFn: submitSurvey,
    onSuccess: () => handleModuleSubmitSuccess("values"),
    onError: (error) => {
      toast.error(formatApiError(error));
    },
  });

  const handleReceiverChange = (value: string) => {
    setReceiverId(value);
    setActiveTab("survey");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    surveyForm.reset({ answers: {}, finalComment: "" });
    valuesForm.reset({ answers: {}, finalComment: "" });

    if (giverId && canQuery) {
      queryClient.prefetchQuery({
        queryKey: ["feedbackQuestions", giverId, value, surveyType],
        queryFn: () => getQuestions(giverId, value, selfModeParam),
      });
    }
  };

  const buildBasePayload = (
    module: FeedbackTab,
    competencyId: string,
    answers: SubmitSurveyPayload["answers"],
  ): SubmitSurveyPayload => {
    const submitReceiverId = isSelfMode ? giverId : receiverId;

    return {
      feedback_giver_id: giverId,
      feedback_receiver_id: submitReceiverId,
      competency_id: competencyId,
      feedback_module: module,
      answers,
      survey_type: surveyType,
      channel: "in_app",
      completion_time_seconds: getCompletionTimeSeconds(moduleStartTimes[module]),
    };
  };

  const handleSurveySubmit = (values: ModuleFormValues) => {
    if (!surveyModule.competency) return;

    const validationMessage = validateRequiredModuleAnswers(
      surveyQuestions,
      values.answers,
    );
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const answers = buildFeedbackSubmitAnswers(surveyQuestions, values.answers);
    const payload = buildBasePayload(
      "survey",
      surveyModule.competency.competency_id,
      answers,
    );
    const finalComment = values.finalComment?.trim();

    if (finalComment) {
      payload.free_text_general = finalComment;
    }

    setModuleSuccess((current) => ({ ...current, survey: false }));
    surveySubmitMutation.mutate(payload);
  };

  const handleValuesSubmit = (values: ModuleFormValues) => {
    if (!valuesModule.competency) return;

    const validationMessage = validateOptionalModuleAnswers(
      valuesQuestions,
      values.answers,
    );
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const answers = buildFeedbackSubmitAnswers(valuesQuestions, values.answers, {
      omitEmpty: true,
    });
    const payload = buildBasePayload(
      "values",
      valuesModule.competency.competency_id,
      answers,
    );

    setModuleSuccess((current) => ({ ...current, values: false }));
    valuesSubmitMutation.mutate(payload);
  };

  const receiversEmpty =
    !loadingReceivers &&
    !receiversError &&
    receivers?.feedback_receivers?.length === 0;
  const selfReceiver =
    isSelfMode && receivers?.feedback_receivers?.length === 1
      ? receivers.feedback_receivers[0]
      : null;
  const activeSubmitMutation =
    activeTab === "survey" ? surveySubmitMutation : valuesSubmitMutation;
  const formDisabled =
    activeSubmitMutation.isPending || loadingQuestions || !receiverId || !questionsResp;
  const surveySubmitDisabled =
    formDisabled ||
    !surveyModule.available ||
    !surveyModule.competency ||
    !surveyQuestions.length ||
    !surveyForm.formState.isValid;
  const valuesSubmitDisabled =
    formDisabled ||
    !valuesAvailable ||
    !valuesModule.competency ||
    !valuesQuestions.length ||
    valuesAnsweredCount === 0;

  if (!giverId) {
    return (
      <FeedbackPageShell>
        <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-3 py-10 text-center sm:px-4">
          <div className="flex justify-center">
            <Image
              src="/up.svg"
              alt="UP"
              width={80}
              height={80}
              className="h-16 w-auto sm:h-20"
            />
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/95 px-6 py-10 shadow-sm sm:px-10">
            <p className="text-lg font-semibold uppercase tracking-wide text-primary font-poppins">
              404
            </p>
            <h1 className="text-4xl text-title-black font-righteous sm:text-5xl">
              Geçersiz geri bildirim bağlantısı
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-700 font-poppins sm:text-2xl">
              Geçersiz link.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-md bg-primary px-5 py-2 text-xl font-semibold text-white font-poppins shadow-sm transition-colors hover:bg-blue-700"
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
      <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        <header className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-sm sm:flex-row sm:items-start sm:gap-4">
          <Image
            src="/up.svg"
            alt="UP"
            width={64}
            height={64}
            className="h-12 w-auto sm:h-16"
          />
          <div className="flex-1 space-y-1">
            <div className="space-y-1">
              <h1 className="font-righteous text-3xl sm:text-4xl text-title-black">
                {isSelfMode ? "Öz Değerlendirme" : "İleri Bildirim Ver"}
              </h1>
              <p className="text-xl text-text-description-gray font-poppins sm:text-2xl">
                {isSelfMode
                  ? "Soruları yanıtla, kendini değerlendir, öz farkındalığını geliştir."
                  : "Bir ekip arkadaşı seç, soruları yanıtla ve ileri bildirimi gönder."}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold text-title-black font-poppins">
                {isSelfMode ? "Değerlendirilen kişi" : "Değerlendirilecek kişiyi seç"}
              </p>
              {loadingReceivers && (
                <div className="h-4 w-20 animate-pulse rounded bg-primary/20" />
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
                <p className="text-xl text-title-black font-poppins sm:text-2xl">
                  {formatReceiverLabel(selfReceiver)}
                </p>
                <p className="mt-1 text-sm text-gray-600 font-poppins sm:text-base">
                  Öz değerlendirme modunda alıcı otomatik seçilir.
                </p>
              </div>
            ) : receivers?.feedback_receivers?.length ? (
              <select
                value={receiverId}
                onChange={(event) => handleReceiverChange(event.target.value)}
                disabled={!canQuery}
                className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl text-title-black font-poppins sm:text-2xl"
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

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

            {questionsResp && receiverId ? (
              <div className="space-y-4">
                {valuesAvailable ? (
                  <div className="grid gap-2 rounded-2xl bg-[#EEF3FF] p-1 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("survey")}
                      className={`rounded-2xl px-4 py-3 text-xl font-semibold font-poppins transition-colors ${
                        activeTab === "survey"
                          ? "bg-white text-title-black shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      Anket Soruları
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("values")}
                      className={`rounded-2xl px-4 py-3 text-xl font-semibold font-poppins transition-colors ${
                        activeTab === "values"
                          ? "bg-white text-title-black shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      Davranış İlkeleri
                    </button>
                  </div>
                ) : null}

                {moduleSuccess[activeTab] ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-lg font-semibold text-emerald-700 font-poppins">
                      {getSuccessCopy(activeTab)}
                    </p>
                  </div>
                ) : null}

                {activeModule.competency?.name ? (
                  <div className="space-y-1">
                    <p className="text-lg text-gray-600 font-poppins">
                      {activeModule.competency.name}
                    </p>
                    {activeModule.competency.description ? (
                      <p className="text-base text-gray-500 font-poppins">
                        {activeModule.competency.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!activeModule.available ? (
                  <p className="text-xl text-gray-600 font-poppins">
                    {activeTab === "survey"
                      ? "Şu anda gösterilebilecek anket sorusu yok."
                      : "Bu kişi için davranış ilkeleri modülü bulunmuyor."}
                  </p>
                ) : !activeQuestions.length ? (
                  <p className="text-xl text-gray-600 font-poppins">
                    {activeTab === "survey"
                      ? "Anket soruları bulunamadı."
                      : "Davranış ilkeleri soruları bulunamadı."}
                  </p>
                ) : activeTab === "survey" ? (
                  <form
                    className="space-y-4"
                    onSubmit={surveyForm.handleSubmit(handleSurveySubmit)}
                  >
                    {surveyQuestions.map((question) => (
                      <QuestionField
                        key={question.question_id}
                        form={surveyForm}
                        module="survey"
                        question={question}
                      />
                    ))}

                    <div className="space-y-2">
                      <label className="block text-2xl font-semibold text-title-black font-poppins sm:text-3xl">
                        Eklemek istediğin not var mı?
                      </label>
                      <textarea
                        rows={4}
                        maxLength={MAX_FEEDBACK_FREE_TEXT}
                        className="w-full rounded-md border border-gray-300 bg-white p-3 text-xl text-title-black font-poppins sm:text-2xl"
                        placeholder="İsteğe bağlı"
                        {...surveyForm.register("finalComment", {
                          maxLength: {
                            value: MAX_FEEDBACK_FREE_TEXT,
                            message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
                          },
                        })}
                      />
                      <p className="text-lg text-gray-600 font-poppins">
                        {MAX_FEEDBACK_FREE_TEXT - surveyFinalComment.length} karakter
                        kaldı.
                      </p>
                      {surveyForm.formState.errors.finalComment?.message ? (
                        <p className="text-lg text-red-600 font-poppins">
                          {surveyForm.formState.errors.finalComment.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={surveySubmitDisabled}
                        className={`rounded-md px-5 py-2 text-xl font-semibold font-poppins shadow-sm transition-colors ${
                          surveySubmitDisabled
                            ? "cursor-not-allowed bg-[#99BCFF] text-white"
                            : "bg-primary text-white hover:bg-blue-700"
                        }`}
                      >
                        {surveySubmitMutation.isPending
                          ? "Gönderiliyor..."
                          : getSubmitButtonLabel("survey")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={valuesForm.handleSubmit(handleValuesSubmit)}
                  >
                    {valuesQuestions.map((question) => (
                      <QuestionField
                        key={question.question_id}
                        form={valuesForm}
                        module="values"
                        question={question}
                      />
                    ))}

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={valuesSubmitDisabled}
                        className={`rounded-md px-5 py-2 text-xl font-semibold font-poppins shadow-sm transition-colors ${
                          valuesSubmitDisabled
                            ? "cursor-not-allowed bg-[#9FD7C7] text-white"
                            : "bg-[#0B7A57] text-white hover:bg-[#096647]"
                        }`}
                      >
                        {valuesSubmitMutation.isPending
                          ? "Gönderiliyor..."
                          : getSubmitButtonLabel("values")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </section>
        </div>
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
