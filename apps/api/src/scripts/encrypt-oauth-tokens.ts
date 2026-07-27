/**
 * OAuth Token Encryption Migration Script
 *
 * This script encrypts any plaintext OAuth tokens in the database.
 * It is idempotent and can be safely re-run.
 *
 * Usage: npx ts-node apps/api/src/scripts/encrypt-oauth-tokens.ts
 *
 * Requirements:
 * - TOKEN_ENCRYPTION_KEY must be set in environment
 * - Database must be accessible
 */

import { PrismaService } from "../prisma/prisma.service";
import { encrypt } from "../common/crypto.util";

const prisma = new PrismaService();
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Check if a value is already encrypted.
 * Supports both new format (enc:v1:...) and legacy format (iv:authTag:ciphertext).
 */
function isEncrypted(value: string): boolean {
  // New format with prefix
  if (value.startsWith(ENCRYPTED_PREFIX)) return true;
  // Legacy format: contains : separator (iv:authTag:ciphertext)
  if (value.includes(":")) return true;
  return false;
}

/**
 * Encrypt a token with the stable prefix format.
 */
function encryptToken(plaintext: string, secret: string): string {
  return ENCRYPTED_PREFIX + encrypt(plaintext, secret);
}

async function main() {
  const encryptionSecret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionSecret) {
    console.error("ERROR: TOKEN_ENCRYPTION_KEY is required");
    process.exit(1);
  }

  console.log("Starting OAuth token encryption migration...");

  const tokens = await prisma.oAuthToken.findMany();
  let encryptedCount = 0;
  let skippedCount = 0;

  for (const token of tokens) {
    const updates: { accessToken?: string; refreshToken?: string } = {};

    // Check and encrypt access token
    if (token.accessToken && !isEncrypted(token.accessToken)) {
      updates.accessToken = encryptToken(token.accessToken, encryptionSecret);
      console.log(`Encrypting access token for provider: ${token.provider}`);
    } else if (token.accessToken) {
      skippedCount++;
    }

    // Check and encrypt refresh token
    if (token.refreshToken && !isEncrypted(token.refreshToken)) {
      updates.refreshToken = encryptToken(token.refreshToken, encryptionSecret);
      console.log(`Encrypting refresh token for provider: ${token.provider}`);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await prisma.oAuthToken.update({
        where: { id: token.id },
        data: updates,
      });
      encryptedCount++;
    }
  }

  console.log(
    `Migration complete: ${encryptedCount} tokens encrypted, ${skippedCount} already encrypted`,
  );
}

main()
  .catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
