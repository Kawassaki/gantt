import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  runtime: "nodejs",
};

const asString = (value: string | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value : fallback;

const parseScopes = (scopes: string | undefined): string[] =>
  asString(scopes, "read:jira-user read:jira-work offline_access")
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

const handler = (_req: IncomingMessage, res: ServerResponse): void => {
  const providerMode =
    process.env.JIRA_PROVIDER_MODE === "atlassian" ? "atlassian" : "mock";
  const frontendBaseUrl = asString(
    process.env.FRONTEND_BASE_URL,
    "http://localhost:4000"
  );
  const callbackPath = asString(
    process.env.JIRA_CALLBACK_PATH,
    "/api/jira/auth/callback"
  );
  const jiraScopes = parseScopes(process.env.JIRA_SCOPES);

  const atlassianConfigReady =
    Boolean(process.env.JIRA_CLIENT_ID) &&
    Boolean(process.env.JIRA_CLIENT_SECRET) &&
    Boolean(process.env.JIRA_TOKEN_ENCRYPTION_KEY);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      data: {
        service: "jira-bff",
        status: "ok",
        providerMode,
        callbackUrl: `${frontendBaseUrl}${callbackPath}`,
        atlassianConfigReady,
        scopeCount: jiraScopes.length,
        timestamp: new Date().toISOString(),
      },
    })
  );
};

export default handler;
