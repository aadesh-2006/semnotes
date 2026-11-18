import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { UploadCloud, FileJson, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BackupValidationService } from '../../core/backup/backupValidationService';
import { RestoreTransactionService } from '../../core/backup/restoreTransactionService';
import { EncryptionService } from '../../core/crypto/encryptionService';
import { BackupValidationModal } from './BackupValidationModal';
import type { BackupValidationReport, RestoreMode, SemnotesBackupPayload } from '../../core/backup/backupTypes';
import type { EncryptedBackupEnvelope } from '../../core/crypto/cryptoTypes';

export function BackupRestorePanel({ onRestoreComplete }: { onRestoreComplete?: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [encryptedEnvelope, setEncryptedEnvelope] = useState<EncryptedBackupEnvelope | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');

  const [validationReport, setValidationReport] = useState<BackupValidationReport | null>(null);
  const [validatedPayload, setValidatedPayload] = useState<SemnotesBackupPayload | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setRestoreSuccessMessage(null);
    setIsEncryptedFile(false);
    setEncryptedEnvelope(null);
    setDecryptPassword('');

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorMessage('Uploaded file is not a valid JSON document.');
        return;
      }

      // Check if file is an EncryptedBackupEnvelope
      if (parsed && parsed.algorithm === 'AES-256-GCM' && parsed.kdf === 'PBKDF2') {
        setIsEncryptedFile(true);
        setEncryptedEnvelope(parsed as EncryptedBackupEnvelope);
      } else {
        // Plain JSON backup
        await runValidation(text);
      }
    } catch (err) {
      setErrorMessage(`Failed to read file: ${(err as Error).message}`);
    }
  };

  const handleDecryptAndValidate = async () => {
    if (!encryptedEnvelope) return;
    if (!decryptPassword) {
      setErrorMessage('Please enter the decryption passphrase.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const decryptedPayload = await EncryptionService.decryptPayload<SemnotesBackupPayload>(
        encryptedEnvelope,
        decryptPassword
      );
      setValidatedPayload(decryptedPayload);

      // Validate decrypted payload
      const { report } = await BackupValidationService.validate(decryptedPayload);
      setValidationReport(report);
      setIsModalOpen(true);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const runValidation = async (rawInput: string | unknown) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { report, parsedPayload } = await BackupValidationService.validate(rawInput);
      setValidationReport(report);
      setValidatedPayload(parsedPayload);
      setIsModalOpen(true);
    } catch (err) {
      setErrorMessage(`Validation error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteRestore = async (mode: RestoreMode) => {
    if (!validatedPayload) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'replace') {
        const result = await RestoreTransactionService.restoreReplace(validatedPayload);
        if (!result.success) {
          throw new Error('Replace restoration failed. In-memory snapshot rolled back successfully.');
        }
        setRestoreSuccessMessage(`Complete replace restore successful: ${result.totalRestored} total records restored.`);
      } else {
        const result = await RestoreTransactionService.restoreMerge(validatedPayload);
        if (!result.success) {
          throw new Error('Merge restoration failed.');
        }
        setRestoreSuccessMessage(`Safe merge successful: ${result.insertedCount} records inserted, ${result.skippedCount} duplicates skipped.`);
      }

      setIsModalOpen(false);
      setSelectedFile(null);
      setValidationReport(null);
      setValidatedPayload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onRestoreComplete) {
        onRestoreComplete();
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-obsidian-750 bg-obsidian-900/90 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-gold-400" />
            <span>Safe Database Restore</span>
          </CardTitle>
          <Badge variant="outline" size="sm">Pre-Validated</Badge>
        </div>
        <CardDescription className="text-slate-400 text-xs">
          Restore data from a JSON or encrypted backup with automatic validation, duplicate handling, and zero data loss rollback.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.enc.json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Dropzone UI */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-6 border-2 border-dashed border-obsidian-700 hover:border-gold-500/60 rounded-lg bg-obsidian-850/50 hover:bg-obsidian-850 transition-all cursor-pointer text-center space-y-2"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-gold-400">
            <FileJson className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {selectedFile ? selectedFile.name : 'Click to select or drop SEMNÓTĒS backup (.json / .enc.json)'}
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Compatible with standard JSON backups and AES-256-GCM encrypted envelopes.
          </p>
        </div>

        {/* Encrypted Password Prompt if applicable */}
        {isEncryptedFile && (
          <div className="p-3.5 rounded-lg bg-gold-950/20 border border-gold-800/40 space-y-3">
            <div className="flex items-center gap-2 text-gold-300 text-xs font-semibold">
              <Lock className="w-4 h-4" />
              <span>Encrypted Backup Detected (AES-256-GCM)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                placeholder="Enter decryption passphrase..."
                className="flex-1 bg-obsidian-900 border border-obsidian-700 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 font-mono"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleDecryptAndValidate}
                disabled={isLoading}
                className="text-xs"
              >
                {isLoading ? 'Decrypting...' : 'Decrypt & Validate'}
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {restoreSuccessMessage && (
          <div className="p-3 rounded-md bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{restoreSuccessMessage}</span>
          </div>
        )}

        {/* Validation Modal */}
        {validationReport && validatedPayload && (
          <BackupValidationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            report={validationReport}
            onConfirmRestore={handleExecuteRestore}
          />
        )}
      </CardContent>
    </Card>
  );
}
