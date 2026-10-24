import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { GsdTask, TaskStatus, TaskType, UrgencyLevel } from '@/domain/types';
import { formatCurrency, hoursUntil, daysUntil } from '@/domain/calculations';
import { rankTasks, attachContext, type ScoredTask } from '@/domain/scoring';
import { Badge, Card, EmptyState, Field, Input, Select, Textarea } from '@/components/Form';
import { Button } from '@/components/Button';
import { Modal, ConfirmDialog } from '@/components/Modal';

const TASK_TYPES: TaskType[] = ['Follow Up', 'Quote', 'Deposit', 'Itinerary', 'Visa', 'Supplier', 'Custom'];
const URGENCY: UrgencyLevel[] = ['P0', 'P1', 'P2'];
const STATUSES: TaskStatus[] = ['Open', 'Completed', 'Deferred', 'Cancelled'];

const priorityColor = (p: UrgencyLevel): 'rose' | 'amber' | 'slate' => p === 'P0' ? 'rose' : p === 'P1' ? 'amber' : 'slate';

interface Props {
  initialTaskId?: string | null;
  onConsumeTaskId?: () => void;
}

export function TasksPage({ initialTaskId, onConsumeTaskId }: Props) {
  const { tasks, leads, bookings, settings, i18n, saveTask, deleteTask } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<GsdTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<UrgencyLevel | 'all'>('all');

  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find((x) => x.taskId === initialTaskId);
      if (task) setEditing(task);
      onConsumeTaskId?.();
    }
  }, [initialTaskId, tasks, onConsumeTaskId]);

  const scored = useMemo(() => {
    if (!settings) return [];
    return rankTasks(tasks, { p0Threshold: settings.p0Threshold, p1Threshold: settings.p1Threshold });
  }, [tasks, settings]);

  const allTasks = useMemo(() => [...tasks].sort((a, b) => (b.dueAt ?? '').localeCompare(a.dueAt ?? '')), [tasks]);
  const filtered = filter === 'all' ? scored : scored.filter((s) => s.priority === filter);
  const currency = settings?.reportingCurrency ?? 'USD';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('task.title')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['all', 'P0', 'P1', 'P2'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {f === 'all' ? t('common.all') : f}
              </button>
            ))}
          </div>
          <Button onClick={() => setCreating(true)}><Plus size={16} /> {t('task.newTask')}</Button>
        </div>
      </div>

      {filter !== 'all' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="p-4"><EmptyState title={t('dash.noTasks')} /></Card>
          ) : (
            filtered.map((s) => <TaskRow key={s.task.taskId} s={s} leads={leads} bookings={bookings} currency={currency} lang={i18n.lang} t={t} onEdit={() => setEditing(s.task)} onComplete={async () => { await saveTask({ ...s.task, status: 'Completed', completedAt: new Date().toISOString() }); }} />)
          )}
        </div>
      )}

      {filter === 'all' && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('task.open')} ({scored.length})</h3>
          {scored.length === 0 ? (
            <Card className="p-4"><EmptyState title={t('dash.noTasks')} /></Card>
          ) : (
            scored.slice(0, 12).map((s) => <TaskRow key={s.task.taskId} s={s} leads={leads} bookings={bookings} currency={currency} lang={i18n.lang} t={t} onEdit={() => setEditing(s.task)} onComplete={async () => { await saveTask({ ...s.task, status: 'Completed', completedAt: new Date().toISOString() }); }} />)
          )}
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">{t('task.completed')} / {t('task.deferred')}</h3>
          {allTasks.filter((x) => x.status !== 'Open').length === 0 ? (
            <Card className="p-4"><EmptyState title={t('common.empty')} /></Card>
          ) : (
            allTasks.filter((x) => x.status !== 'Open').slice(0, 8).map((task) => (
              <Card key={task.taskId} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={priorityColor(task.urgencyLevel)}>{task.urgencyLevel}</Badge>
                      <Badge color="slate">{task.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(task.estimatedValue, currency, i18n.lang)} · {task.estimatedMinutes}{t('common.minutes')}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(task)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(task.taskId)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {(creating || editing) && (
        <TaskFormModal
          task={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => { await saveTask(data); setCreating(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('common.delete')}
        message={t('task.title')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={async () => { if (confirmDelete) await deleteTask(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function TaskRow({ s, leads, bookings, currency, lang, t, onEdit, onComplete }: {
  s: ScoredTask; leads: Parameters<typeof attachContext>[1]; bookings: Parameters<typeof attachContext>[2]; currency: string; lang: string; t: (k: string) => string; onEdit: () => void; onComplete: () => Promise<void>;
}) {
  const ctx = attachContext(s, leads, bookings);
  const lead = ctx.lead;
  const hours = hoursUntil(s.task.dueAt);
  const days = daysUntil(s.task.dueAt);
  let dueLabel = '';
  if (s.isOverdue) dueLabel = t('common.overdue');
  else if (hours !== null && hours <= 24) dueLabel = `${hours}${t('common.hours')}`;
  else if (days !== null) dueLabel = `${days}${t('common.days')}`;

  return (
    <div className="group rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge color={priorityColor(s.priority)}>{s.priority}</Badge>
            <Badge color="slate">{s.task.taskType}</Badge>
            {s.isOverdue && <Badge color="rose"><AlertTriangle size={10} />{dueLabel}</Badge>}
            {!s.isOverdue && dueLabel && <Badge color="slate"><Clock size={10} />{dueLabel}</Badge>}
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.task.title}</p>
          {lead && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lead.clientName} · {lead.destination}</p>}
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.explanation}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(s.task.estimatedValue, currency as never, lang)}</p>
          <p className="text-xs text-slate-400">{s.task.estimatedMinutes}{t('common.minutes')}</p>
          <div className="mt-1 flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil size={14} /></Button>
            <Button size="sm" variant="secondary" onClick={onComplete}><CheckCircle2 size={14} /> {t('dash.complete')}</Button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full ${s.priority === 'P0' ? 'bg-rose-500' : s.priority === 'P1' ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${s.totalScore}%` }} />
        </div>
        <span className="text-xs font-mono text-slate-400">{s.totalScore}</span>
      </div>
    </div>
  );
}

function TaskFormModal({ task, onClose, onSave }: { task: GsdTask | null; onClose: () => void; onSave: (data: Omit<GsdTask, 'taskId' | 'createdAt' | 'updatedAt'> & { taskId?: string }) => Promise<void>; }) {
  const { agent, leads, bookings, i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    taskType: task?.taskType ?? 'Follow Up' as TaskType,
    urgencyLevel: task?.urgencyLevel ?? 'P1' as UrgencyLevel,
    estimatedValue: task?.estimatedValue ?? 0,
    estimatedMinutes: task?.estimatedMinutes ?? 15,
    dueAt: task?.dueAt?.slice(0, 16) ?? '',
    leadId: task?.leadId ?? '',
    bookingId: task?.bookingId ?? '',
    status: task?.status ?? 'Open' as TaskStatus,
  });

  const submit = async () => {
    if (!agent) return;
    await onSave({
      taskId: task?.taskId,
      agentId: agent.agentId,
      title: form.title,
      description: form.description || undefined,
      taskType: form.taskType,
      urgencyLevel: form.urgencyLevel,
      estimatedValue: Number(form.estimatedValue),
      estimatedMinutes: Number(form.estimatedMinutes),
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      leadId: form.leadId || undefined,
      bookingId: form.bookingId || undefined,
      status: form.status,
      completedAt: form.status === 'Completed' ? (task?.completedAt ?? new Date().toISOString()) : undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? t('task.editTask') : t('task.newTask')}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.title}>{t('common.save')}</Button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label={t('common.edit')} required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('task.title')} /></Field></div>
        <div className="sm:col-span-2"><Field label={t('common.notes')}><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        <Field label={t('task.taskType')}><Select value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskType })}>{TASK_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}</Select></Field>
        <Field label={t('task.urgency')}><Select value={form.urgencyLevel} onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value as UrgencyLevel })}>{URGENCY.map((u) => <option key={u} value={u}>{u}</option>)}</Select></Field>
        <Field label={t('task.estimatedValue')}><Input type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })} /></Field>
        <Field label={t('task.estimatedMinutes')}><Input type="number" min={1} value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} /></Field>
        <Field label={t('task.dueAt')}><Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></Field>
        <Field label={t('task.status')}><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{t(`task.${s.toLowerCase()}`)}</option>)}</Select></Field>
        <Field label={t('task.associatedLead')}><Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}><option value="">—</option>{leads.map((l) => <option key={l.leadId} value={l.leadId}>{l.clientName}</option>)}</Select></Field>
        <Field label={t('task.associatedBooking')}><Select value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}><option value="">—</option>{bookings.map((b) => <option key={b.bookingId} value={b.bookingId}>{b.bookingId}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}
