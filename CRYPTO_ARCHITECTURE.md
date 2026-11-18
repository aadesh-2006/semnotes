# SEMNÓTĒS — Client-Side Cryptographic Architecture & Threat Boundaries

**Product:** SEMNÓTĒS — Sovereign Personal Discipline & Self-Mastery Platform  
**Status:** M10 Phase 2, Batch 3C Cryptographic Hardening  
**Scope:** Zero-Knowledge Client-Side Backup Encryption & Sync Payload Protection  

---

## 1. Cryptographic Primitives & Specification

SEMNÓTĒS implements zero-knowledge, authenticated encryption strictly in the client browser using the standard **W3C Web Cryptography API** (`window.crypto.subtle`). No external or custom mathematical implementations are used.

| Parameter | Legacy Specification (v1.0) | Hardened Specification (v2.0) | Standard / Rationale |
| :--- | :--- | :--- | :--- |
| **Symmetric Cipher** | AES-GCM (Galois/Counter Mode) | AES-GCM (Galois/Counter Mode) | NIST SP 800-38D authenticated cipher |
| **Key Length** | 256 bits (32 bytes) | 256 bits (32 bytes) | Maximum AES key strength |
| **Key Derivation Function** | PBKDF2 (Password-Based Key Derivation Function 2) | PBKDF2 | RFC 8018 / NIST SP 800-132 |
| **KDF Pseudo-Random Function** | HMAC-SHA-256 | HMAC-SHA-256 | FIPS 180-4 standard |
| **Salt Generation** | 16 bytes (128 bits), `crypto.getRandomValues()` | 16 bytes (128 bits), `crypto.getRandomValues()` | Unique per encryption operation; prevents rainbow tables |
| **Initialization Vector (IV)** | 12 bytes (96 bits), `crypto.getRandomValues()` | 12 bytes (96 bits), `crypto.getRandomValues()` | Standard 96-bit GCM nonce; avoids GHASH counter degradation |
| **Authentication Tag** | 128 bits (16 bytes), appended to ciphertext | 128 bits (16 bytes), appended to ciphertext | NIST SP 800-38D standard tag length |
| **Default KDF Iterations** | 100,000 | **600,000** | Aligns with current OWASP password storage & derivation recommendations |
| **Safe Iteration Range** | Implicit (unvalidated in v1.0) | **50,000 min — 2,000,000 max** | Enforces minimum strength while preventing DoS via excessive parameters |
| **Key Extraction** | `extractable: false` | `extractable: false` | Derived `CryptoKey` handle cannot be exported by script execution |

---

## 2. Envelope Formats

### 2.1 Hardened Envelope (v2.0 — Default for New Exports)
```json
{
  "app": "semnotes",
  "formatVersion": "2.0",
  "algorithm": "AES-256-GCM",
  "kdf": "PBKDF2",
  "kdfParams": {
    "hash": "SHA-256",
    "iterations": 600000,
    "salt": "<Base64-16-bytes>"
  },
  "iv": "<Base64-12-bytes>",
  "ciphertext": "<Base64-encrypted-payload-with-16-byte-auth-tag>",
  "createdAt": "2026-11-18T10:00:00.000Z"
}
```

### 2.2 Legacy Envelope (v1.0 — Fully Supported for Decryption)
```json
{
  "app": "semnotes",
  "formatVersion": "1.0",
  "algorithm": "AES-256-GCM",
  "kdf": "PBKDF2",
  "kdfParams": {
    "hash": "SHA-256",
    "iterations": 100000,
    "salt": "<Base64-16-bytes>"
  },
  "iv": "<Base64-12-bytes>",
  "ciphertext": "<Base64-encrypted-payload-with-16-byte-auth-tag>",
  "createdAt": "2026-11-15T10:00:00.000Z"
}
```

---

## 3. Threat Model & Boundaries

### 3.1 What Client-Side Encryption Protects Against
1. **Compromised Storage Providers:** When an encrypted backup is stored on Google Drive, Dropbox, local disk, or transmitted via a cloud sync provider, an attacker possessing the file cannot read the habit history, reflections, or journal entries without the user's secret passphrase.
2. **Offline Dictionary & Brute-Force Attacks:** By mandating a 600,000-iteration PBKDF2 HMAC-SHA-256 derivation and a 16-byte salt, computing trial passwords requires significant computational expenditure per guess, resisting automated offline GPU/ASIC attacks.
3. **Ciphertext Tampering & Bit-Flipping:** AES-GCM generates a 128-bit authentication tag. Any modification to the ciphertext, initialization vector, or associated data causes `crypto.subtle.decrypt` to fail immediately and atomically, preventing forged record injection.
4. **Denial-of-Service via Malicious Iteration Floods:** Strict parameter validation caps incoming iteration counts at 2,000,000, preventing malicious actors from crashing the browser tab by submitting billions of PBKDF2 rounds.

### 3.2 Realistic Browser Memory & JavaScript Limitations
It is critical to document what browser-based cryptography **cannot** guarantee:
1. **Zeroization in Garbage-Collected Environments:** JavaScript engines (V8, SpiderMonkey, JavaScriptCore) manage memory through garbage collection. Strings (such as user-entered passwords) and ArrayBuffers cannot be safely wiped or overwritten with C-style `memset_s()`. Although `EncryptionService` clears its internal state variables upon completion, temporary copies may linger in V8 heap memory until garbage collected.
2. **Compromised Host Environment:** If an attacker has compromised the host machine, installed keyloggers, or injected malicious browser extensions into the origin, no client-side encryption can protect in-flight user keystrokes.
3. **Passphrase Recovery:** SEMNÓTĒS is strictly sovereign and zero-knowledge. There is no password reset mechanism, escrow service, or backdoor. If a user loses their encryption passphrase, their encrypted backup cannot be recovered.

---

## 4. Key Lifecycle & Security Invariants

1. **Passphrase Ingestion:** Passphrases are received as transient UTF-8 strings in component state during user interaction.
2. **Key Import:** The passphrase is imported as a raw PBKDF2 base key with `extractable: false`.
3. **Key Derivation:** The AES-256-GCM symmetric key is derived with `extractable: false`. The raw key bytes are never accessible to application JavaScript or external scripts.
4. **Deterministic Authentication Failure:** When an incorrect password or tampered payload is provided, `crypto.subtle.decrypt` throws an unforgeable native exception. This is converted into a structured `CryptoDecryptionError` without leaking internal stack traces.
5. **No Password Persistence:** Passwords and derived keys are never saved to `localStorage`, `sessionStorage`, IndexedDB, or transmitted over network calls. Component state holding passwords is wiped immediately when the modal or export action completes.
6. **Backward Compatibility Guarantee:** Existing v1.0 backups created with 100,000 iterations remain permanently decryptable. Upgraded backups are exported using the v2.0 format.
