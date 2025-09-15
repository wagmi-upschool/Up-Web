/**
 * Utility functions for Mixpanel integration
 */

/**
 * Validates if a URL is a secure Mixpanel URL
 * @param url The URL to validate
 * @returns boolean indicating if the URL is valid and secure
 */
export function validateMixpanelUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Only allow Mixpanel URLs
    const allowedHosts = ['eu.mixpanel.com', 'mixpanel.com', 'us.mixpanel.com'];
    return allowedHosts.includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}