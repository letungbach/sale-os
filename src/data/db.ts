import Dexie, { type Table } from 'dexie';
import type {
  Agent,
  Booking,
  DiscountAudit,
  GsdTask,
  Lead,
  Settings,
  TourPackage,
} from '@/domain/types';

export class SalesOSDatabase extends Dexie {
  agents!: Table<Agent, string>;
  leads!: Table<Lead, string>;
  packages!: Table<TourPackage, string>;
  bookings!: Table<Booking, string>;
  tasks!: Table<GsdTask, string>;
  settings!: Table<Settings, string>;
  discountAudits!: Table<DiscountAudit, string>;

  constructor() {
    super('phucgia_salesos');
    this.version(1).stores({
      agents: 'agentId, name, active',
      leads: 'leadId, agentId, stage, destination, priorityScore, nextActionAt, createdAt',
      packages: 'packageId, destination, availabilityStatus, supplierCutoffAt',
      bookings: 'bookingId, leadId, packageId, bookingStatus, paymentStatus, currency, createdAt',
      tasks: 'taskId, agentId, leadId, bookingId, urgencyLevel, status, dueAt, createdAt',
      settings: 'id, agentId',
      discountAudits: 'id, bookingId, leadId, createdAt',
    });
    this.version(2)
      .stores({
        agents: 'agentId, name, active',
        leads: 'leadId, agentId, stage, destination, priorityScore, nextActionAt, createdAt, closedAt',
        packages: 'packageId, destination, availabilityStatus, supplierCutoffAt',
        bookings: 'bookingId, leadId, packageId, bookingStatus, paymentStatus, currency, createdAt',
        tasks: 'taskId, agentId, leadId, bookingId, urgencyLevel, status, dueAt, createdAt',
        settings: 'id, agentId',
        discountAudits: 'id, bookingId, leadId, createdAt',
      })
      .upgrade(async (tx) => {
        await tx.table('leads').toCollection().modify((lead) => {
          if (lead.stage === 'Closed Won' && !lead.closedAt) {
            lead.closedAt = lead.updatedAt;
          }
        });
      });
  }
}

export const db = new SalesOSDatabase();

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
