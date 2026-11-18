/**
 * SEMNÓTĒS — Legacy Encrypted Backup Test Fixture
 * Generated with M9 parameters:
 * - App: semnotes
 * - formatVersion: 1.0
 * - Algorithm: AES-256-GCM
 * - KDF: PBKDF2 (SHA-256, 100,000 iterations)
 * - Known Passphrase: 'SovereignLegacyKey_2026!'
 * - Conforms to full schema validation & SHA-256 integrity checksum
 */

import type { EncryptedBackupEnvelope } from '../../core/crypto/cryptoTypes';

export const LEGACY_FIXTURE_PASSPHRASE = 'SovereignLegacyKey_2026!';

export const LEGACY_ENCRYPTED_BACKUP_FIXTURE: EncryptedBackupEnvelope = {
  app: 'semnotes',
  formatVersion: '1.0',
  algorithm: 'AES-256-GCM',
  kdf: 'PBKDF2',
  kdfParams: {
    hash: 'SHA-256',
    iterations: 100000,
    salt: '7ecI4wNKC36ki70UZFOsEg==',
  },
  iv: 'AsF0RQ9wHrZlVSXl',
  ciphertext:
    'MMq445Dge8Iw01hOjfaookl4hMSSxJSajFPFQcOcc1i9l7Yy/pfyEk5TIaWBwmcBaFnaNwowWaz9RaltLmlH8CRq4Jl8r6HzrycNHxYafWWkwFn+9uwTONpsj9gU3C2EpJjjyweJlhfU/1rRSjAxtpYGZGxE46BnrMTNZ/hvesm8NyG2Pichs0FMjcQLu+zdweN/s+zTVjbx6TtPoodyAkrZlA/N/QYee7n5ZzonhzeSeK/IsQU9JdVKjnyvHP0aHUFEqDKPfg97KxYSZlHf1eSLv+pjh8CwE8bwV0/AVR7nYMfjI+hYxaatZBLHSUJc6HoVzWG8MGE/0jr1pQFJVbxHiImkWNPARtS935XkzZAYJNF1rYJITG3uU7JwTkB+Nd5XaAkuGgNVOt8INvW0TfqOfuLNeWJj7pbQ6pqEDzwU1a8BVhXFVq5+y6Mh8RsxLshPOSZya4wmIZkQOz3HJuGCSZSKa64YJ5Xks2FLJzIqQ28cb8dG8Pt7ttPkGlY9ZMgiQqQS0ReW6yNwZ82TPtyPtrQzOY9ho2BO5j49/u37IjAwsdRo3tCh7J37VwiTYDYYmSFhnHeFMnzmI/dx+Yinaz4yFxQkOFr0beDNebqZlF2nbrOtudY3hnWi/JSwf3AF1+o2GiNI35bdF/sSoC2AuPX5wNPCMQpfM8wS8kcB4CfWMqhiKEqxZ2rcSTNCRbu7H3Z4YEuq1T+hFwXeJErOKwCwGIBgx2M6ModaN9usaSCe3m2ZmHxFgA7bFizQcIl/WZuGSFdtGbFQvou8BRuMBHkqfdMpHtIA0UZxrhLCw0jCLmvns5azVAUON5MG8wFF9KKWypEutlUFl8bgz7fan4+eBfvM+vZ3F6CC9FBapLyqYBbgWrI1hFb5vHfptlR78fwEvHXyVJhL9QZWp016BS6aPDdqy5o5XlBKl2FpTMzCah3259uAxGpT84HWlxoxqllsHIupt4L0V9j0omRhwAudJHt/UdWd1tRBe6gmO95A+UoXH2DVIeFNzc7y0pJ/T/Q49VJStaPJ06y9iV5VTxB08GIHR4BHO46MYydqmfxsNDyC6qeCdWHn1omMg19iTYdb5b7zCamyHvJYoGQ8fr6Gml/404j4L8bgZI7FsAOPCHNABe0bJj04kwRsWZsRibi32rWRHdCkMFScWFWsoc5lErcxKn/lC/+RCZQ7+2K935Y3zbJAN+V5EEznT2gXL17aVvoN/jxVSUUkxdoPOXdGkUSZGaYRZii0TU7ke1casFAHwE/MhcSATQdTRbBhb2wHvsRaow3wgNcNKIBDvN/pk87oidFbiTcOh2rOrX2kQ9LzXzAs52GTRbN1+Df6k8vu/lthe1t7jL4aywcrow3f+pziS04ULMrZNbPxskpppzth01GEMzo2hL8zuEDuVvlLLxZYGpyrL9xZ8Sur7Nvu9Xt8mV7Ck51bLh96/bnAxdz1lH1aCVmFImqhKCCtb5+BgLgYysE/6fZgChRktv8qrFdFTVLGTJBfts/Xtbe1+r67ChQHSP+PKbOZo5GTFNVsfwMwHZc7oinqm8JvH1iSrDj74Um1OlpdjcjA++AeKP/6lwBvuc3OrrAqOz/GH1zB/xuiAZrvUY2oe9K3j2UHfglnYDr4rg==',
  createdAt: '2026-11-15T10:05:00.000Z',
};
