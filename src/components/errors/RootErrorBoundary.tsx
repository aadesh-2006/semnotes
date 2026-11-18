/**
 * SEMNÓTĒS — Root Application Error Boundary
 * Dignity. Self-respect. Discipline.
 *
 * Implements a sovereign, resilient root-level React Error Boundary.
 * Prevents unrecoverable blank screens after runtime rendering exceptions,
 * preserves Obsidian & Gold aesthetic, allows safe application reloading,
 * provides collapsible sanitized technical disturbance details, and allows
 * users to export an emergency, non-destructive database backup directly.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { BackupExportService } from '../../core/backup/backupExportService';

export interface RootErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExporting: boolean;
  exportSuccess: boolean;
  exportError: string | null;
  detailsOpen: boolean;
  timestamp: string | null;
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExporting: false,
      exportSuccess: false,
      exportError: null,
      detailsOpen: false,
      timestamp: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return {
      hasError: true,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Safe technical diagnostics in console without persisting private reflections
    console.error('[RootErrorBoundary] Uncaught application rendering disturbance:', error, errorInfo);
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isExporting: false,
      exportSuccess: false,
      exportError: null,
      detailsOpen: false,
      timestamp: null,
    });
  };

  handleEmergencyExport = async (): Promise<void> => {
    this.setState({ isExporting: true, exportSuccess: false, exportError: null });
    try {
      const payload = await BackupExportService.generateBackup();
      BackupExportService.downloadBackupFile(payload, 'semnotes-emergency-backup.json');
      this.setState({ isExporting: false, exportSuccess: true });
    } catch (err) {
      console.error('[RootErrorBoundary] Emergency database export failed:', err);
      this.setState({
        isExporting: false,
        exportError:
          'Emergency export could not access the local database directly. Your database may be locked or restricted in this environment.',
      });
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full bg-[#090A0F] text-[#F3F4F6] flex flex-col items-center justify-center p-4 md:p-6 select-none"
        >
          <div className="max-w-xl w-full bg-[#11131A] border border-[#232733] rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient Gold Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            {/* Header with Icon */}
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-white tracking-tight">
                  An unexpected disturbance occurred.
                </h1>
                <p className="text-xs text-[#9CA3AF] mt-1 uppercase tracking-widest font-mono">
                  SEMNÓTĒS • Resilient Architecture
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-[#D1D5DB] leading-relaxed mb-6">
              SEMNÓTĒS encountered an unexpected application error. Your locally stored data is not
              intentionally deleted by this error.
            </p>

            {/* Status Notifications */}
            {this.state.exportSuccess && (
              <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>Emergency backup exported successfully. You can safely reload the application.</span>
              </div>
            )}

            {this.state.exportError && (
              <div className="mb-6 p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{this.state.exportError}</span>
              </div>
            )}

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-[#D4AF37]/10"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyExport}
                disabled={this.state.isExporting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#181B24] hover:bg-[#202533] border border-[#2D3344] hover:border-[#D4AF37]/50 text-[#E5E7EB] text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={`w-4 h-4 ${this.state.isExporting ? 'animate-bounce' : ''}`} />
                {this.state.isExporting ? 'Exporting Backup...' : 'Export Emergency Database Backup'}
              </button>
            </div>

            {/* Collapsible Technical Details */}
            <div className="border-t border-[#232733] pt-4">
              <button
                type="button"
                onClick={this.toggleDetails}
                aria-expanded={this.state.detailsOpen}
                className="w-full flex items-center justify-between text-xs text-[#9CA3AF] hover:text-[#D1D5DB] transition-colors py-1 cursor-pointer"
              >
                <span className="font-mono uppercase tracking-wider">Technical Disturbance Details</span>
                {this.state.detailsOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </button>

              {this.state.detailsOpen && (
                <div className="mt-3 p-3.5 rounded-lg bg-[#0A0C10] border border-[#1E2330] font-mono text-xs text-[#9CA3AF] space-y-2 max-h-56 overflow-y-auto select-text">
                  {this.state.timestamp && (
                    <div>
                      <span className="text-[#6B7280]">Timestamp:</span>{' '}
                      <span className="text-[#E5E7EB]">{this.state.timestamp}</span>
                    </div>
                  )}
                  {this.state.error?.name && (
                    <div>
                      <span className="text-[#6B7280]">Error Name:</span>{' '}
                      <span className="text-amber-400">{this.state.error.name}</span>
                    </div>
                  )}
                  {this.state.error?.message && (
                    <div>
                      <span className="text-[#6B7280]">Error Message:</span>{' '}
                      <span className="text-[#E5E7EB] break-all">{this.state.error.message}</span>
                    </div>
                  )}
                  {this.state.error?.stack && (
                    <div className="mt-2 pt-2 border-t border-[#1E2330]">
                      <span className="text-[#6B7280] block mb-1">Stack Trace:</span>
                      <pre className="text-[11px] leading-relaxed text-[#9CA3AF] whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 pt-2 border-t border-[#1E2330]">
                      <span className="text-[#6B7280] block mb-1">Component Stack:</span>
                      <pre className="text-[11px] leading-relaxed text-[#9CA3AF] whitespace-pre-wrap break-all">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
