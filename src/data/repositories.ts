import { db, newId, nowISO } from './db';
import type {
  Agent,
  Booking,
  DiscountAudit,
  GsdTask,
  Lead,
  Settings,
  TourPackage,
} from '@/domain/types';

function stripUndefined<T extends object>(patch: Partial<T>): Partial<T> {
  const cleanPatch: Partial<T> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) Object.assign(cleanPatch, { [key]: value });
  }
  return cleanPatch;
}

export const agentRepo = {
  async get(): Promise<Agent | undefined> {
    const all = await db.agents.toArray();
    return all.find((a) => a.active) ?? all[0];
  },
  async save(agent: Agent): Promise<void> {
    await db.agents.put(agent);
  },
};

export const settingsRepo = {
  async get(): Promise<Settings | undefined> {
    return db.settings.toCollection().first();
  },
  async save(settings: Settings): Promise<void> {
    await db.settings.put(settings);
  },
  async ensureDefault(agentId: string): Promise<Settings> {
    const existing = await this.get();
    if (existing) return existing;
    const s: Settings = {
      id: 'settings_default',
      agentId,
      language: 'en',
      theme: 'system',
      reportingCurrency: 'USD',
      sellingDaysTotal: 22,
      sellingDaysElapsed: 12,
      revenueRecognition: 'on_confirmation',
      marginFloorPercent: 15,
      p0Threshold: 80,
      p1Threshold: 50,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await this.save(s);
    return s;
  },
};

export const leadRepo = {
  async all(): Promise<Lead[]> {
    return db.leads.toArray();
  },
  async get(id: string): Promise<Lead | undefined> {
    return db.leads.get(id);
  },
  async create(lead: Omit<Lead, 'leadId' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const now = nowISO();
    const full: Lead = { ...lead, leadId: newId('lead'), createdAt: now, updatedAt: now };
    await db.leads.put(full);
    return full;
  },
  async update(id: string, patch: Partial<Lead>): Promise<Lead | undefined> {
    const existing = await db.leads.get(id);
    if (!existing) return undefined;
    const updated: Lead = { ...existing, ...stripUndefined(patch), leadId: id, updatedAt: nowISO() };
    await db.leads.put(updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await db.leads.delete(id);
  },
};

export const packageRepo = {
  async all(): Promise<TourPackage[]> {
    return db.packages.toArray();
  },
  async get(id: string): Promise<TourPackage | undefined> {
    return db.packages.get(id);
  },
  async create(pkg: Omit<TourPackage, 'packageId' | 'createdAt' | 'updatedAt'>): Promise<TourPackage> {
    const now = nowISO();
    const full: TourPackage = { ...pkg, packageId: newId('pkg'), createdAt: now, updatedAt: now };
    await db.packages.put(full);
    return full;
  },
  async update(id: string, patch: Partial<TourPackage>): Promise<TourPackage | undefined> {
    const existing = await db.packages.get(id);
    if (!existing) return undefined;
    const updated: TourPackage = { ...existing, ...stripUndefined(patch), packageId: id, updatedAt: nowISO() };
    await db.packages.put(updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await db.packages.delete(id);
  },
};

export const bookingRepo = {
  async all(): Promise<Booking[]> {
    return db.bookings.toArray();
  },
  async get(id: string): Promise<Booking | undefined> {
    return db.bookings.get(id);
  },
  async create(booking: Omit<Booking, 'bookingId' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    const now = nowISO();
    const full: Booking = { ...booking, bookingId: newId('book'), createdAt: now, updatedAt: now };
    await db.bookings.put(full);
    return full;
  },
  async update(id: string, patch: Partial<Booking>): Promise<Booking | undefined> {
    const existing = await db.bookings.get(id);
    if (!existing) return undefined;
    const updated: Booking = { ...existing, ...stripUndefined(patch), bookingId: id, updatedAt: nowISO() };
    await db.bookings.put(updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await db.bookings.delete(id);
  },
};

export const taskRepo = {
  async all(): Promise<GsdTask[]> {
    return db.tasks.toArray();
  },
  async get(id: string): Promise<GsdTask | undefined> {
    return db.tasks.get(id);
  },
  async create(task: Omit<GsdTask, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<GsdTask> {
    const now = nowISO();
    const full: GsdTask = { ...task, taskId: newId('task'), createdAt: now, updatedAt: now };
    await db.tasks.put(full);
    return full;
  },
  async update(id: string, patch: Partial<GsdTask>): Promise<GsdTask | undefined> {
    const existing = await db.tasks.get(id);
    if (!existing) return undefined;
    const updated: GsdTask = { ...existing, ...stripUndefined(patch), taskId: id, updatedAt: nowISO() };
    await db.tasks.put(updated);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await db.tasks.delete(id);
  },
};

export const discountAuditRepo = {
  async all(): Promise<DiscountAudit[]> {
    return db.discountAudits.toArray();
  },
  async create(a: Omit<DiscountAudit, 'id' | 'createdAt'>): Promise<DiscountAudit> {
    const full: DiscountAudit = { ...a, id: newId('disc'), createdAt: nowISO() };
    await db.discountAudits.put(full);
    return full;
  },
};
