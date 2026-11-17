import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Flame, ShieldAlert, Timer, BookOpen, Plus } from 'lucide-react';
import type { RouteId } from '../../app/routes';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
  onOpenCreateHabit?: () => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  onNavigate,
  onOpenCreateHabit
}: QuickActionModalProps) {
  const actions = [
    {
      title: 'Architect New Habit Commitment',
      desc: 'Define an abstinence, completion, or quantitative habit.',
      icon: Plus,
      color: 'text-gold-400 bg-gold-950/60 border-gold-800/40',
      action: () => {
        onClose();
        if (onOpenCreateHabit) {
          onOpenCreateHabit();
        } else {
          onNavigate('streaks');
        }
      }
    },
    {
      title: 'Fulfill Daily Habit Check-in',
      desc: 'Verify today’s scheduled discipline commitments.',
      icon: Flame,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40',
      action: () => {
        onNavigate('streaks');
        onClose();
      }
    },
    {
      title: 'Log Urge / Emergency Pause',
      desc: 'Assess urge intensity and start a 10-minute reflection.',
      icon: ShieldAlert,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800/40',
      action: () => {
        onNavigate('journal');
        onClose();
      }
    },
    {
      title: 'Start 25-Min Focus Session',
      desc: 'Deep work pomodoro sprint with audited timer.',
      icon: Timer,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40',
      action: () => {
        onNavigate('focus');
        onClose();
      }
    },
    {
      title: 'Evening Sovereign Reflection',
      desc: 'Anchor subconscious character before sleep.',
      icon: BookOpen,
      color: 'text-purple-400 bg-purple-950/60 border-purple-800/40',
      action: () => {
        onNavigate('journal');
        onClose();
      }
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Discipline Action"
      description="Choose an immediate command protocol"
      maxWidth="md"
    >
      <div className="space-y-3">
        {actions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.action}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-obsidian-800/80 hover:bg-obsidian-750 border border-obsidian-700/80 hover:border-gold-500/40 text-left transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${item.color}`}>
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold text-sm text-slate-100 group-hover:text-gold-300 transition-colors">
                  {item.title}
                </span>
                <span className="text-xs text-slate-400 mt-0.5 truncate">
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-obsidian-750 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
