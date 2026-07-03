import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for Google OAuth tokens stored in the DB.
 * Key: base64 of 32 bytes in DRIVE_TOKEN_ENC_KEY.
 */
function getKey(): Buffer {
  const b64 = process.env.DRIVE_TOKEN_ENC_KEY;
  if (!b64) throw new Error("DRIVE_TOKEN_ENC_KEY missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("DRIVE_TOKEN_ENC_KEY must decode to 32 bytes");
  return key;
}

export interface EncryptedBlob {
  iv: string;
  tag: string;
  data: string;
}

export function encryptJson(obj: unknown): EncryptedBlob {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: encrypted.toString("base64") };
}

export function decryptJson<T>(blob: EncryptedBlob): T {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
