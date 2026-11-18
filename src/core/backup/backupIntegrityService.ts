/**
 * SEMNÓTĒS — Backup Integrity & Checksum Service
 * Sovereign personal discipline operating system.
 *
 * Implements deterministic SHA-256 cryptographic checksumming via Web Crypto API.
 * Uses key-canonicalized JSON serialization to guarantee identical hash output
 * across environments regardless of JavaScript key insertion order.
 */

export class BackupIntegrityService {
  /**
   * Recursively sorts object keys to produce a deterministic, canonical JSON string.
   */
  static canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(',')}]`;
    }

    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const keyValPairs = sortedKeys.map((key) => {
      const val = obj[key];
      // Skip undefined values to align with JSON.stringify semantics
      if (val === undefined) return '';
      return `${JSON.stringify(key)}:${this.canonicalize(val)}`;
    }).filter(Boolean);

    return `{${keyValPairs.join(',')}}`;
  }

  /**
   * Computes a SHA-256 hex string checksum for arbitrary data using Web Crypto API.
   */
  static async computeChecksum(data: unknown): Promise<string> {
    const canonicalJson = this.canonicalize(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(canonicalJson);

    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies whether the computed checksum of the data matches the expected checksum.
   */
  static async verifyChecksum(data: unknown, expectedChecksum: string): Promise<boolean> {
    if (!expectedChecksum || typeof expectedChecksum !== 'string') {
      return false;
    }

    try {
      const actualChecksum = await this.computeChecksum(data);
      return actualChecksum.toLowerCase() === expectedChecksum.trim().toLowerCase();
    } catch {
      return false;
    }
  }
}
