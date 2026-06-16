export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const POST_LOGIN_REDIRECT_KEY = "pairup-post-login-redirect";

const isPlaceholderValue = (value: string | undefined) =>
  !value || /your-|example|placeholder/i.test(value);

export const getAuthConfigStatus = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  return {
    isConfigured:
      !isPlaceholderValue(oauthPortalUrl) && !isPlaceholderValue(appId),
    oauthPortalUrl,
    appId,
  };
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const { oauthPortalUrl, appId, isConfigured } = getAuthConfigStatus();
  if (!isConfigured) {
    throw new Error(
      "OAuth is not configured. Set VITE_APP_ID and VITE_OAUTH_PORTAL_URL."
    );
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
