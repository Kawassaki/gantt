import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

import {
  loadJiraProviderConfig,
  validateAtlassianConfig,
} from "../../server/jira/config.js";
import {
  createClearedCookieHeader,
  createCookieHeader,
  getCookieValue,
  getJsonBody,
  JIRA_SESSION_COOKIE_NAME,
} from "../../server/jira/httpUtils.js";
import { flattenJiraIssues, jiraDevEpics } from "../../server/jira/mockData.js";
import {
  buildAtlassianAuthorizeUrl,
  exchangeCodeForTokenBundle,
  refreshTokenBundle,
} from "../../server/jira/oauthClient.js";
import {
  generatePkceChallenge,
  generatePkceVerifier,
  generateRandomToken,
} from "../../server/jira/pkce.js";
import {
  createAnonymousSession,
  deleteJiraSession,
  getDecryptedTokenBundle,
  getJiraSession,
  storeEncryptedTokenBundle,
  upsertJiraSession,
} from "../../server/jira/sessionStore.js";
import type {
  JiraServerSession,
  JiraTokenBundle,
} from "../../server/jira/types.js";

const JIRA_OAUTH_COOKIE_NAME = "jira_oauth_state";
const JIRA_SESSION_DATA_COOKIE_NAME = "jira_session_data";
const JIRA_TOKEN_COOKIE_NAME = "jira_token_data";

const jsonResponse = <T>(
  res: ServerResponse,
  status: number,
  data: T
): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ data }));
};

const jsonError = (
  res: ServerResponse,
  status: number,
  message: string
): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: message }));
};

const getPathname = (req: IncomingMessage): string =>
  new URL(req.url ?? "/", "http://localhost").pathname;

const getSearchParam = (req: IncomingMessage, key: string): string =>
  new URL(req.url ?? "/", "http://localhost").searchParams.get(key) ?? "";

const normalizeReturnTo = (value: string | undefined): string => {
  if (!value || !value.startsWith("/")) {
    return "/";
  }
  return value;
};

const redirect = (res: ServerResponse, location: string): void => {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
};

const getCloudIdOrThrow = (session: { cloudId?: string }): string => {
  if (!session.cloudId) {
    throw new Error("No Jira cloudId stored for this session");
  }
  return session.cloudId;
};

const requireSession = (req: IncomingMessage) => {
  const sessionId = getCookieValue(req, JIRA_SESSION_COOKIE_NAME);

  if (sessionId) {
    const session = getJiraSession(sessionId);
    if (session) {
      return { sessionId, session };
    }
  }

  const sessionFromCookie = readDataCookie<SessionCookiePayload>(
    req,
    JIRA_SESSION_DATA_COOKIE_NAME
  );
  if (!sessionFromCookie?.id) return null;

  const restoredSession: JiraServerSession = {
    id: sessionFromCookie.id,
    accountId: sessionFromCookie.accountId,
    displayName: sessionFromCookie.displayName,
    cloudId: sessionFromCookie.cloudId,
  };
  upsertJiraSession(restoredSession);

  return {
    sessionId: restoredSession.id,
    session: restoredSession,
  };
};

interface OAuthCookiePayload {
  state: string;
  codeVerifier: string;
  sessionId: string;
  returnTo: string;
  expiresAtMs: number;
}

interface SessionCookiePayload {
  id: string;
  accountId?: string;
  displayName?: string;
  cloudId?: string;
}

interface TokenCookiePayload {
  refreshToken?: string;
  accessToken?: string;
  expiresAtMs?: number;
}

const toBase64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  return btoa(value);
};

const fromBase64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  return atob(value);
};

const createOAuthCookieHeader = (payload: OAuthCookiePayload): string => {
  const encoded = encodeURIComponent(toBase64(JSON.stringify(payload)));
  const secure = process.env.NODE_ENV === "production";
  const maxAgeSeconds = 5 * 60;

  return `${JIRA_OAUTH_COOKIE_NAME}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
};

const createClearedOAuthCookieHeader = (): string => {
  const secure = process.env.NODE_ENV === "production";
  return `${JIRA_OAUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
};

const readOAuthCookie = (req: IncomingMessage): OAuthCookiePayload | null => {
  const encoded = getCookieValue(req, JIRA_OAUTH_COOKIE_NAME);
  if (!encoded) return null;

  try {
    const decoded = fromBase64(decodeURIComponent(encoded));
    return JSON.parse(decoded) as OAuthCookiePayload;
  } catch {
    return null;
  }
};

const createDataCookieHeader = (
  name: string,
  payload: object,
  maxAgeSeconds: number
): string => {
  const encoded = encodeURIComponent(toBase64(JSON.stringify(payload)));
  const secure = process.env.NODE_ENV === "production";
  return `${name}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
};

const createClearedDataCookieHeader = (name: string): string => {
  const secure = process.env.NODE_ENV === "production";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
};

const readDataCookie = <T>(req: IncomingMessage, name: string): T | null => {
  const encoded = getCookieValue(req, name);
  if (!encoded) return null;

  try {
    const decoded = fromBase64(decodeURIComponent(encoded));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
};

const toTokenCookiePayload = (bundle: JiraTokenBundle): TokenCookiePayload => ({
  // Keep cookie payload small to avoid browser dropping it in preview deployments.
  refreshToken: bundle.refreshToken,
});

type JiraConfig = ReturnType<typeof loadJiraProviderConfig>;

const getAtlassianAccessToken = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: JiraConfig,
  sessionId: string
): Promise<string> => {
  validateAtlassianConfig(config);
  const encryptionKey = config.encryptionKey as string;

  const tokenBundle =
    getDecryptedTokenBundle(sessionId, encryptionKey) ??
    (() => {
      const cookieToken = readDataCookie<TokenCookiePayload>(
        req,
        JIRA_TOKEN_COOKIE_NAME
      );
      if (!cookieToken) return null;
      if (!cookieToken.accessToken || !cookieToken.expiresAtMs) return null;
      return {
        accessToken: cookieToken.accessToken,
        refreshToken: cookieToken.refreshToken,
        expiresAtMs: cookieToken.expiresAtMs,
      } satisfies JiraTokenBundle;
    })();
  if (!tokenBundle) {
    throw new Error("No Jira token found for this session");
  }

  if (tokenBundle.expiresAtMs > Date.now() + 15_000) {
    return tokenBundle.accessToken;
  }

  const refreshTokenFromCookie = readDataCookie<TokenCookiePayload>(
    req,
    JIRA_TOKEN_COOKIE_NAME
  )?.refreshToken;
  const refreshToken = tokenBundle.refreshToken ?? refreshTokenFromCookie;

  if (!refreshToken) {
    throw new Error("Jira token expired and no refresh token available");
  }

  const refreshed = await refreshTokenBundle(fetch, config, refreshToken);
  storeEncryptedTokenBundle(sessionId, refreshed, encryptionKey);
  res.setHeader(
    "Set-Cookie",
    createDataCookieHeader(
      JIRA_TOKEN_COOKIE_NAME,
      toTokenCookiePayload(refreshed),
      60 * 60 * 8
    )
  );
  return refreshed.accessToken;
};

const handleAuthSignIn = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: JiraConfig
): Promise<void> => {
  const existing = requireSession(req);

  if (config.providerMode === "mock") {
    if (existing?.session.accountId && existing.session.displayName) {
      jsonResponse(res, 200, {
        accountId: existing.session.accountId,
        displayName: existing.session.displayName,
      });
      return;
    }

    const session = createAnonymousSession();
    const hydrated = upsertJiraSession({
      ...session,
      accountId: "dev-account-1",
      displayName: "Felipe Jira",
      cloudId: "dev-cloud",
    });

    res.setHeader("Set-Cookie", [
      createCookieHeader(hydrated.id),
      createDataCookieHeader(
        JIRA_SESSION_DATA_COOKIE_NAME,
        hydrated,
        60 * 60 * 8
      ),
    ]);
    jsonResponse(res, 200, {
      accountId: hydrated.accountId,
      displayName: hydrated.displayName,
    });
    return;
  }

  validateAtlassianConfig(config);

  const body = await getJsonBody<{ returnTo?: string }>(req);
  const returnTo = normalizeReturnTo(body.returnTo);

  const session = existing?.session ?? createAnonymousSession();
  const state = generateRandomToken(24);
  const codeVerifier = generatePkceVerifier();
  const codeChallenge = await generatePkceChallenge(codeVerifier);

  const oauthPayload: OAuthCookiePayload = {
    state,
    codeVerifier,
    sessionId: session.id,
    returnTo,
    expiresAtMs: Date.now() + 5 * 60_000,
  };

  const authUrl = buildAtlassianAuthorizeUrl(config, state, codeChallenge);
  res.setHeader("Set-Cookie", [
    createCookieHeader(session.id),
    createDataCookieHeader(
      JIRA_SESSION_DATA_COOKIE_NAME,
      { id: session.id } satisfies SessionCookiePayload,
      60 * 60 * 8
    ),
    createOAuthCookieHeader(oauthPayload),
  ]);
  jsonResponse(res, 200, { authUrl });
};

const handleAuthCallback = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: JiraConfig
): Promise<void> => {
  if (config.providerMode !== "atlassian") {
    redirect(res, config.frontendBaseUrl);
    return;
  }

  validateAtlassianConfig(config);

  const state = getSearchParam(req, "state");
  const code = getSearchParam(req, "code");
  if (!state || !code) {
    jsonError(res, 400, "Missing state or code in Jira callback");
    return;
  }

  const pendingState = readOAuthCookie(req);
  if (
    !pendingState ||
    pendingState.state !== state ||
    pendingState.expiresAtMs < Date.now()
  ) {
    jsonError(res, 400, "Invalid or expired OAuth state");
    return;
  }

  const tokenBundle = await exchangeCodeForTokenBundle(
    fetch,
    config,
    code,
    pendingState.codeVerifier
  );

  const { fetchAtlassianCloudId, fetchAtlassianCurrentUser } =
    await import("../../server/jira/atlassianApi.js");

  const cloudId = await fetchAtlassianCloudId(fetch, tokenBundle.accessToken);
  const user = await fetchAtlassianCurrentUser(
    fetch,
    tokenBundle.accessToken,
    cloudId
  );

  upsertJiraSession({
    id: pendingState.sessionId,
    accountId: user.accountId,
    displayName: user.displayName,
    cloudId,
  });

  storeEncryptedTokenBundle(
    pendingState.sessionId,
    tokenBundle,
    config.encryptionKey as string
  );

  res.setHeader("Set-Cookie", [
    createCookieHeader(pendingState.sessionId),
    createDataCookieHeader(
      JIRA_SESSION_DATA_COOKIE_NAME,
      {
        id: pendingState.sessionId,
        accountId: user.accountId,
        displayName: user.displayName,
        cloudId,
      } satisfies SessionCookiePayload,
      60 * 60 * 8
    ),
    createDataCookieHeader(
      JIRA_TOKEN_COOKIE_NAME,
      toTokenCookiePayload(tokenBundle),
      60 * 60 * 8
    ),
    createClearedOAuthCookieHeader(),
  ]);
  redirect(res, `${config.frontendBaseUrl}${pendingState.returnTo}`);
};

const handleAuthMe = (req: IncomingMessage, res: ServerResponse): void => {
  const current = requireSession(req);
  const session = current?.session;

  if (!session?.accountId || !session.displayName) {
    jsonError(res, 401, "No Jira session");
    return;
  }

  jsonResponse(res, 200, {
    accountId: session.accountId,
    displayName: session.displayName,
  });
};

const handleAuthSignOut = (req: IncomingMessage, res: ServerResponse): void => {
  const sessionId = getCookieValue(req, JIRA_SESSION_COOKIE_NAME);
  deleteJiraSession(sessionId);
  res.setHeader("Set-Cookie", [
    createClearedCookieHeader(),
    createClearedDataCookieHeader(JIRA_SESSION_DATA_COOKIE_NAME),
    createClearedDataCookieHeader(JIRA_TOKEN_COOKIE_NAME),
    createClearedOAuthCookieHeader(),
  ]);
  jsonResponse(res, 200, { ok: true });
};

const handleHealth = (
  res: ServerResponse,
  config: JiraConfig,
  callbackUrl: string
): void => {
  const atlassianConfigReady =
    Boolean(config.clientId) &&
    Boolean(config.clientSecret) &&
    Boolean(config.encryptionKey);

  jsonResponse(res, 200, {
    service: "jira-bff",
    status: "ok",
    providerMode: config.providerMode,
    callbackUrl,
    atlassianConfigReady,
    scopeCount: config.jiraScopes.length,
    timestamp: new Date().toISOString(),
  });
};

const handleEpicSearchMock = (
  req: IncomingMessage,
  res: ServerResponse
): void => {
  const query = getSearchParam(req, "query").trim().toUpperCase();
  const results = jiraDevEpics
    .filter((epicDetails) => {
      if (!query) return true;
      const key = epicDetails.epic.key.toUpperCase();
      const title = epicDetails.epic.title.toUpperCase();
      return key.includes(query) || title.includes(query);
    })
    .map((epicDetails) => ({
      key: epicDetails.epic.key,
      title: epicDetails.epic.title,
    }));

  jsonResponse(res, 200, results);
};

const handleEpicDetailsMock = (
  req: IncomingMessage,
  res: ServerResponse
): void => {
  const pathname = getPathname(req);
  const epicKey = decodeURIComponent(pathname.replace("/api/jira/epics/", ""));
  const details = jiraDevEpics.find(
    (epicDetails) => epicDetails.epic.key === epicKey
  );

  if (!details) {
    jsonError(res, 404, `Epic ${epicKey} not found`);
    return;
  }

  jsonResponse(res, 200, details);
};

const handleIssueSyncMock = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  const body = await getJsonBody<{ issueKeys?: string[] }>(req);
  const issueKeys = body.issueKeys ?? [];
  const updates = flattenJiraIssues().filter((issue) =>
    issueKeys.includes(issue.key)
  );
  jsonResponse(res, 200, updates);
};

const routeRequest = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const config = loadJiraProviderConfig();
  const callbackPath = config.callbackPath;
  const callbackUrl = `${config.frontendBaseUrl}${callbackPath}`;
  const pathname = getPathname(req);
  const method = req.method ?? "GET";

  if (method === "GET" && pathname === callbackPath) {
    await handleAuthCallback(req, res, config);
    return true;
  }

  if (!pathname.startsWith("/api/jira")) {
    return false;
  }

  if (
    pathname !== "/api/jira/auth/sign-in" &&
    pathname !== "/api/jira/auth/me" &&
    pathname !== "/api/jira/auth/sign-out" &&
    pathname !== "/api/jira/health"
  ) {
    const current = requireSession(req);
    if (
      !current ||
      !current.session.accountId ||
      !current.session.displayName
    ) {
      jsonError(res, 401, "No Jira session");
      return true;
    }
  }

  if (method === "POST" && pathname === "/api/jira/auth/sign-in") {
    await handleAuthSignIn(req, res, config);
    return true;
  }
  if (method === "GET" && pathname === "/api/jira/auth/me") {
    handleAuthMe(req, res);
    return true;
  }
  if (method === "POST" && pathname === "/api/jira/auth/sign-out") {
    handleAuthSignOut(req, res);
    return true;
  }
  if (method === "GET" && pathname === "/api/jira/health") {
    handleHealth(res, config, callbackUrl);
    return true;
  }

  const current = requireSession(req);
  if (!current || !current.session.accountId || !current.session.displayName) {
    jsonError(res, 401, "No Jira session");
    return true;
  }

  if (method === "GET" && pathname === "/api/jira/epics/search") {
    if (config.providerMode === "mock") {
      handleEpicSearchMock(req, res);
    } else {
      const { searchAtlassianEpics } =
        await import("../../server/jira/atlassianApi.js");
      const accessToken = await getAtlassianAccessToken(
        req,
        res,
        config,
        current.sessionId
      );
      const query = getSearchParam(req, "query");
      const cloudId = getCloudIdOrThrow(current.session);
      const results = await searchAtlassianEpics(
        fetch,
        accessToken,
        cloudId,
        query
      );
      jsonResponse(res, 200, results);
    }
    return true;
  }

  if (method === "GET" && pathname.startsWith("/api/jira/epics/")) {
    if (config.providerMode === "mock") {
      handleEpicDetailsMock(req, res);
    } else {
      const { fetchAtlassianEpicDetails } =
        await import("../../server/jira/atlassianApi.js");
      const accessToken = await getAtlassianAccessToken(
        req,
        res,
        config,
        current.sessionId
      );
      const cloudId = getCloudIdOrThrow(current.session);
      const epicKey = decodeURIComponent(
        pathname.replace("/api/jira/epics/", "")
      );
      const details = await fetchAtlassianEpicDetails(
        fetch,
        accessToken,
        cloudId,
        epicKey
      );
      jsonResponse(res, 200, details);
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/jira/issues/sync") {
    if (config.providerMode === "mock") {
      await handleIssueSyncMock(req, res);
    } else {
      const { fetchAtlassianIssueSync } =
        await import("../../server/jira/atlassianApi.js");
      const body = await getJsonBody<{ issueKeys?: string[] }>(req);
      const accessToken = await getAtlassianAccessToken(
        req,
        res,
        config,
        current.sessionId
      );
      const cloudId = getCloudIdOrThrow(current.session);
      const updates = await fetchAtlassianIssueSync(
        fetch,
        accessToken,
        cloudId,
        body.issueKeys ?? []
      );
      jsonResponse(res, 200, updates);
    }
    return true;
  }

  jsonError(res, 404, "Route not found");
  return true;
};

const handler = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  try {
    const handled = await routeRequest(req, res);
    if (!handled) {
      jsonError(res, 404, "Route not found");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Jira server error";
    jsonError(res, 500, message);
  }
};

export default handler;
