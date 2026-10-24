import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileDown, CreditCard } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Booking, BookingStatus, Currency, PaymentStatus } from '@/domain/types';
import { formatCurrency, formatDate, outstandingBalance, computePaymentStatus } from '@/domain/calculations';
import { generateItineraryPdf } from '@/integrations/pdf';
import { Badge, Card, EmptyState, Field, Input, Select } from '@/components/Form';
import { Button } from '@/components/Button';
import { Modal, ConfirmDialog } from '@/components/Modal';

const BOOKING_STATUSES: BookingStatus[] = ['Draft', 'Confirmed', 'Cancelled', 'Completed'];
const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid', 'Refunded'];
const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];
const SAFE_URL = /^https?:\/\//i;

function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return SAFE_URL.test(url) ? url : undefined;
}

const bookingColors: Record<BookingStatus, 'slate' | 'sky' | 'rose' | 'emerald'> = {
  Draft: 'slate',
  Confirmed: 'sky',
  Cancelled: 'rose',
  Completed: 'emerald',
};
const payColors: Record<PaymentStatus, 'slate' | 'amber' | 'emerald' | 'rose'> = {
  Unpaid: 'slate',
  Partial: 'amber',
  Paid: 'emerald',
  Refunded: 'rose',
};

export function BookingsPage() {
  const { bookings, leads, packages, agent, saveBooking, deleteBooking, recordPayment, i18n } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sorted = useMemo(() => [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [bookings]);

  const leadFor = (id: string) => leads.find((l) => l.leadId === id);
  const pkgFor = (id?: string) => packages.find((p) => p.packageId === id);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const downloadPdf = (b: Booking) => {
    const lead = leadFor(b.leadId);
    if (!lead) return;
    const doc = generateItineraryPdf(lead, pkgFor(b.packageId), b, agent?.name ?? 'Agent', i18n.lang);
    doc.save(`${lead.clientName.replace(/\s/g, '_')}_itinerary.pdf`);
    flash(t('act.pdfGenerated'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('book.title')}</h2>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> {t('book.newBooking')}</Button>
      </div>

      {toast && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm animate-fade-in">{toast}</div>}

      {sorted.length === 0 ? (
        <Card className="p-4"><EmptyState title={t('common.empty')} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((b) => {
            const lead = leadFor(b.leadId);
            const pkg = pkgFor(b.packageId);
            const balance = outstandingBalance(b);
            return (
              <Card key={b.bookingId} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{lead?.clientName ?? '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{pkg?.title ?? t('book.package')}</p>
                  </div>
                  <Badge color={bookingColors[b.bookingStatus]}>{t(`book.${b.bookingStatus.toLowerCase()}`)}</Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p>{t('book.total')}: {formatCurrency(b.totalAmount, b.currency, i18n.lang)}</p>
                  <p>{t('book.amountPaid')}: {formatCurrency(b.amountPaid, b.currency, i18n.lang)}</p>
                  <p className={balance > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                    {t('book.balance')}: {formatCurrency(balance, b.currency, i18n.lang)}
                  </p>
                  {b.balanceDueDate && <p>{t('book.balanceDue')}: {formatDate(b.balanceDueDate, i18n.lang)}</p>}
                  <p className="flex items-center gap-1"><Badge color={payColors[b.paymentStatus]}>{t(`book.${b.paymentStatus.toLowerCase()}`)}</Badge></p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Button size="sm" variant="ghost" onClick={() => downloadPdf(b)} aria-label={t('act.pdf')}><FileDown size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setPaymentBooking(b)} aria-label={t('book.recordPayment')}><CreditCard size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(b)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(b.bookingId)}><Trash2 size={14} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <BookingFormModal
          booking={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => { await saveBooking(data); setCreating(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.delete')}
        message={t('book.title')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={async () => { if (confirmDelete) await deleteBooking(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onConfirm={async (amount) => {
            await recordPayment(paymentBooking.bookingId, amount);
            setPaymentBooking(null);
            flash(t('act.paymentRecorded'));
          }}
        />
      )}
    </div>
  );
}

function BookingFormModal({ booking, onClose, onSave }: { booking: Booking | null; onClose: () => void; onSave: (data: Omit<Booking, 'bookingId' | 'createdAt' | 'updatedAt'> & { bookingId?: string }) => Promise<void>; }) {
  const { leads, packages, i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    leadId: booking?.leadId ?? '',
    packageId: booking?.packageId ?? '',
    totalAmount: booking?.totalAmount ?? 0,
    depositAmount: booking?.depositAmount ?? 0,
    amountPaid: booking?.amountPaid ?? 0,
    balanceDueDate: booking?.balanceDueDate?.slice(0, 10) ?? '',
    paymentStatus: booking?.paymentStatus ?? 'Unpaid' as PaymentStatus,
    bookingStatus: booking?.bookingStatus ?? 'Draft' as BookingStatus,
    currency: booking?.currency ?? 'USD' as Currency,
    confirmedAt: booking?.confirmedAt?.slice(0, 10) ?? '',
    paymentLink: booking?.paymentLink ?? '',
  });
  const [paymentLinkError, setPaymentLinkError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.leadId) return;
    const paymentLink = safeHref(form.paymentLink);
    if (form.paymentLink && !paymentLink) {
      setPaymentLinkError(t('book.invalidPaymentLink'));
      return;
    }
    setPaymentLinkError(null);
    const toISO = (v: string) => v ? new Date(v).toISOString() : undefined;
    const computed = computePaymentStatus(Number(form.totalAmount), Number(form.amountPaid));
    await onSave({
      bookingId: booking?.bookingId,
      leadId: form.leadId,
      packageId: form.packageId || undefined,
      totalAmount: Number(form.totalAmount),
      depositAmount: Number(form.depositAmount),
      amountPaid: Number(form.amountPaid),
      balanceDueDate: toISO(form.balanceDueDate),
      paymentStatus: computed,
      bookingStatus: form.bookingStatus,
      currency: form.currency,
      confirmedAt: toISO(form.confirmedAt),
      paymentLink,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={booking ? t('book.editBooking') : t('book.newBooking')}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.leadId}>{t('common.save')}</Button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('book.lead')} required>
          <Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
            <option value="">—</option>
            {leads.map((l) => <option key={l.leadId} value={l.leadId}>{l.clientName}</option>)}
          </Select>
        </Field>
        <Field label={t('book.package')}>
          <Select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>
            <option value="">—</option>
            {packages.map((p) => <option key={p.packageId} value={p.packageId}>{p.title}</option>)}
          </Select>
        </Field>
        <Field label={t('book.total')} required><Input type="number" min={0} value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} /></Field>
        <Field label={t('book.deposit')}><Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })} /></Field>
        <Field label={t('book.amountPaid')}><Input type="number" min={0} value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) })} /></Field>
        <Field label={t('common.currency')}><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={t('book.paymentStatus')}><Select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as PaymentStatus })}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`book.${s.toLowerCase()}`)}</option>)}</Select></Field>
        <Field label={t('book.bookingStatus')}><Select value={form.bookingStatus} onChange={(e) => setForm({ ...form, bookingStatus: e.target.value as BookingStatus })}>{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{t(`book.${s.toLowerCase()}`)}</option>)}</Select></Field>
        <Field label={t('book.balanceDue')}><Input type="date" value={form.balanceDueDate} onChange={(e) => setForm({ ...form, balanceDueDate: e.target.value })} /></Field>
        <Field label={t('book.confirmedAt')}><Input type="date" value={form.confirmedAt} onChange={(e) => setForm({ ...form, confirmedAt: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label={t('book.paymentLink')}>
            <Input
              value={form.paymentLink}
              onChange={(e) => {
                setForm({ ...form, paymentLink: e.target.value });
                setPaymentLinkError(null);
              }}
              placeholder="https://..."
            />
            {paymentLinkError && <p role="alert" className="mt-1 text-xs text-rose-600">{paymentLinkError}</p>}
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function PaymentModal({ booking, onClose, onConfirm }: { booking: Booking; onClose: () => void; onConfirm: (amount: number) => Promise<void>; }) {
  const { i18n } = useApp();
  const t = i18n.t;
  const [amount, setAmount] = useState<number>(outstandingBalance(booking));
  const balance = outstandingBalance(booking);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('book.recordPayment')}
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => onConfirm(amount)} disabled={amount <= 0}>{t('common.confirm')}</Button></>}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('book.balance')}: {formatCurrency(balance, booking.currency, i18n.lang)}</p>
        <Field label={t('book.amountPaid')} required><Input type="number" min={0} max={balance} value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus /></Field>
      </div>
    </Modal>
  );
}
