import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { FileSpreadsheet, Download, CheckCircle2, Target, CalendarCheck, Clock, Award, BookOpen } from 'lucide-react';
import { CsvExportService } from '../../core/backup/csvExportService';

export function CSVExportPanel() {
  const [downloadingCategory, setDownloadingCategory] = useState<string | null>(null);
  const [successCategory, setSuccessCategory] = useState<string | null>(null);

  const handleDownload = async (
    categoryName: string,
    filenamePrefix: string,
    generator: () => Promise<string>
  ) => {
    setDownloadingCategory(categoryName);
    setSuccessCategory(null);

    try {
      const csvContent = await generator();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `semnotes-${filenamePrefix}-${dateStr}.csv`;
      CsvExportService.triggerDownload(filename, csvContent);

      setSuccessCategory(categoryName);
      setTimeout(() => setSuccessCategory(null), 3000);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setDownloadingCategory(null);
    }
  };

  const exportCategories = [
    {
      id: 'habits',
      name: 'Habits & Routine Specifications',
      description: 'Habit configurations, categories, target values, schedules, and active statuses.',
      icon: Target,
      prefix: 'habits',
      generator: CsvExportService.exportHabitsCsv.bind(CsvExportService),
    },
    {
      id: 'checkins',
      name: 'Habit Check-In & Progress History',
      description: 'Historical check-ins, completion statuses, numeric tracking, notes, and timestamps.',
      icon: CalendarCheck,
      prefix: 'checkins',
      generator: CsvExportService.exportCheckInsCsv.bind(CsvExportService),
    },
    {
      id: 'focus',
      name: 'Focus & Pomodoro Sessions',
      description: 'Deep work sessions, actual durations, breaks, cycle counts, and energy ratings.',
      icon: Clock,
      prefix: 'focus-sessions',
      generator: CsvExportService.exportFocusSessionsCsv.bind(CsvExportService),
    },
    {
      id: 'milestones',
      name: 'Milestones & Unlocked Rewards',
      description: 'Milestone thresholds, personal reward descriptions, achievement dates, and claims.',
      icon: Award,
      prefix: 'milestones',
      generator: CsvExportService.exportMilestonesCsv.bind(CsvExportService),
    },
    {
      id: 'reflections',
      name: 'Intentions & Evening Debriefs',
      description: 'Morning focus intentions, obstacles, evening debriefs, lessons, and gratitude logs.',
      icon: BookOpen,
      prefix: 'reflections',
      generator: CsvExportService.exportReflectionsCsv.bind(CsvExportService),
    },
  ];

  return (
    <Card className="border-obsidian-750 bg-obsidian-900/90 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-gold-400" />
            <span>Category-Specific CSV Exports</span>
          </CardTitle>
          <Badge variant="outline" size="sm">RFC 4180 &bull; UTF-8 BOM</Badge>
        </div>
        <CardDescription className="text-slate-400 text-xs">
          Export dedicated spreadsheets formatted for instant compatibility with Excel, Numbers, and Google Sheets.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exportCategories.map((cat) => {
            const Icon = cat.icon;
            const isDownloading = downloadingCategory === cat.name;
            const isSuccess = successCategory === cat.name;

            return (
              <div
                key={cat.id}
                className="p-3.5 rounded-lg bg-obsidian-850/60 border border-obsidian-750 hover:border-obsidian-650 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-gold-400">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
                    </div>
                    {isSuccess && (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Exported
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(cat.name, cat.prefix, cat.generator)}
                  disabled={isDownloading}
                  className="w-full justify-center gap-1.5 text-xs h-7 hover:border-gold-500/50"
                >
                  <Download className="w-3.5 h-3.5 text-gold-400" />
                  <span>{isDownloading ? 'Generating CSV...' : `Download ${cat.prefix}.csv`}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
