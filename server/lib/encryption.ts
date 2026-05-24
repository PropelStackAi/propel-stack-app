/**
 * AES-256-GCM Field Encryption — Enhancement 41
 * Propel Stack AI, LLC
 *
 * Key derivation: PBKDF2(userId + JWT_SECRET + PEPPER, salt, 100000, 32, sha256)
 * Used for: credential vault, estate vault content, legal documents, medical records, sleep data
 *
 * NEVER decrypt server-side for display — pass ciphertext to client,
 * or decrypt only within Edge Functions with ephemeral memory.
 */

import crypto from 'crypto';

const PEPPER = process.env.ENCRYPTION_PEPPER ?? '';
const JWT_SECRET = process.env.JWT_SECRET ?? '';

if (!PEPPER && process.env.NODE_ENV === 'production') {
  console.error('[encryption] ENCRYPTION_PEPPER env var is not set — field encryption will fail in production');
}
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[encryption] JWT_SECRET env var is not set — encryption keys will be identical for all users');
}

/**
 * Encrypt a plaintext string for a specific user.
 * Returns a base64-encoded blob: [16-byte salt | 12-byte IV | 16-byte auth tag | ciphertext]
 */
export function encryptField(plaintext: string, userId: string): string {
  if (!plaintext) return plaintext;
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(userId + JWT_SECRET + PEPPER, salt, 100_000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a ciphertext encrypted with encryptField().
 * Returns the original plaintext, or throws if tampered / wrong key.
 */
export function decryptField(ciphertext: string, userId: string): string {
  if (!ciphertext) return ciphertext;
  const buf = Buffer.from(ciphertext, 'base64');
  const salt = buf.subarray(0, 16);
  const iv = buf.subarray(16, 28);
  const authTag = buf.subarray(28, 44);
  const encrypted = buf.subarray(44);
  const key = crypto.pbkdf2Sync(userId + JWT_SECRET + PEPPER, salt, 100_000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

/**
 * Convenience: encrypt if the value is truthy and plaintext, pass-through otherwise.
 * Uses a sentinel prefix so we don't double-encrypt.
 */
const ENC_PREFIX = 'ENC:';

export function encryptIfNeeded(value: string | null | undefined, userId: string): string | null {
  if (!value) return null;
  if (value.startsWith(ENC_PREFIX)) return value; // already encrypted
  return ENC_PREFIX + encryptField(value, userId);
}

export function decryptIfNeeded(value: string | null | undefined, userId: string): string | null {
  if (!value) return null;
  if (!value.startsWith(ENC_PREFIX)) return value; // not encrypted
  return decryptField(value.slice(ENC_PREFIX.length), userId);
}
