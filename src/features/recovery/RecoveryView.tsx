import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, HeartHandshake } from 'lucide-react';

export function RecoveryView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Recovery Center & Protocol
            </h2>
            <Badge variant="gold" size="sm">Module 9 Specification</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Constructive analysis without shame or guilt. The setback is data, not your identity.
          </p>
        </div>
      </div>

      {/* Philosophy Banner */}
      <Card className="border-gold-600/30 bg-gradient-to-r from-obsidian-900 to-obsidian-850">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-gold-400" />
            <CardTitle className="text-base text-gold-300">
              The Sovereign Recovery Doctrine
            </CardTitle>
          </div>
          <CardDescription>
            "A stumble is not a collapse unless you choose to lie down on the pavement."
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-300">
          <p>
            In SEMNÓTĒS, resetting a streak is an objective record of reality, never a punishment. Your previous 30, 60, or 90 clean days are not erased from existence; the neurological rewiring and self-respect you accrued remain intact.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
              <span className="font-semibold text-slate-200 block mb-1">Step 1: Record Without Guilt</span>
              <p className="text-slate-400">Identify the environmental trigger and tiredness level without self-flagellation.</p>
            </div>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
              <span className="font-semibold text-slate-200 block mb-1">Step 2: Immediate Environment Reset</span>
              <p className="text-slate-400">Cold water splash, 15-minute walk, device out of bedroom, drink 500ml water.</p>
            </div>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-750">
              <span className="font-semibold text-slate-200 block mb-1">Step 3: Resume Schedule Now</span>
              <p className="text-slate-400">Do not wait for tomorrow or next Monday. The next hour is clean.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return to Routine Checklist */}
      <Card className="border-obsidian-700/80 bg-obsidian-850">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Return-to-Routine Rapid Protocol</span>
          </CardTitle>
          <CardDescription>
            Recommended somatic and cognitive anchors following a setback:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            'Step away from all screens immediately and change physical location.',
            'Drink a glass of cold water and practice 4-7-8 breathing for 3 cycles.',
            'Log the specific antecedent trigger in the diagnostic journal.',
            'Affirm: "My character is forged through continuous return to standard."',
            'Ensure tonight’s bedtime is strictly guarded.'
          ].map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs">
              <span className="w-5 h-5 rounded-full bg-gold-950 border border-gold-600/50 text-gold-300 font-mono text-[11px] flex items-center justify-center flex-shrink-0 font-bold">
                {idx + 1}
              </span>
              <span className="text-slate-300 leading-relaxed">{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
