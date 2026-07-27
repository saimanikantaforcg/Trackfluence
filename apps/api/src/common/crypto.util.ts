import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag
const KEY_LENGTH = 32; // 256 bits
const SALT = "trackfluence-oauth-token-encryption";

/**
 * Derive a 256-bit AES key from the configured secret.
 * Uses scrypt key derivation with a fixed salt for determinism.
 */
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: iv + ciphertext + authTag
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects input in the format produced by encrypt(): iv:authTag:ciphertext
 */
export function decrypt(encryptedPayload: string, secret: string): string {
  const key = deriveKey(secret);
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Encrypt an object by JSON-stringifying it first.
 */
export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  secret: string,
): string {
  return encrypt(JSON.stringify(obj), secret);
}

/**
 * Decrypt and parse a JSON object.
 */
export function decryptObject<T = Record<string, unknown>>(
  encryptedPayload: string,
  secret: string,
): T {
  const decrypted = decrypt(encryptedPayload, secret);
  return JSON.parse(decrypted) as T;
}
