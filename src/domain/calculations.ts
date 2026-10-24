import type {
  Agent,
  Booking,
  Currency,
  Lead,
  PaymentStatus,
  Settings,
  TourPackage,
} from './types';

export function grossProfit(pkg: TourPackage): number {
  return pkg.sellingPrice - pkg.baseCost;
}

export function grossMarginPct(pkg: TourPackage): number {
  if (pkg.sellingPrice <= 0) return 0;
  return (grossProfit(pkg) / pkg.sellingPrice) * 100;
}

export function outstandingBalance(booking: Booking): number {
  return Math.max(0, booking.totalAmount - booking.amountPaid);
}

export function revenueAttainment(actual: number, target: number): number {
  if (target <= 0) return 0;
  return (actual / target) * 100;
}

export function revenueGap(target: number, actual: number): number {
  return Math.max(0, target - actual);
}

export function requiredDailyPace(gap: number, remainingDays: number): number {
  if (remainingDays <= 0) return gap > 0 ? Infinity : 0;
  return gap / remainingDays;
}

export function earnedCommission(
  commissionableRevenue: number,
  rate: number,
): number {
  return commissionableRevenue * rate;
}

export function quoteConversionRate(won: number, eligible: number): number {
  if (eligible <= 0) return 0;
  return won / eligible;
}

export function computePaymentStatus(
  total: number,
  paid: number,
): PaymentStatus {
  if (paid <= 0) return 'Unpaid';
  if (paid >= total) return 'Paid';
  return 'Partial';
}

export interface RevenueSummary {
  confirmedRevenue: number;
  quotedValue: number;
  forecastValue: number;
  cashCollected: number;
  commissionableRevenue: number;
  earnedCommission: number;
  estimatedCommissionAtTarget: number;
  qualifiedLeads: number;
  quotesSent: number;
  confirmedBookings: number;
  conversionRate: number;
  attainmentPct: number;
  revenueGap: number;
  remainingDays: number;
  requiredPace: number;
  avgInquiryToBookingDays: number | null;
}

export function summarizeRevenue(
  agent: Agent,
  leads: Lead[],
  bookings: Booking[],
  settings: Settings,
  now: Date = new Date(),
): RevenueSummary {
  const recognized = bookings.filter((b) => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed');

  const confirmedRevenue = recognized.reduce((sum, b) => {
    if (settings.revenueRecognition === 'on_full_payment') {
      return b.paymentStatus === 'Paid' ? sum + b.totalAmount : sum;
    }
    if (settings.revenueRecognition === 'on_deposit') {
      return sum + b.amountPaid;
    }
    // on_confirmation
    return sum + b.totalAmount;
  }, 0);

  const cashCollected = recognized.reduce((sum, b) => sum + b.amountPaid, 0);
  const commissionableRevenue =
    settings.revenueRecognition === 'on_deposit' ? cashCollected : confirmedRevenue;

  const earnedCommissionValue = earnedCommission(commissionableRevenue, agent.commissionRate);
  const estimatedCommissionAtTarget = agent.monthlyRevenueTarget * agent.commissionRate;

  const qualifiedLeads = leads.filter((l) => l.stage !== 'Lost').length;
  const quotesSent = leads.filter((l) =>
    ['Quote Sent', 'Deposit Paid', 'Closed Won'].includes(l.stage),
  ).length;
  const confirmedBookings = recognized.length;
  const quotedValue = leads
    .filter((l) => ['Quote Sent', 'Deposit Paid', 'Closed Won'].includes(l.stage))
    .reduce((sum, l) => sum + l.budget, 0);

  const weightedForecast = leads
    .filter((l) => ['Inquiry', 'Quote Sent', 'Deposit Paid'].includes(l.stage))
    .reduce((sum, l) => sum + l.budget * (l.priorityScore / 100), 0);

  const eligible = leads.filter((l) => l.stage !== 'Inquiry').length;
  const won = leads.filter((l) => l.stage === 'Closed Won').length;
  const conversionRate = quoteConversionRate(won, eligible);

  const attainmentPct = revenueAttainment(confirmedRevenue, agent.monthlyRevenueTarget);
  const gap = revenueGap(agent.monthlyRevenueTarget, confirmedRevenue);

  const remainingDays = Math.max(0, settings.sellingDaysTotal - settings.sellingDaysElapsed);
  const requiredPace = requiredDailyPace(gap, remainingDays);

  const closedLeads = leads.filter((l) => l.stage === 'Closed Won');
  const daysToClose: number[] = [];
  for (const l of closedLeads) {
    const created = new Date(l.createdAt).getTime();
    const closed = new Date(l.updatedAt).getTime();
    const days = (closed - created) / (1000 * 60 * 60 * 24);
    if (days >= 0) daysToClose.push(days);
  }
  const avgInquiryToBookingDays =
    daysToClose.length > 0
      ? daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length
      : null;

  void now;

  return {
    confirmedRevenue,
    quotedValue,
    forecastValue: weightedForecast,
    cashCollected,
    commissionableRevenue,
    earnedCommission: earnedCommissionValue,
    estimatedCommissionAtTarget,
    qualifiedLeads,
    quotesSent,
    confirmedBookings,
    conversionRate,
    attainmentPct,
    revenueGap: gap,
    remainingDays,
    requiredPace,
    avgInquiryToBookingDays,
  };
}

export function formatCurrency(value: number, currency: Currency, locale: string = 'en'): string {
  if (!isFinite(value)) return '∞';
  const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
      notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(loc)}`;
  }
}

export function formatDate(value?: string, locale: string = 'en'): string {
  if (!value) return '—';
  const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
  try {
    return new Intl.DateTimeFormat(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string, locale: string = 'en'): string {
  if (!value) return '—';
  const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
  try {
    return new Intl.DateTimeFormat(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function daysUntil(value?: string, now: Date = new Date()): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (isNaN(target)) return null;
  const diff = target - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function hoursUntil(value?: string, now: Date = new Date()): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (isNaN(target)) return null;
  const diff = target - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
}
