import { useMemo, useState } from 'react';
import {
  TrendingUp, Target, DollarSign, Award, Flame, CheckCircle2, AlertTriangle,
  Clock, ArrowRight, ChevronRight, Zap, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useApp } from '@/store/AppContext';
import { summarizeRevenue, formatCurrency, formatDateTime, daysUntil, hoursUntil, grossMarginPct, round2 } from '@/domain/calculations';
import { rankTasks, streakInfo, attachContext, type ScoredTask } from '@/domain/scoring';
import { Card, Badge, EmptyState } from '@/components/Form';
import { Button } from '@/components/Button';
import type { UrgencyLevel } from '@/domain/types';
import type { PageKey } from '@/components/AppShell';

interface Props {
  onNavigate: (p: PageKey) => void;
  onOpenTask: (taskId: string) => void;
}

export function DashboardPage({ onNavigate, onOpenTask }: Props) {
  const { agent, settings, leads, bookings, packages, tasks, i18n, saveTask } = useApp();
  const t = i18n.t;
  const [filter, setFilter] = useState<UrgencyLevel | 'all'>('all');

  const summary = useMemo(() => {
    if (!agent || !settings) return null;
    return summarizeRevenue(agent, leads, bookings, settings);
  }, [agent, settings, leads, bookings]);

  const scored = useMemo(() => {
    if (!settings) return [];
    return rankTasks(tasks, { p0Threshold: settings.p0Threshold, p1Threshold: settings.p1Threshold });
  }, [tasks, settings]);

  const { currentStreak, completedToday } = useMemo(() => streakInfo(tasks), [tasks]);

  const completionRate = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((x) => x.status === 'Completed').length;
    return total > 0 ? (done / total) * 100 : 0;
  }, [tasks]);

  const overdueCount = useMemo(
    () => scored.filter((s) => s.isOverdue).length,
    [scored],
  );
  const highValueDone = useMemo(
    () => tasks.filter((x) => x.status === 'Completed' && x.estimatedValue >= 2000).length,
    [tasks],
  );
  const zeroInbox = scored.length === 0;

  const currency = settings?.reportingCurrency ?? 'USD';

  const filtered = filter === 'all' ? scored : scored.filter((s) => s.priority === filter);

  const pipelineData = useMemo(() => {
    const stages: { stage: string; count: number; value: number }[] = [];
    const stageLabels: Record<string, string> = {
      Inquiry: t('lead.inquiry'),
      'Quote Sent': t('lead.quoteSent'),
      'Deposit Paid': t('lead.depositPaid'),
      'Closed Won': t('lead.closedWon'),
      Lost: t('lead.lost'),
    };
    (['Inquiry', 'Quote Sent', 'Deposit Paid', 'Closed Won', 'Lost'] as const).forEach((s) => {
      const inStage = leads.filter((l) => l.stage === s);
      stages.push({ stage: stageLabels[s], count: inStage.length, value: round2(inStage.reduce((a, b) => a + b.budget, 0)) });
    });
    return stages;
  }, [leads, t]);

  const packageColors = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  if (!summary || !agent || !settings) {
    return <EmptyState title={t('common.loading')} />;
  }

  const StatCard = ({ icon: Icon, label, value, sub, accent }: { icon: typeof Target; label: string; value: string; sub?: string; accent: string }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );

  const TaskRow = ({ s }: { s: ScoredTask }) => {
    const ctx = attachContext(s, leads, bookings);
    const lead = ctx.lead;
    const hours = hoursUntil(s.task.dueAt);
    const days = daysUntil(s.task.dueAt);
    let dueLabel = '';
    if (s.isOverdue) dueLabel = t('common.overdue');
    else if (hours !== null && hours <= 24) dueLabel = `${hours}${t('common.hours')}`;
    else if (days !== null) dueLabel = `${days}${t('common.days')}`;

    const priorityColor = s.priority === 'P0' ? 'rose' : s.priority === 'P1' ? 'amber' : 'slate';

    return (
      <div
        className="group rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:border-sky-300 dark:hover:border-sky-700 transition-colors cursor-pointer animate-fade-in"
        onClick={() => onOpenTask(s.task.taskId)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge color={priorityColor as 'rose' | 'amber' | 'slate'}>{s.priority}</Badge>
              <Badge color="slate">{t(`task.${s.task.taskType.toLowerCase().replace(/\s/g, '').replace('followup', 'followUp')}` as string)}</Badge>
              {s.isOverdue && <Badge color="rose"><AlertTriangle size={10} />{dueLabel}</Badge>}
              {!s.isOverdue && dueLabel && <Badge color="slate"><Clock size={10} />{dueLabel}</Badge>}
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.task.title}</p>
            {lead && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lead.clientName} · {lead.destination}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.explanation}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {formatCurrency(s.task.estimatedValue, currency, i18n.lang)}
            </p>
            <p className="text-xs text-slate-400">{s.task.estimatedMinutes}{t('common.minutes')}</p>
            <div className="mt-1 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => onOpenTask(s.task.taskId)} aria-label={t('common.edit')}>
                <ChevronRight size={14} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await saveTask({
                    ...s.task,
                    status: 'Completed',
                    completedAt: new Date().toISOString(),
                  });
                }}
              >
                <CheckCircle2 size={14} /> {t('dash.complete')}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${s.priority === 'P0' ? 'bg-rose-500' : s.priority === 'P1' ? 'bg-amber-500' : 'bg-slate-400'}`}
              style={{ width: `${s.totalScore}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-400">{s.totalScore}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Performance header */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('dash.performance')}</h2>
          <Button size="sm" variant="ghost" onClick={() => onNavigate('bookings')}>
            {t('nav.bookings')} <ArrowRight size={14} />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon={Target} label={t('dash.revenueTarget')} value={formatCurrency(agent.monthlyRevenueTarget, currency, i18n.lang)} accent="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" />
          <StatCard icon={DollarSign} label={t('dash.confirmedRevenue')} value={formatCurrency(summary.confirmedRevenue, currency, i18n.lang)} sub={`${t('dash.cashCollected')}: ${formatCurrency(summary.cashCollected, currency, i18n.lang)}`} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
          <StatCard icon={TrendingUp} label={t('dash.attainment')} value={`${summary.attainmentPct.toFixed(1)}%`} sub={`${t('dash.revenueGap')}: ${formatCurrency(summary.revenueGap, currency, i18n.lang)}`} accent="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
          <StatCard icon={Zap} label={t('dash.requiredPace')} value={isFinite(summary.requiredPace) ? formatCurrency(summary.requiredPace, currency, i18n.lang) : '∞'} sub={`${summary.remainingDays} ${t('dash.remainingDaysLabel')}`} accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
          <StatCard icon={Award} label={t('dash.earnedCommission')} value={formatCurrency(summary.earnedCommission, currency, i18n.lang)} sub={`${t('dash.estCommissionAtTarget')}: ${formatCurrency(summary.estimatedCommissionAtTarget, currency, i18n.lang)}`} accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" />
          <StatCard icon={Users} label={t('dash.qualifiedLeads')} value={String(summary.qualifiedLeads)} sub={`${t('dash.quotesSent')}: ${summary.quotesSent}`} accent="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300" />
          <StatCard icon={CheckCircle2} label={t('dash.confirmedBookings')} value={String(summary.confirmedBookings)} sub={`${t('dash.conversionRate')}: ${(summary.conversionRate * 100).toFixed(0)}%`} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
          <StatCard icon={Clock} label={t('dash.avgInquiryToBooking')} value={summary.avgInquiryToBookingDays !== null ? `${summary.avgInquiryToBookingDays.toFixed(1)}${t('common.days')}` : '—'} sub={`${t('dash.quotedValue')}: ${formatCurrency(summary.quotedValue, currency, i18n.lang)}`} accent="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300" />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* GSD command center */}
        <section className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dash.gsdCenter')}</h2>
              <div className="flex gap-1">
                {(['all', 'P0', 'P1', 'P2'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      filter === f ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {f === 'all' ? t('common.all') : f}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <EmptyState title={t('dash.noTasks')} />
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filtered.slice(0, 12).map((s) => <TaskRow key={s.task.taskId} s={s} />)}
                {filtered.length > 12 && (
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')} className="mt-2">
                    {t('common.showAll')} ({filtered.length})
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Pipeline mini */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dash.salesPipeline')}</h2>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('pipeline')}>
                <ArrowRight size={14} />
              </Button>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} interval={0} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [formatCurrency(Number(v), currency, i18n.lang), t('common.value')] as [string, string]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipelineData.map((_, i) => <Cell key={i} fill={packageColors[i % packageColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Right column */}
        <section className="space-y-4">
          {/* Productivity */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('dash.gsdProductivity')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 size={12} />{t('dash.tasksCompletedToday')}</div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{completedToday}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><TrendingUp size={12} />{t('dash.completionRate')}</div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{completionRate.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><AlertTriangle size={12} />{t('dash.overdueTasks')}</div>
                <p className={`text-xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{overdueCount}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><Award size={12} />{t('dash.highValueDone')}</div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{highValueDone}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><Flame size={12} />{t('dash.streak')}</div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{currentStreak}🔥</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 size={12} />{t('dash.zeroInbox')}</div>
                <p className={`text-xl font-bold mt-1 ${zeroInbox ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{zeroInbox ? '✓' : '—'}</p>
              </div>
            </div>
          </Card>

          {/* Supplier alerts */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('dash.supplierAlerts')}</h2>
            <div className="space-y-2">
              {packages
                .filter((p) => p.supplierCutoffAt && daysUntil(p.supplierCutoffAt) !== null && daysUntil(p.supplierCutoffAt)! <= 7)
                .sort((a, b) => (daysUntil(a.supplierCutoffAt) ?? 99) - (daysUntil(b.supplierCutoffAt) ?? 99))
                .slice(0, 4)
                .map((p) => {
                  const d = daysUntil(p.supplierCutoffAt)!;
                  const urgent = d <= 2;
                  return (
                    <div key={p.packageId} className={`rounded-lg border p-2.5 ${urgent ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{p.title}</p>
                        <Badge color={urgent ? 'rose' : 'amber'}>{d <= 0 ? t('common.overdue') : `${d}${t('common.days')}`}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.destination} · {formatDateTime(p.supplierCutoffAt, i18n.lang)}</p>
                    </div>
                  );
                })}
              {packages.filter((p) => p.supplierCutoffAt && daysUntil(p.supplierCutoffAt) !== null && daysUntil(p.supplierCutoffAt)! <= 7).length === 0 && (
                <EmptyState title={t('common.empty')} />
              )}
            </div>
          </Card>

          {/* Package intel */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dash.packageIntel')}</h2>
              <Button size="sm" variant="ghost" onClick={() => onNavigate('packages')}>
                <ArrowRight size={14} />
              </Button>
            </div>
            <div className="space-y-2">
              {packages.slice(0, 4).map((p) => {
                const m = grossMarginPct(p);
                return (
                  <div key={p.packageId} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{p.title}</p>
                      <p className="text-slate-400">{p.destination} · {p.durationDays}{t('pkg.days')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(p.sellingPrice, p.currency, i18n.lang)}</p>
                      <p className={`text-xs ${m >= (settings.marginFloorPercent) ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{m.toFixed(0)}% {t('pkg.marginPct')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
