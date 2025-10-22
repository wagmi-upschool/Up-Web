import { getRemoteConfigValue } from "@/lib/firebase-admin";

export async function fetchMixpanelConfig() {
  const mixpanelConfig = await getRemoteConfigValue(
    process.env.UP_WEB_MIXPANEL_REMOTE_CONFIG_KEY ||
    process.env.MIXPANEL_REMOTE_CONFIG_KEY ||
    "UpWebMixpanelDashboard",
    false
  );
  return mixpanelConfig;
}

// Run and log the config
fetchMixpanelConfig().then(config => {
  console.log("📊 Mixpanel Config:", JSON.stringify(config, null, 2));
}).catch(error => {
  console.error("❌ Error fetching config:", error);
});
