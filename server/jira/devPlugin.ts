import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

import type { Plugin, ViteDevServer } from "vite";

import {
  fetchAtlassianCloudId,
  fetchAtlassianCurrentUser,
  fetchAtlassianEpicDetails,
  fetchAtlassianIssueSync,
  searchAtlassianEpics,
} from "./atlassianApi";
import { loadJiraProviderConfig, validateAtlassianConfig } from "./config";
import {
  createClearedCookieHeader,
  createCookieHeader,
  getCookieValue,
  getJsonBody,
  JIRA_SESSION_COOKIE_NAME,
} from "./httpUtils";
import { flattenJiraIssues, jiraDevEpics } from "./mockData";
import {
  buildAtlassianAuthorizeUrl,
  exchangeCodeForTokenBundle,
  refreshTokenBundle,
} from "./oauthClient";
import {
  generatePkceChallenge,
  generatePkceVerifier,
  generateRandomToken,
} from "./pkce";
import {
  consumeOauthState,
  createAnonymousSession,
  deleteJiraSession,
  getDecryptedTokenBundle,
  getJiraSession,
  storeEncryptedTokenBundle,
  storeOauthState,
  upsertJiraSession,
} from "./sessionStore";

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

let config = loadJiraProviderConfig();
let callbackUrl = `${config.frontendBaseUrl}${config.callbackPath}`;

const refreshRuntimeConfig = (): void => {
  config = loadJiraProviderConfig();
  callbackUrl = `${config.frontendBaseUrl}${config.callbackPath}`;
};

const requireSession = (req: IncomingMessage) => {
  const sessionId = getCookieValue(req, JIRA_SESSION_COOKIE_NAME);
  if (!sessionId) {
    return null;
  }

  const session = getJiraSession(sessionId);
  if (!session) {
    return null;
  }

  return {
    sessionId,
    session,
  };
};

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

const getAtlassianAccessToken = async (sessionId: string): Promise<string> => {
  validateAtlassianConfig(config);
  const encryptionKey = config.encryptionKey as string;

  const tokenBundle = getDecryptedTokenBundle(sessionId, encryptionKey);
  if (!tokenBundle) {
    throw new Error("No Jira token found for this session");
  }

  if (tokenBundle.expiresAtMs > Date.now() + 15_000) {
    return tokenBundle.accessToken;
  }

  if (!tokenBundle.refreshToken) {
    throw new Error("Jira token expired and no refresh token available");
  }

  const refreshed = await refreshTokenBundle(
    fetch,
    config,
    tokenBundle.refreshToken
  );
  storeEncryptedTokenBundle(sessionId, refreshed, encryptionKey);
  return refreshed.accessToken;
};

const handleAuthSignIn = async (
  req: IncomingMessage,
  res: ServerResponse
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

    res.setHeader("Set-Cookie", createCookieHeader(hydrated.id));
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
  const codeChallenge = generatePkceChallenge(codeVerifier);

  storeOauthState({
    state,
    codeVerifier,
    sessionId: session.id,
    returnTo,
    expiresAtMs: Date.now() + 5 * 60_000,
  });

  const authUrl = buildAtlassianAuthorizeUrl(config, state, codeChallenge);
  res.setHeader("Set-Cookie", createCookieHeader(session.id));
  jsonResponse(res, 200, { authUrl });
};

const handleAuthCallback = async (
  req: IncomingMessage,
  res: ServerResponse
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

  const pendingState = consumeOauthState(state);
  if (!pendingState || pendingState.expiresAtMs < Date.now()) {
    jsonError(res, 400, "Invalid or expired OAuth state");
    return;
  }

  const tokenBundle = await exchangeCodeForTokenBundle(
    fetch,
    config,
    code,
    pendingState.codeVerifier
  );

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

  res.setHeader("Set-Cookie", createCookieHeader(pendingState.sessionId));
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
  res.setHeader("Set-Cookie", createClearedCookieHeader());
  jsonResponse(res, 200, { ok: true });
};

const handleHealth = (_req: IncomingMessage, res: ServerResponse): void => {
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

const handleEpicSearchAtlassian = async (
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  cloudId: string
): Promise<void> => {
  const accessToken = await getAtlassianAccessToken(sessionId);
  const query = getSearchParam(req, "query");
  const results = await searchAtlassianEpics(
    fetch,
    accessToken,
    cloudId,
    query
  );
  jsonResponse(res, 200, results);
};

const handleEpicDetailsAtlassian = async (
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  cloudId: string
): Promise<void> => {
  const epicKey = decodeURIComponent(
    getPathname(req).replace("/api/jira/epics/", "")
  );
  const accessToken = await getAtlassianAccessToken(sessionId);
  const details = await fetchAtlassianEpicDetails(
    fetch,
    accessToken,
    cloudId,
    epicKey
  );
  jsonResponse(res, 200, details);
};

const handleIssueSyncAtlassian = async (
  req: IncomingMessage,
  res: ServerResponse,
  sessionId: string,
  cloudId: string
): Promise<void> => {
  const body = await getJsonBody<{ issueKeys?: string[] }>(req);
  const accessToken = await getAtlassianAccessToken(sessionId);
  const updates = await fetchAtlassianIssueSync(
    fetch,
    accessToken,
    cloudId,
    body.issueKeys ?? []
  );
  jsonResponse(res, 200, updates);
};

const routeRequest = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const pathname = getPathname(req);
  const method = req.method ?? "GET";
  const authCallbackPath = config.callbackPath;

  if (method === "GET" && pathname === authCallbackPath) {
    await handleAuthCallback(req, res);
    return true;
  }

  if (!pathname.startsWith("/api/jira")) {
    return false;
  }

  if (
    pathname !== "/api/jira/auth/sign-in" &&
    pathname !== authCallbackPath &&
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
    await handleAuthSignIn(req, res);
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
    handleHealth(req, res);
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
      await handleEpicSearchAtlassian(
        req,
        res,
        current.sessionId,
        getCloudIdOrThrow(current.session)
      );
    }
    return true;
  }
  if (method === "GET" && pathname.startsWith("/api/jira/epics/")) {
    if (config.providerMode === "mock") {
      handleEpicDetailsMock(req, res);
    } else {
      await handleEpicDetailsAtlassian(
        req,
        res,
        current.sessionId,
        getCloudIdOrThrow(current.session)
      );
    }
    return true;
  }
  if (method === "POST" && pathname === "/api/jira/issues/sync") {
    if (config.providerMode === "mock") {
      await handleIssueSyncMock(req, res);
    } else {
      await handleIssueSyncAtlassian(
        req,
        res,
        current.sessionId,
        getCloudIdOrThrow(current.session)
      );
    }
    return true;
  }

  jsonError(res, 404, "Route not found");
  return true;
};

const installMiddleware = (server: ViteDevServer): void => {
  server.middlewares.use(async (req, res, next) => {
    try {
      const handled = await routeRequest(req, res);
      if (!handled) {
        next();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected Jira dev server error";
      jsonError(res, 500, message);
    }
  });
};

export const jiraDevApiPlugin = (): Plugin => ({
  name: "jira-dev-api-plugin",
  apply: "serve",
  configureServer(server) {
    refreshRuntimeConfig();

    const modeLabel =
      config.providerMode === "atlassian" ? "atlassian-oauth" : "mock-provider";
    const atlassianConfigReady =
      Boolean(config.clientId) &&
      Boolean(config.clientSecret) &&
      Boolean(config.encryptionKey);

    console.info(
      `[jira-bff] mode=${modeLabel} callback=${callbackUrl} scopes=${config.jiraScopes.length} atlassianConfigReady=${atlassianConfigReady}`
    );
    console.info("[jira-bff] health endpoint: GET /api/jira/health");

    installMiddleware(server);
  },
});
