export type Currency = 'VND' | 'USD' | 'KRW' | 'JPY';

export type LeadStage = 'Inquiry' | 'Quote Sent' | 'Deposit Paid' | 'Closed Won' | 'Lost';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded';

export type BookingStatus = 'Draft' | 'Confirmed' | 'Cancelled' | 'Completed';

export type AvailabilityStatus = 'Available' | 'Limited' | 'Sold Out' | 'On Request';

export type TaskType =
  | 'Follow Up'
  | 'Quote'
  | 'Deposit'
  | 'Itinerary'
  | 'Visa'
  | 'Supplier'
  | 'Custom';

export type UrgencyLevel = 'P0' | 'P1' | 'P2';

export type TaskStatus = 'Open' | 'Completed' | 'Deferred' | 'Cancelled';

export interface Agent {
  agentId: string;
  name: string;
  monthlyRevenueTarget: number;
  commissionRate: number;
  currency: Currency;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  leadId: string;
  agentId: string;
  clientName: string;
  agencyName?: string;
  destination: string;
  partySize: number;
  budget: number;
  currency: Currency;
  stage: LeadStage;
  priorityScore: number;
  expectedCloseDate?: string;
  quoteExpiryDate?: string;
  source?: string;
  nextActionAt?: string;
  notes?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TourPackage {
  packageId: string;
  title: string;
  destination: string;
  durationDays: number;
  baseCost: number;
  sellingPrice: number;
  currency: Currency;
  availabilityStatus: AvailabilityStatus;
  supplierCutoffAt?: string;
  season?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  bookingId: string;
  leadId: string;
  packageId?: string;
  totalAmount: number;
  depositAmount: number;
  amountPaid: number;
  balanceDueDate?: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  currency: Currency;
  confirmedAt?: string;
  paymentLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GsdTask {
  taskId: string;
  leadId?: string;
  bookingId?: string;
  agentId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  urgencyLevel: UrgencyLevel;
  estimatedValue: number;
  estimatedMinutes: number;
  dueAt?: string;
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  agentId: string;
  language: 'vi' | 'en';
  theme: 'light' | 'dark' | 'system';
  reportingCurrency: Currency;
  sellingDaysTotal: number;
  sellingDaysElapsed: number;
  revenueRecognition: 'on_deposit' | 'on_confirmation' | 'on_full_payment';
  marginFloorPercent: number;
  p0Threshold: number;
  p1Threshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountAudit {
  id: string;
  bookingId?: string;
  leadId?: string;
  originalPrice: number;
  discountPercent: number;
  finalPrice: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
}
