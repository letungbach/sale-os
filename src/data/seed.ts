import type {
  Agent,
  Booking,
  Currency,
  GsdTask,
  Lead,
  Settings,
  TourPackage,
} from '@/domain/types';
import { db, nowISO } from './db';

const DEMO_AGENT_ID = 'agent_demo_01';
const ISO = nowISO;

function daysFromNow(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function hoursFromNow(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const DEMO_AGENT: Agent = {
  agentId: DEMO_AGENT_ID,
  name: 'Linh Pham',
  monthlyRevenueTarget: 60000,
  commissionRate: 0.08,
  currency: 'USD',
  active: true,
  createdAt: ISO(),
  updatedAt: ISO(),
};

const DEMO_PACKAGES: TourPackage[] = [
  {
    packageId: 'pkg_danang_4d',
    title: 'Da Nang & Hoi An Heritage 4D3N',
    destination: 'Da Nang',
    durationDays: 4,
    baseCost: 320,
    sellingPrice: 489,
    currency: 'USD',
    availabilityStatus: 'Available',
    supplierCutoffAt: daysFromNow(6),
    season: 'Year-round',
    createdAt: ISO(),
    updatedAt: ISO(),
  },
  {
    packageId: 'pkg_sapa_3d',
    title: 'Sapa Trekking 3D2N',
    destination: 'Sapa',
    durationDays: 3,
    baseCost: 180,
    sellingPrice: 295,
    currency: 'USD',
    availabilityStatus: 'Limited',
    supplierCutoffAt: daysFromNow(2),
    season: 'Sep–Nov',
    createdAt: ISO(),
    updatedAt: ISO(),
  },
  {
    packageId: 'pkg_japan_7d',
    title: 'Japan Golden Route 7D6N',
    destination: 'Tokyo',
    durationDays: 7,
    baseCost: 1450,
    sellingPrice: 2190,
    currency: 'USD',
    availabilityStatus: 'On Request',
    supplierCutoffAt: daysFromNow(14),
    season: 'Mar–May',
    createdAt: ISO(),
    updatedAt: ISO(),
  },
  {
    packageId: 'pkg_phuquoc_5d',
    title: 'Phu Quoc Beach Escape 5D4N',
    destination: 'Phu Quoc',
    durationDays: 5,
    baseCost: 410,
    sellingPrice: 689,
    currency: 'USD',
    availabilityStatus: 'Available',
    supplierCutoffAt: daysFromNow(10),
    season: 'Nov–Apr',
    createdAt: ISO(),
    updatedAt: ISO(),
  },
];

const DEMO_LEADS: Lead[] = [
  {
    leadId: 'lead_001',
    agentId: DEMO_AGENT_ID,
    clientName: 'Mr. Tran Quoc Bao',
    agencyName: 'Saigon Travel Co.',
    destination: 'Da Nang',
    partySize: 4,
    budget: 1960,
    currency: 'USD',
    stage: 'Quote Sent',
    priorityScore: 82,
    expectedCloseDate: daysFromNow(3),
    quoteExpiryDate: hoursFromNow(3),
    source: 'Agency referral',
    nextActionAt: hoursFromNow(2),
    notes: 'Family trip, wants heritage + beach combo.',
    createdAt: daysFromNow(-5),
    updatedAt: daysFromNow(-1),
  },
  {
    leadId: 'lead_002',
    agentId: DEMO_AGENT_ID,
    clientName: 'Ms. Park Eunji',
    agencyName: 'Korea Tours Plus',
    destination: 'Tokyo',
    partySize: 6,
    budget: 13140,
    currency: 'USD',
    stage: 'Deposit Paid',
    priorityScore: 90,
    expectedCloseDate: daysFromNow(2),
    quoteExpiryDate: daysFromNow(1),
    source: 'Returning client',
    nextActionAt: hoursFromNow(1),
    notes: 'VIP group, needs deposit confirmation before supplier cutoff.',
    createdAt: daysFromNow(-8),
    updatedAt: daysFromNow(-2),
  },
  {
    leadId: 'lead_003',
    agentId: DEMO_AGENT_ID,
    clientName: 'Mr. Le Van Hung',
    destination: 'Sapa',
    partySize: 2,
    budget: 590,
    currency: 'USD',
    stage: 'Inquiry',
    priorityScore: 45,
    expectedCloseDate: daysFromNow(10),
    source: 'Website',
    nextActionAt: daysFromNow(1),
    notes: 'Honeymoon, flexible on dates.',
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    leadId: 'lead_004',
    agentId: DEMO_AGENT_ID,
    clientName: 'Ms. Nguyen Thi Mai',
    agencyName: 'Hanoi Holiday',
    destination: 'Phu Quoc',
    partySize: 5,
    budget: 3445,
    currency: 'USD',
    stage: 'Closed Won',
    priorityScore: 75,
    expectedCloseDate: daysFromNow(-1),
    source: 'Agency referral',
    notes: 'Confirmed, deposit received.',
    createdAt: daysFromNow(-12),
    updatedAt: daysFromNow(-3),
  },
  {
    leadId: 'lead_005',
    agentId: DEMO_AGENT_ID,
    clientName: 'Mr. Choi Minho',
    agencyName: 'Busan Express',
    destination: 'Da Nang',
    partySize: 3,
    budget: 1467,
    currency: 'USD',
    stage: 'Quote Sent',
    priorityScore: 58,
    expectedCloseDate: daysFromNow(5),
    quoteExpiryDate: daysFromNow(4),
    source: 'Walk-in',
    nextActionAt: daysFromNow(2),
    notes: 'Comparing with competitor quote.',
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-1),
  },
];

const DEMO_BOOKINGS: Booking[] = [
  {
    bookingId: 'book_001',
    leadId: 'lead_004',
    packageId: 'pkg_phuquoc_5d',
    totalAmount: 3445,
    depositAmount: 1000,
    amountPaid: 3445,
    balanceDueDate: daysFromNow(0),
    paymentStatus: 'Paid',
    bookingStatus: 'Confirmed',
    currency: 'USD',
    confirmedAt: daysFromNow(-3),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
  {
    bookingId: 'book_002',
    leadId: 'lead_002',
    packageId: 'pkg_japan_7d',
    totalAmount: 13140,
    depositAmount: 4000,
    amountPaid: 4000,
    balanceDueDate: daysFromNow(20),
    paymentStatus: 'Partial',
    bookingStatus: 'Confirmed',
    currency: 'USD',
    confirmedAt: daysFromNow(-2),
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    bookingId: 'book_003',
    leadId: 'lead_001',
    packageId: 'pkg_danang_4d',
    totalAmount: 1956,
    depositAmount: 0,
    amountPaid: 0,
    balanceDueDate: daysFromNow(7),
    paymentStatus: 'Unpaid',
    bookingStatus: 'Draft',
    currency: 'USD',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
];

// Simulated past confirmed bookings to populate revenue history
const DEMO_PAST_BOOKINGS: Booking[] = Array.from({ length: 6 }).map((_, i) => {
  const total = [3200, 4100, 5300, 6900, 7200, 8800][i];
  return {
    bookingId: `book_past_${i}`,
    leadId: `lead_past_${i}`,
    packageId: DEMO_PACKAGES[i % DEMO_PACKAGES.length].packageId,
    totalAmount: total,
    depositAmount: total,
    amountPaid: total,
    paymentStatus: 'Paid',
    bookingStatus: 'Completed',
    currency: 'USD' as Currency,
    confirmedAt: daysFromNow(-(i + 4)),
    createdAt: daysFromNow(-(i + 8)),
    updatedAt: daysFromNow(-(i + 4)),
  } as Booking;
});

const DEMO_TASKS: GsdTask[] = [
  {
    taskId: 'task_001',
    leadId: 'lead_001',
    agentId: DEMO_AGENT_ID,
    title: 'Follow up quote expiring today',
    description: 'Quote for Da Nang family trip expires in 3 hours.',
    taskType: 'Follow Up',
    urgencyLevel: 'P0',
    estimatedValue: 1956,
    estimatedMinutes: 10,
    dueAt: hoursFromNow(3),
    status: 'Open',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    taskId: 'task_002',
    leadId: 'lead_002',
    bookingId: 'book_002',
    agentId: DEMO_AGENT_ID,
    title: 'Confirm Japan deposit with supplier',
    description: 'Supplier cutoff approaching — deposit must be locked.',
    taskType: 'Supplier',
    urgencyLevel: 'P0',
    estimatedValue: 13140,
    estimatedMinutes: 15,
    dueAt: hoursFromNow(6),
    status: 'Open',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    taskId: 'task_003',
    leadId: 'lead_003',
    agentId: DEMO_AGENT_ID,
    title: 'Draft Sapa honeymoon itinerary',
    taskType: 'Itinerary',
    urgencyLevel: 'P2',
    estimatedValue: 590,
    estimatedMinutes: 45,
    dueAt: daysFromNow(3),
    status: 'Open',
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    taskId: 'task_004',
    leadId: 'lead_005',
    agentId: DEMO_AGENT_ID,
    title: 'Send revised quote to Busan Express',
    taskType: 'Quote',
    urgencyLevel: 'P1',
    estimatedValue: 1467,
    estimatedMinutes: 20,
    dueAt: daysFromNow(1),
    status: 'Open',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    taskId: 'task_005',
    agentId: DEMO_AGENT_ID,
    title: 'Check visa documentation for Japan group',
    taskType: 'Visa',
    urgencyLevel: 'P1',
    estimatedValue: 13140,
    estimatedMinutes: 30,
    dueAt: daysFromNow(4),
    status: 'Open',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    taskId: 'task_006',
    leadId: 'lead_004',
    bookingId: 'book_001',
    agentId: DEMO_AGENT_ID,
    title: 'Send final itinerary to Phu Quoc client',
    taskType: 'Itinerary',
    urgencyLevel: 'P1',
    estimatedValue: 3445,
    estimatedMinutes: 25,
    dueAt: daysFromNow(-1),
    status: 'Completed',
    completedAt: daysFromNow(-1),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-1),
  },
];

const DEMO_SETTINGS: Settings = {
  id: 'settings_default',
  agentId: DEMO_AGENT_ID,
  language: 'en',
  theme: 'system',
  reportingCurrency: 'USD',
  sellingDaysTotal: 22,
  sellingDaysElapsed: 12,
  revenueRecognition: 'on_confirmation',
  marginFloorPercent: 15,
  p0Threshold: 80,
  p1Threshold: 50,
  createdAt: ISO(),
  updatedAt: ISO(),
};

export async function seedDemoData(force = false): Promise<void> {
  const existingAgent = await db.agents.get(DEMO_AGENT_ID);
  if (existingAgent && !force) return;

  if (force) {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
  }

  await db.transaction('rw', [db.agents, db.leads, db.packages, db.bookings, db.tasks, db.settings], async () => {
    await db.agents.put(DEMO_AGENT);
    await db.packages.bulkPut(DEMO_PACKAGES);
    await db.leads.bulkPut(DEMO_LEADS);
    await db.bookings.bulkPut([...DEMO_PAST_BOOKINGS, ...DEMO_BOOKINGS]);
    await db.tasks.bulkPut(DEMO_TASKS);
    await db.settings.put(DEMO_SETTINGS);
  });
}

export async function resetDemoData(): Promise<void> {
  await seedDemoData(true);
}

export async function isSeeded(): Promise<boolean> {
  const count = await db.agents.count();
  return count > 0;
}

export const DEMO_DATA_LABEL = 'Demo Data';
