import { randomUUID } from "node:crypto";

import { decryptString, encryptString } from "./crypto";
import type {
  JiraOAuthState,
  JiraServerSession,
  JiraTokenBundle,
} from "./types";

const sessions = new Map<string, JiraServerSession>();
const oauthStates = new Map<string, JiraOAuthState>();
const encryptedTokensBySession = new Map<string, string>();

const tokenPayloadToString = (bundle: JiraTokenBundle): string =>
  JSON.stringify(bundle);

const tokenPayloadFromString = (value: string): JiraTokenBundle =>
  JSON.parse(value) as JiraTokenBundle;

export const createAnonymousSession = (): JiraServerSession => {
  const session: JiraServerSession = { id: randomUUID() };
  sessions.set(session.id, session);
  return session;
};

export const getJiraSession = (
  sessionId: string | undefined
): JiraServerSession | null => {
  if (!sessionId) return null;
  return sessions.get(sessionId) ?? null;
};

export const upsertJiraSession = (
  session: JiraServerSession
): JiraServerSession => {
  sessions.set(session.id, session);
  return session;
};

export const deleteJiraSession = (sessionId: string | undefined): void => {
  if (!sessionId) return;
  sessions.delete(sessionId);
  encryptedTokensBySession.delete(sessionId);
};

export const storeOauthState = (oauthState: JiraOAuthState): void => {
  oauthStates.set(oauthState.state, oauthState);
};

export const consumeOauthState = (state: string): JiraOAuthState | null => {
  const value = oauthStates.get(state) ?? null;
  if (value) {
    oauthStates.delete(state);
  }
  return value;
};

export const storeEncryptedTokenBundle = (
  sessionId: string,
  bundle: JiraTokenBundle,
  encryptionKey: string
): void => {
  const encoded = encryptString(tokenPayloadToString(bundle), encryptionKey);
  encryptedTokensBySession.set(sessionId, encoded);
};

export const getDecryptedTokenBundle = (
  sessionId: string,
  encryptionKey: string
): JiraTokenBundle | null => {
  const encrypted = encryptedTokensBySession.get(sessionId);
  if (!encrypted) return null;

  const decoded = decryptString(encrypted, encryptionKey);
  return tokenPayloadFromString(decoded);
};
