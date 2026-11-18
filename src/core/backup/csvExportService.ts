/**
 * SEMNÓTĒS — CSV Export Service
 * Sovereign personal discipline operating system.
 *
 * Implements strict RFC 4180 compliant CSV formatting with UTF-8 BOM encoding:
 * - Quotes wrapping fields containing commas, double quotes, or newlines.
 * - Double-quote escaping ("" -> ").
 * - Normalized timestamps and sanitized null/undefined values.
 * - Specialized exports for Habits, Check-ins, Focus Sessions, Milestones/Rewards, and Reflections.
 */

import { db } from '../../storage/db';

export class CsvExportService {
  /**
   * Prepends UTF-8 Byte Order Mark (\uFEFF) to guarantee Excel, Google Sheets,
   * and Numbers display characters and linebreaks without mangling encoding.
   */
  static readonly UTF8_BOM = '\uFEFF';

  /**
   * Sanitizes and escapes an individual cell according to RFC 4180.
   */
  static escapeCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // If the string contains comma, double-quote, carriage return, or newline,
    // it MUST be enclosed in double quotes with internal quotes escaped as ""
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Formats an array of cells into a single RFC 4180 CSV line.
   */
  static formatRow(cells: unknown[]): string {
    return cells.map((cell) => this.escapeCell(cell)).join(',');
  }

  /**
   * Builds a full CSV document including the UTF-8 BOM, header row, and data rows.
   */
  static buildDocument(headers: string[], rows: unknown[][]): string {
    const headerRow = this.formatRow(headers);
    const bodyRows = rows.map((row) => this.formatRow(row)).join('\r\n');
    return `${this.UTF8_BOM}${headerRow}\r\n${bodyRows}`;
  }

  /**
   * Exports all Habits to CSV format.
   */
  static async exportHabitsCsv(): Promise<string> {
    const habits = await db.habits.toArray();
    const headers = [
      'Habit ID',
      'Title',
      'Description',
      'Category',
      'Type',
      'Frequency',
      'Target Value',
      'Unit',
      'Status',
      'Start Date',
      'Created At',
      'Updated At',
    ];

    const rows = habits.map((h) => [
      h.id,
      h.title,
      h.description || '',
      h.category,
      h.type,
      h.schedule?.frequency || '',
      h.targetValue ?? '',
      h.unit || '',
      h.status,
      h.startDate,
      h.createdAt,
      h.updatedAt,
    ]);

    return this.buildDocument(headers, rows);
  }

  /**
   * Exports all Habit Check-In logs to CSV, joining habit titles for clarity.
   */
  static async exportCheckInsCsv(): Promise<string> {
    const [logs, habits] = await Promise.all([
      db.habitLogs.toArray(),
      db.habits.toArray(),
    ]);

    const habitMap = new Map(habits.map((h) => [h.id, h.title]));

    const headers = [
      'Log ID',
      'Habit ID',
      'Habit Title',
      'Date',
      'Status',
      'Numeric Value',
      'Notes',
      'Correction Reason',
      'Created At',
      'Updated At',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.habitId,
      habitMap.get(log.habitId) || 'Unknown Habit',
      log.date,
      log.status,
      log.numericValue ?? '',
      log.notes || '',
      log.correctionReason || '',
      log.createdAt,
      log.updatedAt,
    ]);

    return this.buildDocument(headers, rows);
  }

  /**
   * Exports all Focus Session records to CSV.
   */
  static async exportFocusSessionsCsv(): Promise<string> {
    const [sessions, habits] = await Promise.all([
      db.focusSessions.toArray(),
      db.habits.toArray(),
    ]);

    const habitMap = new Map(habits.map((h) => [h.id, h.title]));

    const headers = [
      'Session ID',
      'Title',
      'Mode',
      'Linked Habit ID',
      'Linked Habit Title',
      'Date',
      'Planned Duration (Minutes)',
      'Actual Focus Duration (Minutes)',
      'Actual Focus Duration (Seconds)',
      'Break Duration (Seconds)',
      'Completed Cycles',
      'Status',
      'Notes',
      'Started At',
      'Ended At',
    ];

    const rows = sessions.map((s) => [
      s.id,
      s.title,
      s.sessionMode,
      s.linkedHabitId || '',
      s.linkedHabitId ? habitMap.get(s.linkedHabitId) || 'Unknown Habit' : '',
      s.date,
      s.plannedDurationMinutes,
      Math.round(s.actualDurationSeconds / 60),
      s.actualDurationSeconds,
      s.breakDurationSeconds,
      s.completedCycles ?? '',
      s.status,
      s.notes || '',
      s.startedAt,
      s.endedAt || '',
    ]);

    return this.buildDocument(headers, rows);
  }

  /**
   * Exports all Milestones and their associated Achievement history to CSV.
   */
  static async exportMilestonesCsv(): Promise<string> {
    const [milestones, achievements, habits] = await Promise.all([
      db.milestones.toArray(),
      db.achievements.toArray(),
      db.habits.toArray(),
    ]);

    const habitMap = new Map(habits.map((h) => [h.id, h.title]));
    const achievementMap = new Map(achievements.map((a) => [a.milestoneId, a]));

    const headers = [
      'Milestone ID',
      'Habit ID',
      'Habit Title',
      'Target Streak (Days)',
      'Reward Title',
      'Reward Description',
      'Enabled',
      'Achieved',
      'Achieved Date',
      'Reward Claimed',
      'Claimed At',
      'Created At',
    ];

    const rows = milestones.map((m) => {
      const ach = achievementMap.get(m.id);
      return [
        m.id,
        m.habitId,
        habitMap.get(m.habitId) || 'Unknown Habit',
        m.thresholdDays,
        m.rewardTitle,
        m.rewardDescription || '',
        m.isEnabled ? 'true' : 'false',
        ach ? 'true' : 'false',
        ach?.achievedDate || '',
        ach?.isClaimed ? 'true' : 'false',
        ach?.claimedAt || '',
        m.createdAt,
      ];
    });

    return this.buildDocument(headers, rows);
  }

  /**
   * Exports both Morning Intentions and Evening Debriefs into a unified Reflections CSV.
   */
  static async exportReflectionsCsv(): Promise<string> {
    const [morningIntentions, eveningDebriefs] = await Promise.all([
      db.morningIntentions.toArray(),
      db.eveningDebriefs.toArray(),
    ]);

    const headers = [
      'Reflection Type',
      'Record ID',
      'Date',
      'Primary Intention / Accomplishments',
      'Key Commitment / Fulfillment',
      'Potential Obstacle / Difficulties',
      'Planned Response / Lessons',
      'Gratitude / Closing Note',
      'Recorded At',
    ];

    const morningRows = morningIntentions.map((m) => [
      'Morning Intention',
      m.id,
      m.date,
      m.primaryIntention,
      m.keyCommitment || '',
      m.potentialObstacle || '',
      m.plannedResponse || '',
      m.personalNote || '',
      m.createdAt,
    ]);

    const eveningRows = eveningDebriefs.map((e) => [
      'Evening Debrief',
      e.id,
      e.date,
      e.wentWell || '',
      e.commitmentsFulfilled.join('; '),
      e.difficultiesFaced || '',
      e.lessonsLearned || '',
      `${e.gratitude || ''} | ${e.closingNote || ''}`.trim(),
      e.createdAt,
    ]);

    const combinedRows = [...morningRows, ...eveningRows].sort((a, b) => {
      const dateA = String(a[2]);
      const dateB = String(b[2]);
      return dateB.localeCompare(dateA);
    });

    return this.buildDocument(headers, combinedRows);
  }

  /**
   * Triggers a browser download of a CSV file.
   */
  static triggerDownload(filename: string, csvContent: string): void {
    if (typeof window === 'undefined' || !window.document) {
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
