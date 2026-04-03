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
import { Star } from "lucide-react";
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

function getPreferredActiveTab(
  surveyVisible: boolean,
  valuesVisible: boolean,
): FeedbackTab {
  if (surveyVisible) return "survey";
  if (valuesVisible) return "values";
  return "survey";
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
    return "Lütfen bir davranış ilkesi seçin.";
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
  const isValuesQuestion = module === "values";
  const containerClass = isValuesQuestion
    ? `relative overflow-hidden rounded-[14px] border bg-white px-4 py-3 transition-colors ${
        questionValue === "did"
          ? "border-emerald-600 bg-emerald-50"
          : questionValue === "didnt"
            ? "border-rose-600 bg-rose-50"
            : "border-gray-200"
      }`
    : "rounded-[14px] border border-gray-200 bg-white px-5 py-4";
  const labelClass = isValuesQuestion
    ? "block text-[13px] font-medium leading-6 text-title-black"
    : "block text-[13px] font-medium leading-6 text-title-black";

  return (
    <div className={containerClass}>
      <label className={labelClass}>
        {question.order}. {question.question_text}
      </label>

      {question.type === "likert" ? (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap gap-1.5">
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
                  className="inline-flex rounded transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  aria-label={
                    LIKERT_LEVEL_LABELS[value]
                      ? `Puan ${value} - ${LIKERT_LEVEL_LABELS[value]}`
                      : `Puan ${value}`
                  }
                >
                  <Star
                    className="h-[26px] w-[26px]"
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
        <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
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
        <div className="mt-3 flex items-center gap-3">
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
                  className="group flex flex-col items-center gap-1"
                  aria-pressed={active}
                >
                  <span
                    className={`flex h-[50px] w-[50px] items-center justify-center rounded-full border-[1.5px] bg-gray-50 transition-transform duration-150 group-hover:scale-105 ${
                      active
                        ? value === "did"
                          ? "border-emerald-600 bg-emerald-100 text-emerald-700"
                          : "border-rose-600 bg-rose-100 text-rose-700"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    <Image
                      src={
                        value === "did"
                          ? "/up_face_mutlu_icon.svg"
                          : "/up_face_uzgun_icon.svg"
                      }
                      alt={VALUES_OPTION_LABELS[value]}
                      width={24}
                      height={24}
                      className={`${active ? "" : "grayscale opacity-50"}`}
                    />
                  </span>
                  <span
                    className={`text-[11px] font-medium ${
                      active
                        ? value === "did"
                          ? "text-emerald-700"
                          : "text-rose-700"
                        : "text-gray-400"
                    }`}
                  >
                    {VALUES_OPTION_LABELS[value]}
                  </span>
                </button>
              );
            })}
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
          className="mt-3 w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-title-black outline-none transition-colors focus:border-primary"
          {...form.register(`answers.${question.question_id}`, {
            required: "Bu soru zorunlu.",
            maxLength: {
              value: MAX_FEEDBACK_FREE_TEXT,
              message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
            },
          })}
        />
      )}

      {question.type !== "boolean" ? (
        <p className="mt-2 text-[11px] text-gray-400">
          {question.type === "likert" ? (
            <span>{LIKERT_GUIDE_TEXT}</span>
          ) : question.type === "percentage" ? (
            <span>{PERCENTAGE_GUIDE_TEXT}</span>
          ) : (
            `${MAX_FEEDBACK_FREE_TEXT - questionValue.length} karakter kaldı`
          )}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
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
  const [selectedValuesQuestionId, setSelectedValuesQuestionId] = useState("");
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
  const [successOverlay, setSuccessOverlay] = useState({
    open: false,
    message: "",
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
  const selectedValuesQuestion = useMemo(
    () =>
      valuesQuestions.find(
        (question) => question.question_id === selectedValuesQuestionId,
      ) || null,
    [selectedValuesQuestionId, valuesQuestions],
  );
  const selectedValuesQuestions = useMemo(
    () => (selectedValuesQuestion ? [selectedValuesQuestion] : []),
    [selectedValuesQuestion],
  );
  const surveyTabVisible = Boolean(
    surveyModule.available &&
      surveyModule.competency &&
      surveyQuestions.length > 0,
  );
  const valuesTabVisible = Boolean(
    valuesModule.available &&
      valuesModule.competency &&
      valuesQuestions.length > 0,
  );
  const preferredActiveTab = getPreferredActiveTab(
    surveyTabVisible,
    valuesTabVisible,
  );
  const resolvedActiveTab =
    activeTab === "survey"
      ? surveyTabVisible
        ? "survey"
        : preferredActiveTab
      : valuesTabVisible
        ? "values"
        : preferredActiveTab;
  const showTabSwitcher = surveyTabVisible && valuesTabVisible;
  const valuesAvailable = valuesModule.available;
  const activeModule =
    resolvedActiveTab === "survey" ? surveyModule : valuesModule;
  const activeQuestions =
    resolvedActiveTab === "survey" ? surveyQuestions : valuesQuestions;

  const surveyFinalComment = surveyForm.watch("finalComment");
  const valuesAnswers = valuesForm.watch("answers");
  const selectedValuesAnswer = selectedValuesQuestionId
    ? valuesAnswers?.[selectedValuesQuestionId] || ""
    : "";

  useEffect(() => {
    setReceiverId("");
    setActiveTab("survey");
    setSelectedValuesQuestionId("");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    setSuccessOverlay({ open: false, message: "" });
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
    setSelectedValuesQuestionId("");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    setSuccessOverlay({ open: false, message: "" });
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
      setSelectedValuesQuestionId("");
      setModuleStartTimes({ survey: Date.now(), values: null });
      setModuleSuccess({ survey: false, values: false });
      setSuccessOverlay({ open: false, message: "" });
      surveyForm.reset({ answers: {}, finalComment: "" });
      valuesForm.reset({ answers: {}, finalComment: "" });
    }
  }, [lastQuestionReceiver, questionsResp, surveyForm, valuesForm]);

  useEffect(() => {
    if (activeTab !== resolvedActiveTab) {
      setActiveTab(resolvedActiveTab);
    }
  }, [activeTab, resolvedActiveTab]);

  useEffect(() => {
    if (!selectedValuesQuestionId) return;

    const questionStillExists = valuesQuestions.some(
      (question) => question.question_id === selectedValuesQuestionId,
    );

    if (!questionStillExists) {
      setSelectedValuesQuestionId("");
    }
  }, [selectedValuesQuestionId, valuesQuestions]);

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
    setSuccessOverlay({
      open: true,
      message: getSuccessCopy(module),
    });
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
    setSelectedValuesQuestionId("");
    setLastQuestionReceiver(null);
    setModuleStartTimes({ survey: null, values: null });
    setModuleSuccess({ survey: false, values: false });
    setSuccessOverlay({ open: false, message: "" });
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
      selectedValuesQuestions,
      values.answers,
    );
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const answers = buildFeedbackSubmitAnswers(
      selectedValuesQuestions,
      values.answers,
      {
        omitEmpty: true,
      },
    );
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
    resolvedActiveTab === "survey" ? surveySubmitMutation : valuesSubmitMutation;
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
    !selectedValuesQuestion ||
    !selectedValuesAnswer;

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
      <div className="relative z-10 mx-auto max-w-6xl space-y-3 px-2 pb-28 pt-5 sm:px-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 px-5 py-[18px] shadow-sm sm:flex-row sm:items-start sm:gap-4">
          <Image
            src="/up.svg"
            alt="UP"
            width={64}
            height={64}
            className="h-12 w-auto sm:h-16"
          />
          <div className="flex-1 space-y-1">
            <div className="space-y-1">
              <h1 className="text-[18px] font-bold tracking-[-0.3px] text-title-black">
                {isSelfMode ? "Öz Değerlendirme" : "İleri Bildirim Ver"}
              </h1>
              <p className="text-[13px] text-text-description-gray">
                {isSelfMode
                  ? "Soruları yanıtla, kendini değerlendir, öz farkındalığını geliştir."
                  : "Bir ekip arkadaşı seç, soruları yanıtla ve ileri bildirimi gönder."}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-5 py-[18px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-title-black">
                {isSelfMode ? "Değerlendirilen kişi" : "Değerlendirilecek kişiyi seç"}
              </p>
              {loadingReceivers && (
                <div className="h-4 w-20 animate-pulse rounded bg-primary/20" />
              )}
            </div>

            {receiversError && (
              <p className="text-sm text-red-600">
                {formatApiError(receiversError)}
              </p>
            )}

            {receiversEmpty && (
              <p className="text-sm text-gray-500">
                {isSelfMode
                  ? "Öz değerlendirme için kullanıcı bilgisi bulunamadı."
                  : "Şu anda değerlendirebileceğin kimse yok. Bir alıcı atanınca haber vereceğiz."}
              </p>
            )}

            {loadingReceivers ? (
              <LottieSpinner size={140} className="py-6" />
            ) : isSelfMode && selfReceiver ? (
              <div className="rounded-[10px] border border-gray-300 bg-gray-50 px-4 py-3">
                <p className="text-[15px] text-title-black">
                  {formatReceiverLabel(selfReceiver)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Öz değerlendirme modunda alıcı otomatik seçilir.
                </p>
              </div>
            ) : receivers?.feedback_receivers?.length ? (
              <select
                value={receiverId}
                onChange={(event) => handleReceiverChange(event.target.value)}
                disabled={!canQuery}
                className="w-full rounded-[10px] border border-gray-300 bg-white px-[14px] py-[13px] text-[15px] text-title-black"
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
              <p className="text-sm text-gray-500">
                Alıcılar burada görünecek.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            {loadingQuestions && receiverId ? (
              <LottieSpinner size={160} className="py-8" />
            ) : null}

            {!receiverId && (
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-[18px] text-[14px] text-gray-500">
                {isSelfMode
                  ? "Sorular hazırlanıyor. Öz değerlendirme alıcısı otomatik seçilecek."
                  : "Yetkinlik ve soruları görmek için bir alıcı seç."}
              </div>
            )}

            {questionsError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm text-red-700">
                  {formatApiError(questionsError)}
                </p>
              </div>
            )}

            {questionsResp && receiverId ? (
              <div className="space-y-4">
                {showTabSwitcher ? (
                  <div className="flex rounded-xl bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("survey")}
                      className={`flex-1 rounded-[9px] border px-4 py-[9px] text-[13px] font-medium transition-all ${
                        resolvedActiveTab === "survey"
                          ? "border-gray-200 bg-white text-title-black shadow-sm"
                          : "border-transparent bg-transparent text-gray-500"
                      }`}
                    >
                      Anket Soruları
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("values")}
                      className={`flex-1 rounded-[9px] border px-4 py-[9px] text-[13px] font-medium transition-all ${
                        resolvedActiveTab === "values"
                          ? "border-gray-200 bg-white text-title-black shadow-sm"
                          : "border-transparent bg-transparent text-gray-500"
                      }`}
                    >
                      Davranış İlkeleri
                    </button>
                  </div>
                ) : null}

                {activeModule.competency?.name ? (
                  <div className="space-y-1">
                    <p className="px-0.5 text-[12px] text-gray-500">
                      {activeModule.competency.name}
                    </p>
                  </div>
                ) : null}

                {!surveyTabVisible && !valuesTabVisible ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-[18px] text-[14px] text-gray-500">
                    Bu kişi için gösterilebilecek değerlendirme modülü bulunmuyor.
                  </div>
                ) : !activeModule.available ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-[18px] text-[14px] text-gray-500">
                    {resolvedActiveTab === "survey"
                      ? "Şu anda gösterilebilecek anket sorusu yok."
                      : "Bu kişi için davranış ilkeleri modülü bulunmuyor."}
                  </div>
                ) : !activeQuestions.length ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-[18px] text-[14px] text-gray-500">
                    {resolvedActiveTab === "survey"
                      ? "Anket soruları bulunamadı."
                      : "Davranış ilkeleri soruları bulunamadı."}
                  </div>
                ) : resolvedActiveTab === "survey" ? (
                  <form
                    id="survey-form"
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

                    <div className="rounded-[14px] border border-gray-200 bg-white px-5 py-4">
                      <label className="block text-[12px] font-medium text-gray-500">
                        Eklemek istediğin not var mı?
                      </label>
                      <textarea
                        rows={4}
                        maxLength={MAX_FEEDBACK_FREE_TEXT}
                        className="mt-2 w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-title-black outline-none transition-colors focus:border-primary"
                        placeholder="İsteğe bağlı..."
                        {...surveyForm.register("finalComment", {
                          maxLength: {
                            value: MAX_FEEDBACK_FREE_TEXT,
                            message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
                          },
                        })}
                      />
                      <p className="mt-2 text-[11px] text-gray-400">
                        {MAX_FEEDBACK_FREE_TEXT - surveyFinalComment.length} karakter
                        kaldı.
                      </p>
                      {surveyForm.formState.errors.finalComment?.message ? (
                        <p className="mt-2 text-xs text-red-600">
                          {surveyForm.formState.errors.finalComment.message}
                        </p>
                      ) : null}
                    </div>
                  </form>
                ) : (
                  <form
                    id="values-form"
                    className="space-y-4"
                    onSubmit={valuesForm.handleSubmit(handleValuesSubmit)}
                  >
                    <div className="rounded-[14px] border border-gray-200 bg-white px-5 py-4">
                      <label
                        htmlFor="values-question-select"
                        className="block text-[12px] font-medium text-gray-500"
                      >
                        Davranış ilkesi seç
                      </label>
                      <select
                        id="values-question-select"
                        value={selectedValuesQuestionId}
                        onChange={(event) =>
                          setSelectedValuesQuestionId(event.target.value)
                        }
                        disabled={formDisabled || !valuesQuestions.length}
                        className="mt-2 w-full rounded-[10px] border border-gray-300 bg-white px-[14px] py-[13px] text-[15px] text-title-black"
                      >
                        <option value="">Seç...</option>
                        {valuesQuestions.map((question) => (
                          <option
                            key={question.question_id}
                            value={question.question_id}
                          >
                            {question.order}. {question.question_text}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedValuesQuestion ? (
                      <QuestionField
                        key={selectedValuesQuestion.question_id}
                        form={valuesForm}
                        module="values"
                        question={selectedValuesQuestion}
                      />
                    ) : (
                      <div className="rounded-[14px] border border-dashed border-gray-200 bg-white px-5 py-4 text-[14px] text-gray-500">
                        Davranış ilkesini seçtikten sonra geri bildirimini verebilirsin.
                      </div>
                    )}

                    <div className="rounded-[14px] border border-gray-200 bg-white px-5 py-4">
                      <label className="block text-[12px] font-medium text-gray-500">
                        Eklemek istediğin not var mı?
                      </label>
                      <textarea
                        rows={4}
                        maxLength={MAX_FEEDBACK_FREE_TEXT}
                        className="mt-2 w-full rounded-[10px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-title-black outline-none transition-colors focus:border-primary"
                        placeholder="İsteğe bağlı..."
                        {...valuesForm.register("finalComment", {
                          maxLength: {
                            value: MAX_FEEDBACK_FREE_TEXT,
                            message: `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`,
                          },
                        })}
                      />
                      <p className="mt-2 text-[11px] text-gray-400">
                        {MAX_FEEDBACK_FREE_TEXT -
                          (valuesForm.watch("finalComment")?.length || 0)} karakter
                        kaldı.
                      </p>
                      {valuesForm.formState.errors.finalComment?.message ? (
                        <p className="mt-2 text-xs text-red-600">
                          {valuesForm.formState.errors.finalComment.message}
                        </p>
                      ) : null}
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </section>
        </div>

        {receiverId &&
        questionsResp &&
        activeModule.available &&
        (resolvedActiveTab === "survey"
          ? surveyQuestions.length > 0
          : valuesQuestions.length > 0) ? (
          <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto max-w-6xl">
              <button
                type="submit"
                form={resolvedActiveTab === "survey" ? "survey-form" : "values-form"}
                disabled={
                  resolvedActiveTab === "survey"
                    ? surveySubmitDisabled
                    : valuesSubmitDisabled
                }
                className={`w-full rounded-xl px-5 py-3.5 text-[15px] font-medium text-white transition-opacity ${
                  resolvedActiveTab === "survey"
                    ? surveySubmitDisabled
                      ? "cursor-not-allowed bg-[#99BCFF]"
                      : "bg-primary hover:opacity-90"
                    : valuesSubmitDisabled
                      ? "cursor-not-allowed bg-[#9FD7C7]"
                      : "bg-[#0F6E56] hover:opacity-90"
                }`}
              >
                {resolvedActiveTab === "survey"
                  ? surveySubmitMutation.isPending
                    ? "Gönderiliyor..."
                    : getSubmitButtonLabel("survey")
                  : valuesSubmitMutation.isPending
                    ? "Gönderiliyor..."
                    : getSubmitButtonLabel("values")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {successOverlay.open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-[360px] rounded-[18px] bg-white px-[22px] py-7 text-center shadow-xl">
            <div className="mx-auto mb-[14px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-emerald-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mb-1.5 text-base font-semibold text-title-black">
              Gönderildi!
            </p>
            <p className="mb-5 text-[13px] leading-6 text-gray-500">
              {successOverlay.message}
            </p>
            <button
              type="button"
              onClick={() => setSuccessOverlay((current) => ({ ...current, open: false }))}
              className="w-full rounded-[10px] bg-primary px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Tamam
            </button>
          </div>
        </div>
      ) : null}
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
