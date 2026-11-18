import { describe, it, expect } from 'vitest';
import { EncryptionService } from './encryptionService';
import { CryptoDecryptionError } from './cryptoTypes';
import {
  LEGACY_ENCRYPTED_BACKUP_FIXTURE,
  LEGACY_FIXTURE_PASSPHRASE,
} from '../../test/fixtures/legacyEncryptedBackupFixture';
import type { SemnotesBackupPayload } from '../backup/backupTypes';

describe('Client-Side Encryption Service (AES-256-GCM + PBKDF2)', () => {
  const testPassword = 'SovereignDisciplineKey_2026!';
  const samplePlaintext = JSON.stringify({
    note: 'Sensitive sovereign journal entry regarding personal discipline.',
    rating: 10,
    habits: ['Cold Shower', 'DSA Mastery', 'No PMO'],
  });

  it('performs clean round-trip encryption and decryption of string data', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    expect(envelope.app).toBe('semnotes');
    expect(envelope.formatVersion).toBe('1.0');
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.kdf).toBe('PBKDF2');
    expect(envelope.kdfParams.iterations).toBe(100000);
    expect(envelope.kdfParams.hash).toBe('SHA-256');
    expect(envelope.iv).toBeDefined();
    expect(envelope.ciphertext).toBeDefined();

    const decrypted = await EncryptionService.decryptEnvelope(envelope, testPassword);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('performs clean round-trip encryption and decryption of complex object payloads', async () => {
    const payload = {
      habits: [{ id: '123', title: 'Deep Work' }],
      meta: { timestamp: 1770000000, secure: true },
    };

    const envelope = await EncryptionService.encryptPayload(payload, testPassword);
    const decryptedPayload = await EncryptionService.decryptPayload<typeof payload>(envelope, testPassword);

    expect(decryptedPayload).toEqual(payload);
  });

  it('generates unique cryptographic salt, IV, and ciphertext on every encryption call', async () => {
    const envelope1 = await EncryptionService.encryptString(samplePlaintext, testPassword);
    const envelope2 = await EncryptionService.encryptString(samplePlaintext, testPassword);

    // Even with identical plaintext and password, salt, iv, and ciphertext must never repeat
    expect(envelope1.kdfParams.salt).not.toBe(envelope2.kdfParams.salt);
    expect(envelope1.iv).not.toBe(envelope2.iv);
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);

    // Both envelopes must successfully decrypt
    expect(await EncryptionService.decryptEnvelope(envelope1, testPassword)).toBe(samplePlaintext);
    expect(await EncryptionService.decryptEnvelope(envelope2, testPassword)).toBe(samplePlaintext);
  });

  it('strictly rejects decryption with an incorrect password', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    await expect(
      EncryptionService.decryptEnvelope(envelope, 'WrongPassword123!')
    ).rejects.toThrow(CryptoDecryptionError);
  });

  it('strictly rejects decryption if the ciphertext is tampered with', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    // Tamper with ciphertext by modifying a character
    const tamperedCiphertext = envelope.ciphertext.slice(0, -4) + 'AAAA';
    const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };

    await expect(
      EncryptionService.decryptEnvelope(tamperedEnvelope, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  it('strictly rejects decryption if the IV is tampered with', async () => {
    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);

    // Tamper with IV
    const tamperedIv = envelope.iv.slice(0, -4) + 'ZZZZ';
    const tamperedEnvelope = { ...envelope, iv: tamperedIv };

    await expect(
      EncryptionService.decryptEnvelope(tamperedEnvelope, testPassword)
    ).rejects.toThrow(CryptoDecryptionError);
  });

  it('rejects empty password on encryption and decryption', async () => {
    await expect(
      EncryptionService.encryptString(samplePlaintext, '')
    ).rejects.toThrow('Encryption password cannot be empty.');

    const envelope = await EncryptionService.encryptString(samplePlaintext, testPassword);
    await expect(
      EncryptionService.decryptEnvelope(envelope, '')
    ).rejects.toThrow(CryptoDecryptionError);
  });

  it('successfully decrypts legacy format v1.0 backup fixture created with 100,000 iterations', async () => {
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
});
