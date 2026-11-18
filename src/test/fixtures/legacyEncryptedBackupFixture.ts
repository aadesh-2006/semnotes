/**
 * SEMNÓTĒS — Legacy Encrypted Backup Test Fixture
 * Generated with M9 parameters:
 * - App: semnotes
 * - formatVersion: 1.0
 * - Algorithm: AES-256-GCM
 * - KDF: PBKDF2 (SHA-256, 100,000 iterations)
 * - Known Passphrase: 'SovereignLegacyKey_2026!'
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
    salt: 'Veta5V8jEiz1e/UGYKXVoQ==',
  },
  iv: 'kWRBmcSExztk62fU',
  ciphertext:
    '5HVY9fA6ahojddJcdD3u1HLlrbnVyutTlABadSvSUIabhr7xYT9eivvEdK3gdyQxGQVT5SClJKmCQOIUm5Un/KuarYH8BUYc+hxy46X+BTGXs5eDwI7zYLnIdfIHP5GbdImAzHpDq+8ufdXI19REtgbNxGyC0Cc3Clj/4PqDFYjqqaISMJ+Lo6aBFTA55LVfDkf3ZkeXl9X800xVdBa+Dg8NoApul7UcKlZe/abUUPyAlhyc6/bpCD/0Z0wSVPaz4y450y4Z79uXs3ky1RExWalqRWdi6AOh9CrtYmNF7DeBNORYEKFKyEMDgqqVCFGMoac/LaZXjWYOfcEqj1uhnEI2P/fkbm+K80bAOmh79ShM3AHJmPCRWJUN6KniF5ftfPoxxspR9jtEUxGK+w9gh4FwISjjoGQOjkWsWwy7SPzyKmC5CdlKzJFhAdlh6Jp9q4oBm6O/ZDjDyrs/zdWQ9txNeXz50WwGnm4NAEEwtS01pbfhbbJJ6OM5P2I2Jz0YlEDysOATSCCZH0nfTRymBns0ChpXV299DXIkzsd89QwAxaSl7679Hl2nMKtyn64AkwyPtXAiJA1/n4EfziKqBBDNKD6MOEiw+XUqZ4JXFCDEGmm8Ek+0FfpLEM7H8RDwkjpHV95rzoq2sx+j+ErQv81yW0eTVQLo9FGE+/fE20rjHkk7E18/Xf4N+FkiWX1xfdo6VrC72FFdAHzmMK2DzLFBFsksQA5iJ0AHEPIPm1K6LIkwgBAUWw1QnT9UVrMEHcYirHtNUR+VlHGS0rL0nbRTuf/FwN5X/fYjuApuj7oMnfJzhjGu9IoRMsEyao0PLuS52lwMFK9bYOsWMTa71BpWVcW/kydqfNWDIZPPMyeJEhLUouLqG95Kh3sGWCMWTXNCsG4np6h/qo7xsL89//6RsP2UtYhZivCnVN8ndrUv7nTlrH65kd7lcnlK6qzJV1rUqZb8ray9omqQPWW7PxJN1ecMNoTR4cqrv+1r4ruTuMijrhs20SOBxickU2ccE8Ku8+0MdqfM0FWXwcDfQHw3ZRVyqebsnSRIF2sxY/bCXOkhUMVo6IJcuYDcNS7tHAw05OTzxGxHle92ZlxAPO2qteGsfnJxbVd9TVTi86yn7sQVn/K1TTy2TMUNrfcCj/sx1oDMC9oe2Ps1xGohiYH7HjaYKFjH/kfgqjAjo3ss1fMfAs+UUo3ausqwqkzT475VYUeLDVMs5KEcfjc+1eTqC7aZGFv93VEOuObk/Sj4mFfJ6Y2aw2LbY59JMHG56LNwR4bwhcwGbEiNtR1q1fs1hGGqpI63S2PXjlY69M7wMZr9hcSjJbUCAiOeu7w0MUX7PLY02u972VQhYcfLeCR5/zwB6I0DvTKPjgnuy27ggOV60DKEsJM8RjDMshV/+Bi55MMjWOVfYhMsNCjMadBiKUxERSxB3dJ3eSxWn2XTXHJkPX3ADOgT3uY7NQgru0ZU2/s5bLEVhpWVFNkroR2gvDVpDlY/SpQZgvoW+NxUqyemlUyp/60ee8rK5QI=',
  createdAt: '2026-11-15T10:05:00.000Z',
};
