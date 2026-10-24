import { z } from 'zod';

const isoString = z.string().min(1);
const idString = z.string().min(1);

export const agentSchema = z.object({
  agentId: idString,
  name: z.string().min(1),
  monthlyRevenueTarget: z.number().nonnegative(),
  commissionRate: z.number().min(0).max(1),
  currency: z.enum(['VND', 'USD', 'KRW', 'JPY']),
  active: z.boolean(),
  createdAt: isoString,
  updatedAt: isoString,
});

export const leadSchema = z.object({
  leadId: idString,
  agentId: idString,
  clientName: z.string().min(1),
  agencyName: z.string().optional(),
  destination: z.string().min(1),
  partySize: z.number().int().positive(),
  budget: z.number().nonnegative(),
  currency: z.enum(['VND', 'USD', 'KRW', 'JPY']),
  stage: z.enum(['Inquiry', 'Quote Sent', 'Deposit Paid', 'Closed Won', 'Lost']),
  priorityScore: z.number().min(0).max(100),
  expectedCloseDate: isoString.optional(),
  quoteExpiryDate: isoString.optional(),
  source: z.string().optional(),
  nextActionAt: isoString.optional(),
  notes: z.string().optional(),
  createdAt: isoString,
  updatedAt: isoString,
});

export const packageSchema = z.object({
  packageId: idString,
  title: z.string().min(1),
  destination: z.string().min(1),
  durationDays: z.number().int().positive(),
  baseCost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  currency: z.enum(['VND', 'USD', 'KRW', 'JPY']),
  availabilityStatus: z.enum(['Available', 'Limited', 'Sold Out', 'On Request']),
  supplierCutoffAt: isoString.optional(),
  season: z.string().optional(),
  createdAt: isoString,
  updatedAt: isoString,
});

export const bookingSchema = z.object({
  bookingId: idString,
  leadId: idString,
  packageId: idString.optional(),
  totalAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  balanceDueDate: isoString.optional(),
  paymentStatus: z.enum(['Unpaid', 'Partial', 'Paid', 'Refunded']),
  bookingStatus: z.enum(['Draft', 'Confirmed', 'Cancelled', 'Completed']),
  currency: z.enum(['VND', 'USD', 'KRW', 'JPY']),
  confirmedAt: isoString.optional(),
  paymentLink: z.string().url()
    .refine((url) => /^https?:\/\//i.test(url), { message: 'Must be an HTTP or HTTPS URL' })
    .optional()
    .or(z.literal('')),
  createdAt: isoString,
  updatedAt: isoString,
});

export const taskSchema = z.object({
  taskId: idString,
  leadId: idString.optional(),
  bookingId: idString.optional(),
  agentId: idString,
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.enum(['Follow Up', 'Quote', 'Deposit', 'Itinerary', 'Visa', 'Supplier', 'Custom']),
  urgencyLevel: z.enum(['P0', 'P1', 'P2']),
  estimatedValue: z.number().nonnegative(),
  estimatedMinutes: z.number().int().positive(),
  dueAt: isoString.optional(),
  status: z.enum(['Open', 'Completed', 'Deferred', 'Cancelled']),
  completedAt: isoString.optional(),
  createdAt: isoString,
  updatedAt: isoString,
});

export const settingsSchema = z.object({
  id: idString,
  agentId: idString,
  language: z.enum(['vi', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
  reportingCurrency: z.enum(['VND', 'USD', 'KRW', 'JPY']),
  sellingDaysTotal: z.number().int().positive(),
  sellingDaysElapsed: z.number().int().min(0),
  revenueRecognition: z.enum(['on_deposit', 'on_confirmation', 'on_full_payment']),
  marginFloorPercent: z.number().min(0).max(100),
  p0Threshold: z.number().min(0).max(100),
  p1Threshold: z.number().min(0).max(100),
  createdAt: isoString,
  updatedAt: isoString,
});

export const discountAuditSchema = z.object({
  id: idString,
  bookingId: idString.optional(),
  leadId: idString.optional(),
  originalPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100),
  finalPrice: z.number().nonnegative(),
  reason: z.string().min(1),
  approvedBy: z.string().min(1),
  createdAt: isoString,
});

export const importSchema = z.object({
  version: z.number(),
  exportedAt: isoString,
  agents: z.array(agentSchema).optional().default([]),
  leads: z.array(leadSchema).optional().default([]),
  packages: z.array(packageSchema).optional().default([]),
  bookings: z.array(bookingSchema).optional().default([]),
  tasks: z.array(taskSchema).optional().default([]),
  settings: z.array(settingsSchema).optional().default([]),
  discountAudits: z.array(discountAuditSchema).optional().default([]),
});
