import type { DiscountAudit, TourPackage } from '@/domain/types';
import { discountAuditRepo } from '@/data/repositories';
import { grossMarginPct, round2 } from '@/domain/calculations';

export interface DiscountRequest {
  originalPrice: number;
  discountPercent: number;
  marginFloorPercent: number;
  baseCost: number;
  leadId?: string;
  bookingId?: string;
  reason: string;
  approvedBy: string;
}

export interface DiscountResult {
  ok: boolean;
  finalPrice: number;
  discountAmount: number;
  marginPctAfter: number;
  audit?: DiscountAudit;
  error?: string;
}

export async function applySeasonalDiscount(req: DiscountRequest): Promise<DiscountResult> {
  const discountAmount = round2(req.originalPrice * (req.discountPercent / 100));
  const finalPrice = round2(req.originalPrice - discountAmount);
  const marginPctAfter = req.baseCost > 0 ? round2(((finalPrice - req.baseCost) / finalPrice) * 100) : 0;

  if (marginPctAfter < req.marginFloorPercent) {
    return {
      ok: false,
      finalPrice,
      discountAmount,
      marginPctAfter,
      error: `Margin ${marginPctAfter.toFixed(1)}% below floor ${req.marginFloorPercent}%`,
    };
  }

  const audit = await discountAuditRepo.create({
    bookingId: req.bookingId,
    leadId: req.leadId,
    originalPrice: req.originalPrice,
    discountPercent: req.discountPercent,
    finalPrice,
    reason: req.reason,
    approvedBy: req.approvedBy,
  });

  return { ok: true, finalPrice, discountAmount, marginPctAfter, audit };
}

export function packageMarginCheck(pkg: TourPackage, marginFloor: number): { ok: boolean; marginPct: number } {
  const m = grossMarginPct(pkg);
  return { ok: m >= marginFloor, marginPct: m };
}
