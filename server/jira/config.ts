import type { JiraProviderConfig } from "./types";

const asString = (value: string | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value : fallback;

const parseScopes = (scopes: string | undefined): string[] => {
  const raw = asString(scopes, "read:jira-user read:jira-work offline_access");

  return raw
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
};

export const loadJiraProviderConfig = (): JiraProviderConfig => {
  const providerMode =
    process.env.JIRA_PROVIDER_MODE === "atlassian" ? "atlassian" : "mock";

  return {
    providerMode,
    frontendBaseUrl: asString(
      process.env.FRONTEND_BASE_URL,
      "http://localhost:4000"
    ),
    callbackPath: asString(
      process.env.JIRA_CALLBACK_PATH,
      "/api/jira/auth/callback"
    ),
    jiraScopes: parseScopes(process.env.JIRA_SCOPES),
    clientId: process.env.JIRA_CLIENT_ID,
    clientSecret: process.env.JIRA_CLIENT_SECRET,
    encryptionKey: process.env.JIRA_TOKEN_ENCRYPTION_KEY,
  };
};

export const validateAtlassianConfig = (config: JiraProviderConfig): void => {
  if (config.providerMode !== "atlassian") return;

  const missing: string[] = [];
  if (!config.clientId) missing.push("JIRA_CLIENT_ID");
  if (!config.clientSecret) missing.push("JIRA_CLIENT_SECRET");
  if (!config.encryptionKey) missing.push("JIRA_TOKEN_ENCRYPTION_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing Jira Atlassian config: ${missing.join(", ")}. Set JIRA_PROVIDER_MODE=mock to use local mock mode.`
    );
  }
};
