import { useMemo } from 'react';
import { Users, FileText, Wallet, Trophy, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Currency, Lead, LeadStage } from '@/domain/types';
import { formatCurrency, formatDate, daysUntil, round2 } from '@/domain/calculations';
import { Badge, Card, EmptyState } from '@/components/Form';

const STAGES: { key: LeadStage; icon: typeof Users; color: 'slate' | 'sky' | 'amber' | 'emerald' | 'rose' }[] = [
  { key: 'Inquiry', icon: Users, color: 'slate' },
  { key: 'Quote Sent', icon: FileText, color: 'sky' },
  { key: 'Deposit Paid', icon: Wallet, color: 'amber' },
  { key: 'Closed Won', icon: Trophy, color: 'emerald' },
  { key: 'Lost', icon: X, color: 'rose' },
];

export function PipelinePage() {
  const { leads, i18n } = useApp();
  const t = i18n.t;

  const grouped = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = { Inquiry: [], 'Quote Sent': [], 'Deposit Paid': [], 'Closed Won': [], Lost: [] };
    for (const l of leads) map[l.stage].push(l);
    return map;
  }, [leads]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<Currency, { value: number; won: number }>();
    for (const lead of leads) {
      const total = map.get(lead.currency) ?? { value: 0, won: 0 };
      if (lead.stage !== 'Lost') total.value += lead.budget;
      if (lead.stage === 'Closed Won') total.won += lead.budget;
      map.set(lead.currency, total);
    }
    return Array.from(map.entries()).map(([currency, total]) => [
      currency,
      { value: round2(total.value), won: round2(total.won) },
    ] as const);
  }, [leads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('dash.salesPipeline')}</h2>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
          {totalsByCurrency.map(([currency, total]) => (
            <div key={currency} className="flex gap-4">
              <span>{t('common.value')} ({currency}): <strong className="text-slate-900 dark:text-white">{formatCurrency(total.value, currency, i18n.lang)}</strong></span>
              <span>{t('lead.closedWon')}: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(total.won, currency, i18n.lang)}</strong></span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGES.map(({ key, icon: Icon, color }) => {
          const items = grouped[key];
          const stageValues = new Map<Currency, number>();
          for (const lead of items) {
            stageValues.set(lead.currency, (stageValues.get(lead.currency) ?? 0) + lead.budget);
          }
          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <Icon size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t(`lead.${key.toLowerCase().replace(/\s/g, '').replace('quotesent', 'quoteSent').replace('depositpaid', 'depositPaid').replace('closedwon', 'closedWon')}`)}
                </span>
                <Badge color={color}>{items.length}</Badge>
              </div>
              {Array.from(stageValues, ([currency, value]) => (
                <p key={currency} className="text-xs text-slate-400 px-1">
                  {formatCurrency(round2(value), currency, i18n.lang)}
                </p>
              ))}

              <div className="space-y-2 min-h-[100px]">
                {items.length === 0 ? (
                  <Card className="p-3"><EmptyState title={t('common.empty')} /></Card>
                ) : (
                  items.map((l) => {
                    const expiry = daysUntil(l.quoteExpiryDate);
                    return (
                      <Card key={l.leadId} className="p-3 animate-fade-in">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.clientName}</p>
                        {l.agencyName && <p className="text-xs text-slate-400 truncate">{l.agencyName}</p>}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{l.destination} · {l.partySize} pax</p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(l.budget, l.currency, i18n.lang)}</p>
                        {l.expectedCloseDate && <p className="text-xs text-slate-400 mt-0.5">{t('lead.expectedClose')}: {formatDate(l.expectedCloseDate, i18n.lang)}</p>}
                        {l.quoteExpiryDate && (
                          <p className={`text-xs mt-0.5 ${expiry !== null && expiry <= 1 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-400'}`}>
                            {t('lead.quoteExpiry')}: {formatDate(l.quoteExpiryDate, i18n.lang)}
                          </p>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
