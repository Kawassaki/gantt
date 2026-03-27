import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const IV_LENGTH_BYTES = 12;

const toEncryptionKey = (rawKey: string): Buffer =>
  createHash("sha256").update(rawKey, "utf8").digest();

export const encryptString = (plainText: string, rawKey: string): string => {
  const key = toEncryptionKey(rawKey);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plainText, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
};

export const decryptString = (
  encryptedValue: string,
  rawKey: string
): string => {
  const [ivEncoded, authTagEncoded, payloadEncoded] = encryptedValue.split(".");

  if (!ivEncoded || !authTagEncoded || !payloadEncoded) {
    throw new Error("Invalid encrypted payload format");
  }

  const key = toEncryptionKey(rawKey);
  const iv = Buffer.from(ivEncoded, "base64");
  const authTag = Buffer.from(authTagEncoded, "base64");
  const payload = Buffer.from(payloadEncoded, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
};
