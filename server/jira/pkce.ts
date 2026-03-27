const toBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const toBase64Url = (value: Uint8Array): string =>
  toBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const utf8Bytes = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

export const generateRandomToken = (bytes = 32): string =>
  toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));

export const generatePkceVerifier = (): string => generateRandomToken(64);

export const generatePkceChallenge = async (
  verifier: string
): Promise<string> => {
  const bytes = utf8Bytes(verifier) as unknown as BufferSource;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes
  );
  return toBase64Url(new Uint8Array(digest));
};
