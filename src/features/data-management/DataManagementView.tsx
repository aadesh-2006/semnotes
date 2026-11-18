import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { BackupExportPanel } from './BackupExportPanel';
import { BackupRestorePanel } from './BackupRestorePanel';
import { CSVExportPanel } from './CSVExportPanel';
import { SyncSettingsPanel } from './SyncSettingsPanel';
import { Database, FileSpreadsheet, Cloud, Shield } from 'lucide-react';

export function DataManagementView() {
  const [activeTab, setActiveTab] = useState<'backups' | 'csv' | 'sync'>('backups');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-obsidian-750">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100 flex items-center gap-2">
              <Database className="w-6 h-6 text-gold-400" />
              <span>Sovereign Data Management</span>
            </h2>
            <Badge variant="gold" size="sm">Local-First</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete data sovereignty. Export full JSON snapshots, restore safely, download CSV spreadsheets, or synchronize with zero-knowledge encryption.
          </p>
        </div>

        {/* Tab selection pills */}
        <div className="flex items-center gap-1.5 p-1 bg-obsidian-850 rounded-lg border border-obsidian-750">
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'backups'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-gold-400" />
            <span>Backups</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'csv'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-gold-400" />
            <span>CSV Exports</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sync'
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-gold-400" />
            <span>Encrypted Sync</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div key={refreshKey} className="space-y-6">
        {activeTab === 'backups' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BackupExportPanel />
            <BackupRestorePanel onRestoreComplete={handleDataChanged} />
          </div>
        )}

        {activeTab === 'csv' && (
          <div>
            <CSVExportPanel />
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="max-w-2xl mx-auto">
            <SyncSettingsPanel onSyncComplete={handleDataChanged} />
          </div>
        )}
      </div>
    </div>
  );
}
