import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Download, Shield, KeyRound, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { BackupExportService } from '../../core/backup/backupExportService';
import { EncryptionService } from '../../core/crypto/encryptionService';
import { db } from '../../storage/db';

export function BackupExportPanel() {
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const refreshCounts = async () => {
    try {
      const [habits, logs, focus, intentions, debriefs, milestones] = await Promise.all([
        db.habits.count(),
        db.habitLogs.count(),
        db.focusSessions.count(),
        db.morningIntentions.count(),
        db.eveningDebriefs.count(),
        db.milestones.count(),
      ]);

      setRecordCounts({
        habits,
        habitLogs: logs,
        focusSessions: focus,
        reflections: intentions + debriefs,
        milestones,
      });
    } catch {
      // Ignored if DB is clearing
    }
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  const handleExport = async () => {
    setIsLoading(true);
    setStatusMessage('Generating database snapshot & computing SHA-256 checksum...');
    setErrorMessage(null);

    try {
      if (isEncrypted) {
        if (!password || password.length < 6) {
          setErrorMessage('Encryption password must be at least 6 characters.');
          setIsLoading(false);
          setStatusMessage(null);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setIsLoading(false);
          setStatusMessage(null);
          return;
        }

        setStatusMessage('Deriving 256-bit AES key (PBKDF2 600k iterations)...');
        const payload = await BackupExportService.generateBackup();
        const envelope = await EncryptionService.encryptPayload(payload, password);

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `semnotes-backup-encrypted-${dateStr}.enc.json`;
        const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        setStatusMessage('Encrypted backup downloaded successfully ✓');
        setPassword('');
        setConfirmPassword('');
      } else {
        const payload = await BackupExportService.generateBackup();
        BackupExportService.downloadBackupFile(payload);
        setStatusMessage('Full backup exported and downloaded successfully ✓');
      }

      await refreshCounts();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  return (
    <Card className="border-obsidian-750 bg-obsidian-900/90 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-gold-400" />
            <span>Complete Database Export</span>
          </CardTitle>
          <Badge variant="gold" size="sm">JSON v1.0</Badge>
        </div>
        <CardDescription className="text-slate-400 text-xs">
          Export all 11 local database tables, focus sessions, reflection journals, and user configuration into a single portable file.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Live records overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-750/70">
            <div className="text-[11px] text-slate-400 font-mono">Habits & Streaks</div>
            <div className="text-base font-bold text-slate-100">{recordCounts.habits ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-750/70">
            <div className="text-[11px] text-slate-400 font-mono">Check-In Logs</div>
            <div className="text-base font-bold text-slate-100">{recordCounts.habitLogs ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-750/70">
            <div className="text-[11px] text-slate-400 font-mono">Focus Sessions</div>
            <div className="text-base font-bold text-slate-100">{recordCounts.focusSessions ?? 0}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-750/70">
            <div className="text-[11px] text-slate-400 font-mono">Total Records</div>
            <div className="text-base font-bold text-gold-400">{totalRecords}</div>
          </div>
        </div>

        {/* Encryption Toggle */}
        <div className="p-3.5 rounded-lg bg-obsidian-850/60 border border-obsidian-750 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <div>
                <span className="text-xs font-semibold text-slate-200">Client-Side AES-256 Encryption</span>
                <p className="text-[11px] text-slate-400">
                  Encrypt backup with a personal passphrase using Web Crypto PBKDF2 & AES-GCM.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={isEncrypted ? 'primary' : 'outline'}
              size="sm"
              aria-pressed={isEncrypted}
              onClick={() => setIsEncrypted(!isEncrypted)}
              className="text-xs h-7"
            >
              {isEncrypted ? 'Password Protected' : 'Plain JSON'}
            </Button>
          </div>

          {isEncrypted && (
            <div className="pt-2 border-t border-obsidian-750 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="export-passphrase" className="text-[11px] font-mono text-slate-400 block mb-1">Passphrase</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" aria-hidden="true" />
                  <input
                    id="export-passphrase"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong passphrase..."
                    className="w-full bg-obsidian-900 border border-obsidian-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="export-confirm-passphrase" className="text-[11px] font-mono text-slate-400 block mb-1">Confirm Passphrase</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" aria-hidden="true" />
                  <input
                    id="export-confirm-passphrase"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter passphrase..."
                    className="w-full bg-obsidian-900 border border-obsidian-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-md bg-gold-950/30 border border-gold-800/40 text-xs text-gold-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-md bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Trigger button */}
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isLoading}
          className="w-full justify-center gap-2"
        >
          {isEncrypted ? <Shield className="w-4 h-4 text-obsidian-950" /> : <HardDrive className="w-4 h-4 text-obsidian-950" />}
          <span>{isLoading ? 'Exporting...' : isEncrypted ? 'Export Encrypted Backup (.enc.json)' : 'Download Full Backup (.json)'}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
