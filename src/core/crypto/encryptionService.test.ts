import { describe, it, expect } from 'vitest';
import { EncryptionService } from './encryptionService';
import {
  CryptoDecryptionError,
  DEFAULT_PBKDF2_ITERATIONS,
  ENCRYPTION_FORMAT_VERSION,
  MIN_PBKDF2_ITERATIONS,
  MAX_PBKDF2_ITERATIONS,
} from './cryptoTypes';
import {
  LEGACY_ENCRYPTED_BACKUP_FIXTURE,
  LEGACY_FIXTURE_PASSPHRASE,
} from '../../test/fixtures/legacyEncryptedBackupFixture';
import type { SemnotesBackupPayload } from '../backup/backupTypes';
import { BackupValidationService } from '../backup/backupValidationService';

describe('Client-Side Cryptographic Service (AES-256-GCM + PBKDF2 Hardening)', () => {
  const testPassword = 'SovereignDisciplineKey_2026!';
  const samplePlaintext = JSON.stringify({
    note: 'Sensitive sovereign journal entry regarding personal discipline.',
    rating: 10,
    habits: ['Cold Shower', 'DSA Mastery', 'No PMO'],
  });

  // 1. New-format encryption and decryption round trip
  it('1. performs clean round-trip encryption and decryption with default v2.0 envelope and 600k iterations', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    expect(envelope.app).toBe('semnotes');
    expect(envelope.formatVersion).toBe(ENCRYPTION_FORMAT_VERSION);
    expect(envelope.formatVersion).toBe('2.0');
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.kdf).toBe('PBKDF2');
    expect(envelope.kdfParams.iterations).toBe(DEFAULT_PBKDF2_ITERATIONS);
    expect(envelope.kdfParams.iterations).toBe(600000);
    expect(envelope.kdfParams.hash).toBe('SHA-256');
    expect(envelope.iv).toBeDefined();
    expect(envelope.ciphertext).toBeDefined();

    const decrypted = await EncryptionService.decryptEnvelope(envelope, testPassword);
    expect(decrypted).toBe(samplePlaintext);
  });

  // 2. Legacy-format decryption
  it('2. successfully decrypts legacy format v1.0 generated envelope with 100,000 iterations', async () => {
    const legacyEnvelope = await EncryptionService.encryptString(samplePlaintext, testPassword, {
      formatVersion: '1.0',
      iterations: 100000,
    });

    expect(legacyEnvelope.formatVersion).toBe('1.0');
    expect(legacyEnvelope.kdfParams.iterations).toBe(100000);

    const decrypted = await EncryptionService.decryptEnvelope(legacyEnvelope, testPassword);
    expect(decrypted).toBe(samplePlaintext);
  });

  // 3. Legacy 100,000-iteration backup compatibility fixture
  it('3. successfully decrypts legacy format v1.0 backup fixture created in prior milestones', async () => {
    expect(LEGACY_ENCRYPTED_BACKUP_FIXTURE.formatVersion).toBe('1.0');
    expect(LEGACY_ENCRYPTED_BACKUP_FIXTURE.kdfParams.iterations).toBe(100000);

    const decrypted = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
      LEGACY_ENCRYPTED_BACKUP_FIXTURE,
      LEGACY_FIXTURE_PASSPHRASE
    );

    expect(decrypted.manifest.app).toBe('semnotes');
    expect(decrypted.manifest.backupVersion).toBe('1.0');
    expect(decrypted.data.habits).toHaveLength(1);
    expect(decrypted.data.habits[0].title).toBe('Morning Meditation');
    expect(decrypted.data.habitLogs).toHaveLength(1);
  });

  // 4. Wrong password
  it('4. strictly rejects decryption with an incorrect password', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    await expect(
      EncryptionService.decryptEnvelope(envelope, 'IncorrectPassphrase123!')
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 5. Corrupted ciphertext
  it('5. strictly rejects decryption if ciphertext body is corrupted', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    const rawBytes = EncryptionService.base64ToUint8Array(envelope.ciphertext);
    rawBytes[10] ^= 0xff; // Flip bits in middle of ciphertext
    const tamperedEnvelope = { ...envelope, ciphertext: EncryptionService.bufferToBase64(rawBytes) };

    await expect(
      EncryptionService.decryptEnvelope(tamperedEnvelope, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 6. Modified authentication tag
  it('6. strictly rejects decryption if AES-GCM authentication tag is modified', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    const rawBytes = EncryptionService.base64ToUint8Array(envelope.ciphertext);
    // In Web Crypto AES-GCM, the last 16 bytes are the authentication tag
    rawBytes[rawBytes.length - 1] ^= 0x01;
    const tamperedEnvelope = { ...envelope, ciphertext: EncryptionService.bufferToBase64(rawBytes) };

    await expect(
      EncryptionService.decryptEnvelope(tamperedEnvelope, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 7. Modified IV
  it('7. strictly rejects decryption if initialization vector is modified', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    const rawIv = EncryptionService.base64ToUint8Array(envelope.iv);
    rawIv[0] ^= 0xff;
    const tamperedEnvelope = { ...envelope, iv: EncryptionService.bufferToBase64(rawIv) };

    await expect(
      EncryptionService.decryptEnvelope(tamperedEnvelope, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 8. Missing salt
  it('8. rejects envelope with missing salt in kdfParams', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = {
      ...envelope,
      kdfParams: { ...envelope.kdfParams, salt: '' },
    };

    await expect(
      EncryptionService.decryptEnvelope(broken as any, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 9. Invalid salt length
  it('9. rejects envelope with invalid salt length (e.g. 8 bytes instead of 16)', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const shortSalt = EncryptionService.bufferToBase64(new Uint8Array(8));
    const broken = {
      ...envelope,
      kdfParams: { ...envelope.kdfParams, salt: shortSalt },
    };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(/Invalid salt length/);
  });

  // 10. Invalid IV length
  it('10. rejects envelope with invalid IV length (e.g. 16 bytes instead of 12)', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const longIv = EncryptionService.bufferToBase64(new Uint8Array(16));
    const broken = { ...envelope, iv: longIv };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(/Invalid IV length/);
  });

  // 11. Unsupported envelope version
  it('11. rejects envelope with unsupported envelope version', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = { ...envelope, formatVersion: '3.0' as any };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(/Unsupported envelope version/);
  });

  // 12. Unsupported KDF
  it('12. rejects envelope with unsupported key derivation function', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = { ...envelope, kdf: 'Argon2id' as any };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(/Unsupported key derivation function/);
  });

  // 13. Unsupported encryption algorithm
  it('13. rejects envelope with unsupported encryption algorithm', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = { ...envelope, algorithm: 'AES-CBC' as any };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(/Unsupported encryption algorithm/);
  });

  // 14. Invalid iteration count below minimum
  it('14. rejects envelope with iteration count below minimum safety threshold (e.g. 1,000)', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = {
      ...envelope,
      kdfParams: { ...envelope.kdfParams, iterations: 1000 },
    };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(new RegExp(`${MIN_PBKDF2_ITERATIONS}`));
  });

  // 15. Excessively high iteration count (DoS protection)
  it('15. rejects envelope with excessively high iteration count to prevent DoS (e.g. 10,000,000)', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const broken = {
      ...envelope,
      kdfParams: { ...envelope.kdfParams, iterations: 10000000 },
    };

    await expect(
      EncryptionService.decryptEnvelope(broken, testPassword)
    ).rejects.toThrow(new RegExp(`${MAX_PBKDF2_ITERATIONS}`));
  });

  // 16. Missing required fields
  it('16. rejects envelope missing required top-level attributes', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const { ciphertext, ...missingCiphertext } = envelope;

    await expect(
      EncryptionService.decryptEnvelope(missingCiphertext as any, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 17. Empty password handling
  it('17. cleanly rejects empty or whitespace-only password on both encryption and decryption', async () => {
    await expect(
      EncryptionService.encryptString(samplePlaintext, '')
    ).rejects.toThrow('Encryption password cannot be empty.');

    await expect(
      EncryptionService.encryptString(samplePlaintext, '   ')
    ).rejects.toThrow('Encryption password cannot be empty.');

    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    await expect(
      EncryptionService.decryptEnvelope(envelope, '')
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 18. Unicode password handling
  it('18. supports complex Unicode, emoji, and multilingual passphrases', async () => {
    const unicodePassphrase = '🏛️_Σεμνότης_2026_規律と尊厳_🔥';
    const envelope = await EncryptionService.encryptString(samplePlaintext, unicodePassphrase);
    const decrypted = await EncryptionService.decryptEnvelope(envelope, unicodePassphrase);

    expect(decrypted).toBe(samplePlaintext);

    // Mismatched unicode fails
    await expect(
      EncryptionService.decryptEnvelope(envelope, '🏛️_Σεμνότης_2026_規律と尊厳_💧')
    ).rejects.toThrow(CryptoDecryptionError);
  });

  // 19. Large backup encryption
  it('19. performs clean encryption of large backup payload (1,000+ items)', async () => {
    const largePayload: Record<string, any> = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: { habits: 1000 },
        checksum: 'fakechecksum',
      },
      data: {
        habits: Array.from({ length: 1000 }, (_, i) => ({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          title: `Discipline Habit #${i} — Consistency & Focus`,
          category: 'focus',
          scheduleType: 'daily',
          targetFrequency: 1,
          createdAt: new Date().toISOString(),
          archived: false,
        })),
      },
    };

    const envelope = await EncryptionService.encryptPayload(largePayload, testPassword);
    expect(envelope.ciphertext.length).toBeGreaterThan(10000);
    expect(envelope.formatVersion).toBe('2.0');
  });

  // 20. Large backup decryption
  it('20. performs clean decryption of large backup payload (1,000+ items)', async () => {
    const largePayload: Record<string, any> = {
      manifest: {
        app: 'semnotes',
        backupVersion: '1.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        dbVersion: 6,
        recordCounts: { habits: 500 },
        checksum: 'fakechecksum',
      },
      data: {
        habits: Array.from({ length: 500 }, (_, i) => ({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          title: `Discipline Habit #${i}`,
          category: 'focus',
          scheduleType: 'daily',
          targetFrequency: 1,
          createdAt: new Date().toISOString(),
          archived: false,
        })),
      },
    };

    const envelope = await EncryptionService.encryptPayload(largePayload, testPassword);
    const decrypted = await EncryptionService.decryptPayload<typeof largePayload>(envelope, testPassword);
    expect(decrypted.data.habits).toHaveLength(500);
    expect(decrypted.data.habits[250].title).toBe('Discipline Habit #250');
  });

  // 21. Independent encryption operations producing different salts and IVs
  it('21. generates unique salts, IVs, and ciphertexts for identical inputs', async () => {
    const envelope1 = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const envelope2 = await EncryptionService.encryptString(samplePlaintext, testPassword);

    expect(envelope1.kdfParams.salt).not.toBe(envelope2.kdfParams.salt);
    expect(envelope1.iv).not.toBe(envelope2.iv);
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);

    expect(await EncryptionService.decryptEnvelope(envelope1, testPassword)).toBe(samplePlaintext);
    expect(await EncryptionService.decryptEnvelope(envelope2, testPassword)).toBe(samplePlaintext);
  });

  // 22. Successful decryption followed by backup schema validation
  it('22. passes comprehensive BackupValidationService checks after decrypting legacy fixture', async () => {
    const decryptedPayload = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
      LEGACY_ENCRYPTED_BACKUP_FIXTURE,
      LEGACY_FIXTURE_PASSPHRASE
    );

    const { report, parsedPayload } = await BackupValidationService.validate(decryptedPayload);

    expect(report.isValid).toBe(true);
    expect(report.app).toBe('semnotes');
    expect(report.backupVersion).toBe('1.0');
    expect(report.errors).toHaveLength(0);
    expect(parsedPayload).not.toBeNull();
    expect(parsedPayload?.data.habits).toHaveLength(1);
  });
});
