/**
 * SEMNÓTĒS — Focus Notification & Audio Chime Service
 * Sovereign personal discipline operating system.
 *
 * Implements:
 * 1. Web Audio API synthesized harmonic chime (100% offline, 0 external assets).
 * 2. Browser Notifications with permission management and graceful fallbacks.
 */

export class FocusNotificationService {
  private static audioCtx: AudioContext | null = null;

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Synthesizes a soothing, premium 3-tone harmonic chime (Gold & Obsidian signature tone).
   * Frequencies: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) with gentle decay.
   */
  static playCompletionChime(volume: number = 0.7): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const safeVolume = Math.min(1, Math.max(0, volume));

      // 3 ascending harmonic tones with smooth envelope
      const notes = [
        { freq: 523.25, time: now + 0.0, dur: 0.8 },
        { freq: 659.25, time: now + 0.15, dur: 0.8 },
        { freq: 783.99, time: now + 0.30, dur: 1.2 },
      ];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, note.time);

        // Exponential volume decay for bell-like timbre
        gain.gain.setValueAtTime(0.001, note.time);
        gain.gain.exponentialRampToValueAtTime(0.3 * safeVolume, note.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(note.time);
        osc.stop(note.time + note.dur);
      }
    } catch {
      // Audio playback silently guarded against environment restrictions
    }
  }

  /**
   * Short gentle tone for phase transitions (e.g. starting a break).
   */
  static playTransitionChime(volume: number = 0.5): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const safeVolume = Math.min(1, Math.max(0, volume));

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.2); // C#5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25 * safeVolume, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Silently guard
    }
  }

  /**
   * Requests permission for system desktop notifications.
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  /**
   * Dispatches a desktop notification if permission was granted.
   */
  static sendNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          silent: true, // We handle our own pleasant audio chime
        });
      } catch {
        // Guard against mobile browser Notification restrictions
      }
    }
  }
}
