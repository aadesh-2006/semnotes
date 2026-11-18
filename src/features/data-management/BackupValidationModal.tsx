import { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Database, RefreshCw, Layers } from 'lucide-react';
import type { BackupValidationReport, RestoreMode } from '../../core/backup/backupTypes';

interface BackupValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BackupValidationReport;
  onConfirmRestore: (mode: RestoreMode) => Promise<void>;
}

export function BackupValidationModal({
  isOpen,
  onClose,
  report,
  onConfirmRestore,
}: BackupValidationModalProps) {
  const [selectedMode, setSelectedMode] = useState<RestoreMode>('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const canRestore = report.isValid && (selectedMode !== 'replace' || replaceConfirmed);

  const handleExecuteRestore = async () => {
    setIsRestoring(true);
    try {
      await onConfirmRestore(selectedMode);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backup Integrity & Pre-Import Validation" maxWidth="lg">
      <div className="space-y-5">
        {/* Validation Status Banner */}
        <div className={`p-4 rounded-lg border ${
          !report.isValid
            ? 'bg-red-950/40 border-red-800/60 text-red-200'
            : report.warnings.length > 0
            ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-3">
            {!report.isValid ? (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : report.warnings.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {!report.isValid
                    ? 'Validation Failed — Corrupted or Incompatible Backup'
                    : report.warnings.length > 0
                    ? 'Backup Validated with Non-Fatal Warnings'
                    : 'Cryptographic Integrity & Schema Validated'}
                </span>
                <Badge variant={!report.isValid ? 'outline' : 'gold'} size="sm">
                  {report.totalRecords} Records
                </Badge>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Exported {new Date(report.exportedAt || Date.now()).toLocaleString()} &bull; Format v{report.backupVersion} (DB v{report.dbVersion})
              </p>
            </div>
          </div>
        </div>

        {/* Checksum & Manifest Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-500 block text-[10px]">CHECKSUM</span>
            <span className={`font-semibold flex items-center gap-1 ${report.checksumValid ? 'text-emerald-400' : 'text-amber-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {report.checksumValid ? 'SHA-256 Valid' : 'Unsigned/Mismatch'}
            </span>
          </div>
          <div className="p-2.5 rounded bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-500 block text-[10px]">HABITS</span>
            <span className="text-slate-200 font-semibold">{report.recordCounts.habits ?? 0}</span>
          </div>
          <div className="p-2.5 rounded bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-500 block text-[10px]">CHECK-INS</span>
            <span className="text-slate-200 font-semibold">{report.recordCounts.habitLogs ?? 0}</span>
          </div>
          <div className="p-2.5 rounded bg-obsidian-900 border border-obsidian-750">
            <span className="text-slate-500 block text-[10px]">FOCUS SESSIONS</span>
            <span className="text-slate-200 font-semibold">{report.recordCounts.focusSessions ?? 0}</span>
          </div>
        </div>

        {/* Errors list if any */}
        {report.errors.length > 0 && (
          <div className="p-3 rounded bg-red-950/20 border border-red-800/40 space-y-1.5 text-xs text-red-300">
            <span className="font-semibold block text-red-200">Critical Errors Detected:</span>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
              {report.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings list if any */}
        {report.warnings.length > 0 && (
          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/40 space-y-1.5 text-xs text-amber-300">
            <span className="font-semibold block text-amber-200">Warnings:</span>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
              {report.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Restore Mode Selector */}
        {report.isValid && (
          <div className="space-y-3 pt-2 border-t border-obsidian-750">
            <label className="text-xs font-semibold text-slate-200 block">
              Choose Restore Strategy:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mode 2: Merge */}
              <div
                onClick={() => setSelectedMode('merge')}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMode === 'merge'
                    ? 'border-gold-500 bg-gold-950/20 text-slate-100'
                    : 'border-obsidian-750 bg-obsidian-900/50 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className={`w-4 h-4 ${selectedMode === 'merge' ? 'text-gold-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-200">Merge Data (Additive)</span>
                  <Badge variant="gold" size="sm">Recommended</Badge>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Safely preserves all your current local habits and audit history. Non-duplicate records are added smoothly.
                </p>
              </div>

              {/* Mode 1: Replace */}
              <div
                onClick={() => setSelectedMode('replace')}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMode === 'replace'
                    ? 'border-red-500/80 bg-red-950/20 text-slate-100'
                    : 'border-obsidian-750 bg-obsidian-900/50 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className={`w-4 h-4 ${selectedMode === 'replace' ? 'text-red-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-200">Replace Database</span>
                  <Badge variant="outline" size="sm">Destructive</Badge>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Replaces the current local database entirely with this backup. An in-memory safety snapshot rollback is preserved.
                </p>
              </div>
            </div>

            {selectedMode === 'replace' && (
              <div className="p-3 rounded bg-red-950/30 border border-red-800/50 text-xs text-red-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirmReplaceCheck"
                    checked={replaceConfirmed}
                    onChange={(e) => setReplaceConfirmed(e.target.checked)}
                    className="accent-red-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor="confirmReplaceCheck" className="cursor-pointer select-none font-medium">
                    I understand this will overwrite current local database records with the backup.
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-obsidian-750">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isRestoring}>
            Cancel
          </Button>
          <Button
            variant={selectedMode === 'replace' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleExecuteRestore}
            disabled={!canRestore || isRestoring}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            <span>{isRestoring ? 'Restoring Database...' : `Execute ${selectedMode === 'replace' ? 'Full Replace' : 'Safe Merge'}`}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
