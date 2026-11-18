import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Cloud, RefreshCw, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SyncService } from '../../core/sync/syncService';
import { MockCloudSyncProvider, SupabaseSyncProvider } from '../../core/sync/syncProvider';
import type { SyncState, ConflictResolutionMode } from '../../core/sync/syncTypes';

// Singleton instance for the UI session
const globalMockProvider = new MockCloudSyncProvider();
const globalSyncService = new SyncService(globalMockProvider);

export function SyncSettingsPanel({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [providerType, setProviderType] = useState<'mock' | 'supabase'>('mock');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [password, setPassword] = useState('');
  const [localVersion, setLocalVersion] = useState<number>(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  const refreshState = () => {
    setSyncState(globalSyncService.getState());
    setLocalVersion(globalSyncService.getLocalVersion());
    setLastSyncedAt(globalSyncService.getLastSyncedAt());
    setErrorMessage(globalSyncService.getLastErrorMessage());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleProviderSwitch = (type: 'mock' | 'supabase') => {
    setProviderType(type);
    if (type === 'mock') {
      globalSyncService.setProvider(globalMockProvider);
    } else {
      const sp = new SupabaseSyncProvider();
      globalSyncService.setProvider(sp);
    }
    refreshState();
  };

  const handleSyncNow = async () => {
    if (!password) {
      setErrorMessage('Please enter your client-side encryption passphrase.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage('Syncing with remote provider...');

    const result = await globalSyncService.performSync(password);
    refreshState();

    if (result.success) {
      setStatusMessage(`Sync successful! Version ${result.version} established.`);
      setTimeout(() => setStatusMessage(null), 4000);
      if (onSyncComplete) onSyncComplete();
    } else if (result.error === 'CONFLICT_DETECTED') {
      setStatusMessage(null);
    }
  };

  const handleResolveConflict = async (mode: ConflictResolutionMode) => {
    if (!password) {
      setErrorMessage('Passphrase required to decrypt/encrypt conflict resolution.');
      return;
    }

    setIsResolving(true);
    setErrorMessage(null);

    const result = await globalSyncService.resolveConflict(mode, password);
    setIsResolving(false);
    refreshState();

    if (result.success) {
      setStatusMessage(`Conflict resolved using "${mode}". Synchronized to version ${result.version}.`);
      setTimeout(() => setStatusMessage(null), 4000);
      if (onSyncComplete) onSyncComplete();
    }
  };

  const conflictInfo = globalSyncService.getConflictInfo();

  return (
    <Card className="border-obsidian-750 bg-obsidian-900/90 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-gold-400" />
            <span>Optional Encrypted Synchronization</span>
          </CardTitle>
          <Badge variant={syncState === 'conflict' ? 'outline' : 'gold'} size="sm">
            {syncState === 'conflict' ? 'Conflict Detected' : syncState === 'syncing' ? 'Syncing...' : 'Zero-Knowledge'}
          </Badge>
        </div>
        <CardDescription className="text-slate-400 text-xs">
          Synchronize habits and history across devices with client-side AES-256-GCM encryption. Servers never see plaintext.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider Selector */}
        <div className="flex items-center gap-2 p-1 bg-obsidian-850 rounded-lg border border-obsidian-750">
          <button
            type="button"
            onClick={() => handleProviderSwitch('mock')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              providerType === 'mock'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mock Cloud Sandbox (Local Test)
          </button>
          <button
            type="button"
            onClick={() => handleProviderSwitch('supabase')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              providerType === 'supabase'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Supabase / S3 Endpoint
          </button>
        </div>

        {/* Supabase Config Fields if active */}
        {providerType === 'supabase' && (
          <div className="p-3 rounded-lg bg-obsidian-850 border border-obsidian-750 space-y-2 text-xs">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Anon / Public API Key</label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJh..."
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Sync Metadata & Passphrase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-obsidian-850/60 border border-obsidian-750 space-y-1 text-xs">
            <span className="text-[11px] font-mono text-slate-400 block">SYNC STATE</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">Local Version: v{localVersion}</span>
              <Badge variant="outline" size="sm">Active</Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Last Synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-obsidian-850/60 border border-obsidian-750 space-y-1 text-xs">
            <span className="text-[11px] font-mono text-slate-400 block">ENCRYPTION PASSPHRASE</span>
            <div className="relative mt-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required for encryption..."
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Conflict Resolution Banner */}
        {syncState === 'conflict' && conflictInfo && (
          <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-700/60 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Version Conflict Detected: Remote server has newer state (v{conflictInfo.remoteVersion} vs Local v{conflictInfo.localVersion})</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              Changes occurred on another device. Select how you wish to resolve this conflict:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveConflict('useRemote')}
                disabled={isResolving}
                className="text-xs justify-center"
              >
                Use Remote (v{conflictInfo.remoteVersion})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveConflict('useLocal')}
                disabled={isResolving}
                className="text-xs justify-center"
              >
                Force Local State
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleResolveConflict('merge')}
                disabled={isResolving}
                className="text-xs justify-center"
              >
                Merge Both Datasets
              </Button>
            </div>
          </div>
        )}

        {/* Status & Error Messages */}
        {statusMessage && (
          <div className="p-3 rounded-md bg-gold-950/30 border border-gold-800/40 text-xs text-gold-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-md bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        {syncState !== 'conflict' && (
          <Button
            variant="primary"
            onClick={handleSyncNow}
            disabled={syncState === 'syncing'}
            className="w-full justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 text-obsidian-950 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncState === 'syncing' ? 'Synchronizing...' : 'Sync Encrypted Data Now'}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
