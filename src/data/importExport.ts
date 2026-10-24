import { db } from './db';
import { importSchema } from '@/domain/validation';

export interface ExportBundle {
  version: number;
  exportedAt: string;
  agents: unknown[];
  leads: unknown[];
  packages: unknown[];
  bookings: unknown[];
  tasks: unknown[];
  settings: unknown[];
  discountAudits: unknown[];
}

export async function exportData(): Promise<ExportBundle> {
  const [agents, leads, packages, bookings, tasks, settings, discountAudits] = await Promise.all([
    db.agents.toArray(),
    db.leads.toArray(),
    db.packages.toArray(),
    db.bookings.toArray(),
    db.tasks.toArray(),
    db.settings.toArray(),
    db.discountAudits.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    agents,
    leads,
    packages,
    bookings,
    tasks,
    settings,
    discountAudits,
  };
}

export interface ImportResult {
  ok: boolean;
  counts: Record<string, number>;
  errors: string[];
}

export async function importData(json: unknown, opts: { replace?: boolean } = {}): Promise<ImportResult> {
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      counts: {},
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  const data = parsed.data;
  const errors: string[] = [];

  // Duplicate ID check within the bundle
  const checkDup = (arr: { [k: string]: unknown }[], idKey: string, label: string) => {
    const seen = new Set<string>();
    for (const r of arr) {
      const id = String(r[idKey]);
      if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
      seen.add(id);
    }
  };
  checkDup(data.agents, 'agentId', 'agent');
  checkDup(data.leads, 'leadId', 'lead');
  checkDup(data.packages, 'packageId', 'package');
  checkDup(data.bookings, 'bookingId', 'booking');
  checkDup(data.tasks, 'taskId', 'task');

  // Reference validation
  const leadIds = new Set(data.leads.map((l) => l.leadId));
  const packageIds = new Set(data.packages.map((p) => p.packageId));
  const bookingIds = new Set(data.bookings.map((b) => b.bookingId));
  const agentIds = new Set(data.agents.map((a) => a.agentId));
  for (const b of data.bookings) {
    if (!leadIds.has(b.leadId)) errors.push(`Booking ${b.bookingId} references missing lead ${b.leadId}`);
    if (b.packageId && !packageIds.has(b.packageId)) errors.push(`Booking ${b.bookingId} references missing package ${b.packageId}`);
  }
  for (const t of data.tasks) {
    if (t.leadId && !leadIds.has(t.leadId)) errors.push(`Task ${t.taskId} references missing lead ${t.leadId}`);
    if (t.bookingId && !bookingIds.has(t.bookingId)) errors.push(`Task ${t.taskId} references missing booking ${t.bookingId}`);
    if (!agentIds.has(t.agentId)) errors.push(`Task ${t.taskId} references missing agent ${t.agentId}`);
  }
  for (const l of data.leads) {
    if (!agentIds.has(l.agentId)) errors.push(`Lead ${l.leadId} references missing agent ${l.agentId}`);
  }
  for (const s of data.settings) {
    if (!agentIds.has(s.agentId)) errors.push(`Settings ${s.id} references missing agent ${s.agentId}`);
  }

  if (errors.length > 0) {
    return { ok: false, counts: {}, errors };
  }

  await db.transaction('rw', db.tables, async () => {
    if (opts.replace) {
      await Promise.all(db.tables.map((t) => t.clear()));
    }
    await db.agents.bulkPut(data.agents as never);
    await db.leads.bulkPut(data.leads as never);
    await db.packages.bulkPut(data.packages as never);
    await db.bookings.bulkPut(data.bookings as never);
    await db.tasks.bulkPut(data.tasks as never);
    await db.settings.bulkPut(data.settings as never);
    await db.discountAudits.bulkPut(data.discountAudits as never);
  });

  return {
    ok: true,
    errors: [],
    counts: {
      agents: data.agents.length,
      leads: data.leads.length,
      packages: data.packages.length,
      bookings: data.bookings.length,
      tasks: data.tasks.length,
    },
  };
}

export function downloadFile(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const vals = headers.map((h) => {
      const v = row[h];
      if (v === undefined || v === null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}
