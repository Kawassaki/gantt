import { URLSearchParams } from "node:url";

import type { JiraProviderConfig, JiraTokenBundle } from "./types";

interface AtlassianTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

const TOKEN_ENDPOINT = "https://auth.atlassian.com/oauth/token";
const AUTHORIZE_ENDPOINT = "https://auth.atlassian.com/authorize";
const AUDIENCE = "api.atlassian.com";

const asRequired = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required Jira config value: ${name}`);
  }
  return value;
};

const parseTokenResponse = async (
  response: Response
): Promise<AtlassianTokenResponse> => {
  const payload = (await response.json()) as AtlassianTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        "Atlassian token request failed"
    );
  }

  return payload;
};

export const buildAtlassianAuthorizeUrl = (
  config: JiraProviderConfig,
  state: string,
  codeChallenge: string
): string => {
  const clientId = asRequired(config.clientId, "JIRA_CLIENT_ID");
  const redirectUri = `${config.frontendBaseUrl}${config.callbackPath}`;

  const query = new URLSearchParams({
    audience: AUDIENCE,
    client_id: clientId,
    scope: config.jiraScopes.join(" "),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${AUTHORIZE_ENDPOINT}?${query.toString()}`;
};

export const exchangeCodeForTokenBundle = async (
  fetchImpl: typeof fetch,
  config: JiraProviderConfig,
  code: string,
  codeVerifier: string
): Promise<JiraTokenBundle> => {
  const clientId = asRequired(config.clientId, "JIRA_CLIENT_ID");
  const clientSecret = asRequired(config.clientSecret, "JIRA_CLIENT_SECRET");
  const redirectUri = `${config.frontendBaseUrl}${config.callbackPath}`;

  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const payload = await parseTokenResponse(response);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
};

export const refreshTokenBundle = async (
  fetchImpl: typeof fetch,
  config: JiraProviderConfig,
  refreshToken: string
): Promise<JiraTokenBundle> => {
  const clientId = asRequired(config.clientId, "JIRA_CLIENT_ID");
  const clientSecret = asRequired(config.clientSecret, "JIRA_CLIENT_SECRET");

  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const payload = await parseTokenResponse(response);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
};
