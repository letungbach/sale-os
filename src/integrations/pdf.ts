import jsPDF from 'jspdf';
import type { Booking, Lead, TourPackage } from '@/domain/types';
import { formatCurrency, formatDate, outstandingBalance } from '@/domain/calculations';

export function generateItineraryPdf(
  lead: Lead,
  pkg: TourPackage | undefined,
  booking: Booking | undefined,
  agentName: string,
  locale: string = 'en',
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Phúc Gia Travel', M, y);
  y += 24;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(locale === 'vi' ? 'Lịch trình chuyến đi' : 'Trip Itinerary', M, y);
  y += 30;

  const section = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, M, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };
  const row = (label: string, value: string) => {
    doc.text(`${label}: ${value}`, M, y);
    y += 16;
  };

  section(locale === 'vi' ? 'Khách' : 'Client');
  row(locale === 'vi' ? 'Tên' : 'Name', lead.clientName);
  if (lead.agencyName) row(locale === 'vi' ? 'Đại lý' : 'Agency', lead.agencyName);
  row(locale === 'vi' ? 'Điểm đến' : 'Destination', lead.destination);
  row(locale === 'vi' ? 'Số người' : 'Party size', String(lead.partySize));
  y += 8;

  if (pkg) {
    section(locale === 'vi' ? 'Gói tour' : 'Package');
    row(locale === 'vi' ? 'Tên gói' : 'Title', pkg.title);
    row(locale === 'vi' ? 'Thời lượng' : 'Duration', `${pkg.durationDays} ${locale === 'vi' ? 'ngày' : 'days'}`);
    if (pkg.season) row(locale === 'vi' ? 'Mùa' : 'Season', pkg.season);
    row(locale === 'vi' ? 'Giá bán' : 'Selling price', formatCurrency(pkg.sellingPrice, pkg.currency, locale));
    y += 8;
  }

  if (booking) {
    section(locale === 'vi' ? 'Thanh toán' : 'Payment');
    row(locale === 'vi' ? 'Tổng tiền' : 'Total', formatCurrency(booking.totalAmount, booking.currency, locale));
    row(locale === 'vi' ? 'Đã thanh toán' : 'Paid', formatCurrency(booking.amountPaid, booking.currency, locale));
    row(locale === 'vi' ? 'Còn nợ' : 'Outstanding', formatCurrency(outstandingBalance(booking), booking.currency, locale));
    if (booking.balanceDueDate) row(locale === 'vi' ? 'Hạn nợ' : 'Balance due', formatDate(booking.balanceDueDate, locale));
    y += 8;
  }

  section(locale === 'vi' ? 'Bao gồm' : 'Inclusions');
  const incl = locale === 'vi'
    ? ['Khách sạn 4 sao, ăn sáng', 'Xe đưa đón sân bay', 'Hướng dẫn viên địa phương', 'Vé tham quan theo chương trình']
    : ['4-star hotel with breakfast', 'Airport transfers', 'Local guide', 'Sightseeing per itinerary'];
  incl.forEach((i) => { doc.text(`• ${i}`, M, y); y += 14; });
  y += 8;

  section(locale === 'vi' ? 'Không bao gồm' : 'Exclusions');
  const excl = locale === 'vi'
    ? ['Vé máy bay quốc tế', 'Visa & phí làm visa', 'Bảo hiểm du lịch', 'Chi tiêu cá nhân']
    : ['International airfare', 'Visa & visa fees', 'Travel insurance', 'Personal expenses'];
  excl.forEach((i) => { doc.text(`• ${i}`, M, y); y += 14; });
  y += 16;

  doc.setDrawColor(200);
  doc.line(M, y, W - M, y);
  y += 20;
  doc.setFontSize(9);
  doc.text(
    locale === 'vi' ? `Đại lý: ${agentName} — Phúc Gia Travel` : `Agent: ${agentName} — Phúc Gia Travel`,
    M, y,
  );
  y += 12;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    locale === 'vi' ? 'Tài liệu này chỉ mang tính tham khảo. Giá và điều kiện có thể thay đổi.' : 'This document is for reference only. Prices and terms may change.',
    M, y,
  );

  return doc;
}
