import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, MessageCircle, Search } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Currency, Lead, LeadStage } from '@/domain/types';
import { formatCurrency, formatDate, daysUntil } from '@/domain/calculations';
import { Badge, Card, EmptyState, Field, Input, Select, Textarea } from '@/components/Form';
import { Button } from '@/components/Button';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { WhatsAppModal } from '@/integrations/WhatsAppModal';

const STAGES: LeadStage[] = ['Inquiry', 'Quote Sent', 'Deposit Paid', 'Closed Won', 'Lost'];
const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];

const stageColors: Record<LeadStage, 'slate' | 'sky' | 'amber' | 'emerald' | 'rose'> = {
  Inquiry: 'slate',
  'Quote Sent': 'sky',
  'Deposit Paid': 'amber',
  'Closed Won': 'emerald',
  Lost: 'rose',
};

export function LeadsPage() {
  const { leads, saveLead, deleteLead, i18n, agent } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>('all');

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
      if (search && !`${l.clientName} ${l.agencyName ?? ''} ${l.destination}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, search, stageFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="pl-8" />
          </div>
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as LeadStage | 'all')} className="w-auto">
            <option value="all">{t('common.all')}</option>
            {STAGES.map((s) => <option key={s} value={s}>{t(`lead.${s.toLowerCase().replace(/\s/g, '').replace('quotesent', 'quoteSent').replace('depositpaid', 'depositPaid').replace('closedwon', 'closedWon')}`)}</option>)}
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> {t('lead.newLead')}</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-4"><EmptyState title={t('common.empty')} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((l) => {
            const expiryDays = daysUntil(l.quoteExpiryDate);
            return (
              <Card key={l.leadId} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{l.clientName}</p>
                    {l.agencyName && <p className="text-xs text-slate-400 truncate">{l.agencyName}</p>}
                  </div>
                  <Badge color={stageColors[l.stage]}>{t(`lead.${l.stage.toLowerCase().replace(/\s/g, '').replace('quotesent', 'quoteSent').replace('depositpaid', 'depositPaid').replace('closedwon', 'closedWon')}`)}</Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p>{l.destination} · {l.partySize} pax · {formatCurrency(l.budget, l.currency, i18n.lang)}</p>
                  {l.expectedCloseDate && <p>{t('lead.expectedClose')}: {formatDate(l.expectedCloseDate, i18n.lang)}</p>}
                  {l.quoteExpiryDate && (
                    <p className={expiryDays !== null && expiryDays <= 1 ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}>
                      {t('lead.quoteExpiry')}: {formatDate(l.quoteExpiryDate, i18n.lang)}
                      {expiryDays !== null && expiryDays <= 1 && ` (${expiryDays <= 0 ? t('common.overdue') : `${expiryDays}${t('common.days')}`})`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="ghost" onClick={() => setWhatsappLead(l)}><MessageCircle size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(l)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(l.leadId)}><Trash2 size={14} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <LeadFormModal
          lead={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => {
            await saveLead(data);
            setCreating(false); setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.delete')}
        message={t('lead.title')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={async () => {
          if (confirmDelete) await deleteLead(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {whatsappLead && (
        <WhatsAppModal lead={whatsappLead} agentName={agent?.name ?? 'Agent'} onClose={() => setWhatsappLead(null)} />
      )}
    </div>
  );
}

function LeadFormModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (data: Omit<Lead, 'leadId' | 'createdAt' | 'updatedAt'> & { leadId?: string }) => Promise<void>; }) {
  const { agent, i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    clientName: lead?.clientName ?? '',
    agencyName: lead?.agencyName ?? '',
    destination: lead?.destination ?? '',
    partySize: lead?.partySize ?? 2,
    budget: lead?.budget ?? 0,
    currency: lead?.currency ?? 'USD' as Currency,
    stage: lead?.stage ?? 'Inquiry' as LeadStage,
    priorityScore: lead?.priorityScore ?? 50,
    expectedCloseDate: lead?.expectedCloseDate?.slice(0, 10) ?? '',
    quoteExpiryDate: lead?.quoteExpiryDate?.slice(0, 10) ?? '',
    source: lead?.source ?? '',
    nextActionAt: lead?.nextActionAt?.slice(0, 16) ?? '',
    notes: lead?.notes ?? '',
  });

  const submit = async () => {
    if (!agent) return;
    const toISO = (v: string) => v ? new Date(v).toISOString() : undefined;
    await onSave({
      leadId: lead?.leadId,
      agentId: agent.agentId,
      clientName: form.clientName,
      agencyName: form.agencyName || undefined,
      destination: form.destination,
      partySize: Number(form.partySize),
      budget: Number(form.budget),
      currency: form.currency,
      stage: form.stage,
      priorityScore: Number(form.priorityScore),
      expectedCloseDate: toISO(form.expectedCloseDate),
      quoteExpiryDate: toISO(form.quoteExpiryDate),
      source: form.source || undefined,
      nextActionAt: toISO(form.nextActionAt),
      notes: form.notes || undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={lead ? t('lead.editLead') : t('lead.newLead')}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.clientName || !form.destination}>{t('common.save')}</Button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('lead.clientName')} required><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></Field>
        <Field label={t('lead.agencyName')}><Input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} /></Field>
        <Field label={t('common.destination')} required><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
        <Field label={t('lead.partySize')} required><Input type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} /></Field>
        <Field label={t('lead.budget')} required><Input type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></Field>
        <Field label={t('common.currency')}><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={t('lead.stage')}><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })}>{STAGES.map((s) => <option key={s} value={s}>{t(`lead.${s.toLowerCase().replace(/\s/g, '').replace('quotesent', 'quoteSent').replace('depositpaid', 'depositPaid').replace('closedwon', 'closedWon')}`)}</option>)}</Select></Field>
        <Field label={t('lead.priorityScore')}><Input type="number" min={0} max={100} value={form.priorityScore} onChange={(e) => setForm({ ...form, priorityScore: Number(e.target.value) })} /></Field>
        <Field label={t('lead.expectedClose')}><Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} /></Field>
        <Field label={t('lead.quoteExpiry')}><Input type="date" value={form.quoteExpiryDate} onChange={(e) => setForm({ ...form, quoteExpiryDate: e.target.value })} /></Field>
        <Field label={t('lead.source')}><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
        <Field label={t('lead.nextAction')}><Input type="datetime-local" value={form.nextActionAt} onChange={(e) => setForm({ ...form, nextActionAt: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label={t('common.notes')}><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}
