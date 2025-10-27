import { logger } from "@/lib/logger";

export interface QuizConfig {
  [groupName: string]: {
    users?: string[];
    url: string;
    testId: string;
  };
}

const QUIZ_REMOTE_CONFIG_PARAMETER_KEYS = [
  process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY,
  process.env.QUIZ_REMOTE_CONFIG_KEY,
  "UpWebMixpanelDashboard",
].filter((key): key is string => Boolean(key));

type RemoteConfigReader = (parameter: string) => Promise<any>;

const defaultRemoteConfigReader: RemoteConfigReader = async (parameter) => {
  const { getRemoteConfigValue } = await import("@/lib/firebase-admin");
  return getRemoteConfigValue(parameter, false);
};

export async function fetchQuizConfig(
  reader: RemoteConfigReader = defaultRemoteConfigReader,
  parameterKeys: string[] = QUIZ_REMOTE_CONFIG_PARAMETER_KEYS
): Promise<QuizConfig> {
  let quizConfig: QuizConfig = {};
  const keysToTry =
    parameterKeys.length > 0 ? parameterKeys : ["UpWebMixpanelDashboard"];

  console.log("📡 Attempting to load quiz config from Firebase Remote Config");

  for (const parameterKey of keysToTry) {
    try {
      console.log(`🔄 Fetching Remote Config value for: ${parameterKey}`);
      const remoteConfig = await reader(parameterKey);

      if (remoteConfig && typeof remoteConfig === "object") {
        quizConfig = remoteConfig as QuizConfig;
        const groupCount = Object.keys(quizConfig).length;
        logger.quizAccess.configLoadSuccess(
          `Firebase Remote Config (${parameterKey})`,
          groupCount
        );
        console.log(
          `✅ Successfully loaded quiz config from Firebase Remote Config parameter ${parameterKey}`
        );
        break;
      } else {
        const warningMessage = `Config not found or invalid format for parameter ${parameterKey}`;
        logger.quizAccess.configLoadFailed(
          `Firebase Remote Config (${parameterKey})`,
          new Error(warningMessage)
        );
        console.warn(
          `⚠️ Firebase Remote Config returned empty or invalid config for ${parameterKey}`
        );
      }
    } catch (firebaseError) {
      const err =
        firebaseError instanceof Error
          ? firebaseError
          : new Error(String(firebaseError));
      logger.quizAccess.configLoadFailed(
        `Firebase Remote Config (${parameterKey})`,
        err
      );
      console.error(
        "❌ Firebase Remote Config unavailable:",
        firebaseError instanceof Error ? firebaseError.message : "Unknown error"
      );
    }
  }

  return quizConfig;
}
