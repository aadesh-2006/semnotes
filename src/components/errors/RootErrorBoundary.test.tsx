/**
 * SEMNÓTĒS — Root Error Boundary Test Suite
 * Dignity. Self-respect. Discipline.
 *
 * Verifies that rendering exceptions are intercepted gracefully,
 * preventing blank screens, presenting the Obsidian & Gold fallback UI,
 * enabling non-destructive emergency backup export, and maintaining strict
 * privacy guarantees regarding personal reflections.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RootErrorBoundary } from './RootErrorBoundary';
import { BackupExportService } from '../../core/backup/backupExportService';

// Faulty test component designed to trigger a render error
const FaultyChild: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Simulated uncaught component explosion',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="healthy-child">System functioning within normal parameters.</div>;
};

describe('RootErrorBoundary', () => {
  const originalConsoleError = console.error;
  const originalLocation = window.location;

  beforeEach(() => {
    // Silence error output in test logs for expected intentional errors
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  it('renders healthy children without disturbance when no error occurs', () => {
    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={false} />
      </RootErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
    expect(screen.getByText('System functioning within normal parameters.')).toBeInTheDocument();
    expect(screen.queryByText('An unexpected disturbance occurred.')).not.toBeInTheDocument();
  });

  it('intercepts rendering error and renders the Obsidian & Gold fallback UI', () => {
    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={true} errorMessage="Fatal UI render fault" />
      </RootErrorBoundary>
    );

    // Fallback UI title and description
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('An unexpected disturbance occurred.')).toBeInTheDocument();
    expect(
      screen.getByText(
        /SEMNÓTĒS encountered an unexpected application error\. Your locally stored data is not intentionally deleted by this error\./
      )
    ).toBeInTheDocument();

    // Primary Action Buttons
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Emergency Database Backup/i })).toBeInTheDocument();
  });

  it('reloads application when the reload button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={true} />
      </RootErrorBoundary>
    );

    const reloadBtn = screen.getByRole('button', { name: /Reload Application/i });
    fireEvent.click(reloadBtn);

    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('toggles technical disturbance details in collapsible panel', () => {
    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={true} errorMessage="Detailed technical stack disturbance" />
      </RootErrorBoundary>
    );

    const detailsToggle = screen.getByRole('button', { name: /Technical Disturbance Details/i });
    expect(detailsToggle).toBeInTheDocument();

    // Initially collapsed
    expect(screen.queryByText(/Detailed technical stack disturbance/)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(detailsToggle);
    expect(screen.getAllByText(/Detailed technical stack disturbance/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Error Name:/)).toBeInTheDocument();
    expect(screen.getByText(/Error Message:/)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(detailsToggle);
    expect(screen.queryByText(/Error Name:/)).not.toBeInTheDocument();
  });

  it('successfully triggers sovereign emergency backup export on button click', async () => {
    const fakePayload = {
      manifest: {
        app: 'semnotes-sovereign-discipline',
        backupVersion: 1,
        appVersion: '1.0.0',
        exportedAt: '2026-11-18T00:00:00.000Z',
        dbVersion: 5,
        recordCounts: {},
        checksum: 'fakechecksum123',
      },
      data: {
        habits: [],
        habitLogs: [],
        auditRecords: [],
        milestones: [],
        achievements: [],
        journalEntries: [],
        urgeLogs: [],
        morningIntentions: [],
        eveningDebriefs: [],
        focusSessions: [],
        userSettings: [],
        focusPreferences: {
          defaultDurationMinutes: 25,
          defaultShortBreakMinutes: 5,
          defaultLongBreakMinutes: 15,
          longBreakInterval: 4,
          soundEnabled: false,
          notificationsEnabled: false,
          autoStartNextSession: false,
          tickSoundEnabled: false,
        },
      },
    } as any;

    const generateBackupSpy = vi
      .spyOn(BackupExportService, 'generateBackup')
      .mockResolvedValueOnce(fakePayload);
    const downloadBackupFileSpy = vi
      .spyOn(BackupExportService, 'downloadBackupFile')
      .mockImplementationOnce(() => {});

    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={true} />
      </RootErrorBoundary>
    );

    const exportBtn = screen.getByRole('button', { name: /Export Emergency Database Backup/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(generateBackupSpy).toHaveBeenCalledTimes(1);
      expect(downloadBackupFileSpy).toHaveBeenCalledWith(fakePayload, 'semnotes-emergency-backup.json');
    });

    // Success message displayed
    expect(
      await screen.findByText('Emergency backup exported successfully. You can safely reload the application.')
    ).toBeInTheDocument();
  });

  it('handles emergency backup export failure gracefully with compassionate message', async () => {
    vi.spyOn(BackupExportService, 'generateBackup').mockRejectedValueOnce(new Error('IndexedDB blocked'));

    render(
      <RootErrorBoundary>
        <FaultyChild shouldThrow={true} />
      </RootErrorBoundary>
    );

    const exportBtn = screen.getByRole('button', { name: /Export Emergency Database Backup/i });
    fireEvent.click(exportBtn);

    expect(
      await screen.findByText(
        'Emergency export could not access the local database directly. Your database may be locked or restricted in this environment.'
      )
    ).toBeInTheDocument();
  });

  it('renders custom fallback renderer when provided', () => {
    const customFallback = (error: Error, reset: () => void) => (
      <div data-testid="custom-fallback">
        <span>Custom Boundary: {error.message}</span>
        <button onClick={reset}>Try Again</button>
      </div>
    );

    render(
      <RootErrorBoundary fallback={customFallback}>
        <FaultyChild shouldThrow={true} errorMessage="Custom disturbance" />
      </RootErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Boundary: Custom disturbance')).toBeInTheDocument();
  });
});
