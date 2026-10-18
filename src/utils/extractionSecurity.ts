import { createHash, timingSafeEqual } from 'node:crypto';

export const MAX_EXTRACTION_FILE_BYTES = 3_000_000;

export const SUPPORTED_EXTRACTION_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export function extractionTokenMatches(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function isValidExtractionFile(base64: string): boolean {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    return false;
  }

  const fileBytes = Buffer.from(base64, 'base64').byteLength;
  return fileBytes > 0 && fileBytes <= MAX_EXTRACTION_FILE_BYTES;
}
