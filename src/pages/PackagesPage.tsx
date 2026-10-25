import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { AvailabilityStatus, Currency, TourPackage } from '@/domain/types';
import { formatCurrency, formatDate, daysUntil, grossMarginPct } from '@/domain/calculations';
import { Badge, Card, EmptyState, Field, Input, Select } from '@/components/Form';
import { Button } from '@/components/Button';
import { Modal, ConfirmDialog } from '@/components/Modal';

const AVAILABILITY: AvailabilityStatus[] = ['Available', 'Limited', 'Sold Out', 'On Request'];
const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];

const availColors: Record<AvailabilityStatus, 'emerald' | 'amber' | 'rose' | 'slate'> = {
  Available: 'emerald',
  Limited: 'amber',
  'Sold Out': 'rose',
  'On Request': 'slate',
};

export function PackagesPage() {
  const { packages, savePackage, deletePackage, settings, i18n } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<TourPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...packages].sort((a, b) => a.title.localeCompare(b.title));
  }, [packages]);

  const marginFloor = settings?.marginFloorPercent ?? 15;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('pkg.title')}</h2>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> {t('pkg.newPackage')}</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-4"><EmptyState title={t('common.empty')} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p) => {
            const margin = grossMarginPct(p);
            const cutoffDays = daysUntil(p.supplierCutoffAt);
            return (
              <Card key={p.packageId} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{p.title}</p>
                    <p className="text-xs text-slate-400 truncate">{p.destination} · {p.durationDays} {t('pkg.days')}</p>
                  </div>
                  <Badge color={availColors[p.availabilityStatus]}>{t(`pkg.${p.availabilityStatus.toLowerCase().replace(/\s/g, '').replace('onrequest', 'onRequest').replace('soldout', 'soldOut')}`)}</Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p>{t('pkg.baseCost')}: {formatCurrency(p.baseCost, p.currency, i18n.lang)}</p>
                  <p className="font-medium text-slate-700 dark:text-slate-200">{t('pkg.sellingPrice')}: {formatCurrency(p.sellingPrice, p.currency, i18n.lang)}</p>
                  <p className={margin >= marginFloor ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                    {t('pkg.marginPct')}: {margin.toFixed(0)}%
                  </p>
                  {p.season && <p>{t('pkg.season')}: {p.season}</p>}
                  {p.supplierCutoffAt && (
                    <p className={cutoffDays !== null && cutoffDays <= 7 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                      {t('pkg.supplierCutoff')}: {formatDate(p.supplierCutoffAt, i18n.lang)}
                      {cutoffDays !== null && cutoffDays <= 7 && ` (${cutoffDays <= 0 ? t('common.overdue') : `${cutoffDays}${t('common.days')}`})`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)} aria-label={t('common.edit')}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p.packageId)} aria-label={t('common.delete')}><Trash2 size={14} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <PackageFormModal
          pkg={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => {
            await savePackage(data);
            setCreating(false); setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.delete')}
        message={t('pkg.title')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={async () => { if (confirmDelete) await deletePackage(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function PackageFormModal({ pkg, onClose, onSave }: { pkg: TourPackage | null; onClose: () => void; onSave: (data: Omit<TourPackage, 'packageId' | 'createdAt' | 'updatedAt'> & { packageId?: string }) => Promise<void>; }) {
  const { i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    title: pkg?.title ?? '',
    destination: pkg?.destination ?? '',
    durationDays: pkg?.durationDays ?? 3,
    baseCost: pkg?.baseCost ?? 0,
    sellingPrice: pkg?.sellingPrice ?? 0,
    currency: pkg?.currency ?? 'USD' as Currency,
    availabilityStatus: pkg?.availabilityStatus ?? 'Available' as AvailabilityStatus,
    supplierCutoffAt: pkg?.supplierCutoffAt?.slice(0, 10) ?? '',
    season: pkg?.season ?? '',
    notes: '',
  });

  const submit = async () => {
    await onSave({
      packageId: pkg?.packageId,
      title: form.title,
      destination: form.destination,
      durationDays: Number(form.durationDays),
      baseCost: Number(form.baseCost),
      sellingPrice: Number(form.sellingPrice),
      currency: form.currency,
      availabilityStatus: form.availabilityStatus,
      supplierCutoffAt: form.supplierCutoffAt ? new Date(form.supplierCutoffAt).toISOString() : undefined,
      season: form.season || undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={pkg ? t('pkg.editPackage') : t('pkg.newPackage')}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.title || !form.destination}>{t('common.save')}</Button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label={t('pkg.name')} required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
        <Field label={t('common.destination')} required><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
        <Field label={t('pkg.duration')} required><Input type="number" min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} /></Field>
        <Field label={t('pkg.baseCost')} required><Input type="number" min={0} value={form.baseCost} onChange={(e) => setForm({ ...form, baseCost: Number(e.target.value) })} /></Field>
        <Field label={t('pkg.sellingPrice')} required><Input type="number" min={0} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} /></Field>
        <Field label={t('common.currency')}><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={t('pkg.availability')}><Select value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value as AvailabilityStatus })}>{AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}</Select></Field>
        <Field label={t('pkg.supplierCutoff')}><Input type="date" value={form.supplierCutoffAt} onChange={(e) => setForm({ ...form, supplierCutoffAt: e.target.value })} /></Field>
        <Field label={t('pkg.season')}><Input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
