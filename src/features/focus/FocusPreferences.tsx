/**
 * SEMNÓTĒS — Focus Preferences View
 * Obsidian & Gold Design System.
 *
 * Configures default duration, notification audio, system desktop alerts,
 * and test chime functions.
 */

import { useState } from 'react';
import type { FocusPreferences as FocusPreferencesType } from '../../core/focus/focusTypes';
import { FocusNotificationService } from '../../core/focus/focusNotificationService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Volume2,
  Bell,
  Clock,
  Sparkles,
  Check
} from 'lucide-react';

interface FocusPreferencesProps {
  preferences: FocusPreferencesType;
  onSavePreferences: (prefs: FocusPreferencesType) => void;
}

export function FocusPreferences({
  preferences,
  onSavePreferences,
}: FocusPreferencesProps) {
  const [soundEnabled, setSoundEnabled] = useState(preferences.soundEnabled);
  const [soundVolume, setSoundVolume] = useState(preferences.soundVolume);
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences.notificationsEnabled);
  const [defaultDuration, setDefaultDuration] = useState(preferences.defaultDurationMinutes);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestChime = () => {
    FocusNotificationService.playCompletionChime(soundVolume);
  };

  const handleRequestNotifications = async () => {
    const perm = await FocusNotificationService.requestNotificationPermission();
    if (perm === 'granted') {
      setNotificationsEnabled(true);
      FocusNotificationService.sendNotification(
        'SEMNÓTĒS Focus Mode',
        'Desktop notifications active. You will be notified when focus phases finish.'
      );
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSave = () => {
    const updated: FocusPreferencesType = {
      ...preferences,
      soundEnabled,
      soundVolume,
      notificationsEnabled,
      defaultDurationMinutes: defaultDuration,
    };
    onSavePreferences(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3 border-b border-obsidian-750">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gold-400" />
            <span>Audio & Bell Notifications</span>
          </CardTitle>
          <CardDescription>
            Soothing 3-tone harmonic chime synthesized locally via Web Audio API (100% offline).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Sound Toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-obsidian-750 cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Completion Chime</span>
              <span className="text-[11px] text-slate-400">
                Play pleasant harmonic bell when focus session or break ends.
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-obsidian-700 bg-obsidian-800 text-gold-500 focus:ring-gold-500/40"
            />
          </label>

          {/* Volume Slider & Test Button */}
          {soundEnabled && (
            <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-750 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Bell Volume</span>
                <span className="text-gold-300 font-bold">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                className="w-full accent-gold-500 cursor-pointer"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestChime}
                  className="text-xs gap-1.5 border-gold-500/30 text-gold-300 hover:bg-gold-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preview Audio Chime</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop Notifications */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3 border-b border-obsidian-750">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold-400" />
            <span>Desktop System Notifications</span>
          </CardTitle>
          <CardDescription>
            Alerts when you are in another window or desktop space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-obsidian-900 border border-obsidian-750">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Browser Notifications</span>
              <span className="text-[11px] text-slate-400">
                {notificationsEnabled
                  ? 'System notifications enabled and active.'
                  : 'Requires browser permission to display alerts.'}
              </span>
            </div>

            <Button
              variant={notificationsEnabled ? 'outline' : 'primary'}
              size="sm"
              onClick={handleRequestNotifications}
              className="text-xs shrink-0"
            >
              {notificationsEnabled ? 'Notification Active' : 'Enable Notifications'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Duration */}
      <Card className="border-obsidian-750 bg-obsidian-850">
        <CardHeader className="pb-3 border-b border-obsidian-750">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-400" />
            <span>Default Starting Duration</span>
          </CardTitle>
          <CardDescription>
            Initial duration preselected whenever you open Focus Mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            {[15, 25, 45, 50, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDefaultDuration(mins)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                  defaultDuration === mins
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50 shadow-gold-sm'
                    : 'bg-obsidian-900 text-slate-400 hover:text-slate-200 border border-obsidian-750'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {savedSuccess && (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5" /> Preferences Saved
          </span>
        )}
        <Button variant="primary" size="md" onClick={handleSave} className="px-6 shadow-gold-sm">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
