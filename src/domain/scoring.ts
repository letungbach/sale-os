import type { GsdTask, Lead, Booking, UrgencyLevel } from './types';
import { hoursUntil, daysUntil } from './calculations';

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  max: number;
  explanation: string;
}

export interface ScoredTask {
  task: GsdTask;
  totalScore: number;
  priority: UrgencyLevel;
  components: ScoreComponent[];
  explanation: string;
  recommendedAction: string;
  warnings: string[];
  isOverdue: boolean;
  criticalOverride: boolean;
}

export interface ScoreConfig {
  p0Threshold: number;
  p1Threshold: number;
  now?: Date;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  p0Threshold: 80,
  p1Threshold: 50,
};

export function scoreTask(
  task: GsdTask,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): ScoredTask {
  const now = config.now ?? new Date();
  const warnings: string[] = [];

  // 1. Deadline urgency (0-30)
  let urgencyScore = 0;
  let urgencyExp = '';
  const hours = hoursUntil(task.dueAt, now);
  const days = daysUntil(task.dueAt, now);
  const isOverdue = hours !== null && hours < 0;
  if (hours === null) {
    urgencyScore = 5;
    urgencyExp = 'No due date set.';
  } else if (hours < 0) {
    urgencyScore = 30;
    urgencyExp = `Overdue by ${Math.abs(hours!)}h.`;
  } else if (hours <= 4) {
    urgencyScore = 30;
    urgencyExp = `Due in ${hours}h — critical window.`;
  } else if (hours <= 24) {
    urgencyScore = 24;
    urgencyExp = `Due today (${hours}h remaining).`;
  } else if (days !== null && days <= 3) {
    urgencyScore = 18;
    urgencyExp = `Due in ${days}d.`;
  } else if (days !== null && days <= 7) {
    urgencyScore = 12;
    urgencyExp = `Due in ${days}d.`;
  } else if (days !== null && days <= 14) {
    urgencyScore = 6;
    urgencyExp = `Due in ${days}d.`;
  } else {
    urgencyScore = 2;
    urgencyExp = `Due in ${days}d.`;
  }

  // Critical deadline override for Supplier tasks overdue or due within 4h
  const criticalOverride =
    task.taskType === 'Supplier' && isOverdue;

  // 2. Financial impact (0-25) — log-scaled on estimated value
  let valueScore = 0;
  let valueExp = '';
  const v = task.estimatedValue;
  if (v <= 0) {
    valueScore = 0;
    valueExp = 'No estimated value.';
  } else if (v < 500) {
    valueScore = 4;
    valueExp = `Low value (~${v}).`;
  } else if (v < 2000) {
    valueScore = 10;
    valueExp = `Moderate value (~${v}).`;
  } else if (v < 10000) {
    valueScore = 18;
    valueExp = `High value (~${v}).`;
  } else {
    valueScore = 25;
    valueExp = `Very high value (~${v}).`;
  }

  // 3. Conversion likelihood / opportunity relevance (0-20)
  let convScore = 0;
  let convExp = '';
  switch (task.taskType) {
    case 'Deposit':
      convScore = 18;
      convExp = 'Deposit stage — high conversion impact.';
      break;
    case 'Quote':
      convScore = 14;
      convExp = 'Quote stage — significant conversion impact.';
      break;
    case 'Follow Up':
      convScore = 12;
      convExp = 'Follow-up — maintains pipeline momentum.';
      break;
    case 'Itinerary':
      convScore = 10;
      convExp = 'Itinerary — supports quote conversion.';
      break;
    case 'Visa':
      convScore = 8;
      convExp = 'Visa documentation — required for close.';
      break;
    case 'Supplier':
      convScore = 15;
      convExp = 'Supplier cutoff — direct loss risk.';
      break;
    default:
      convScore = 5;
      convExp = 'General task.';
  }

  // 4. Strategic / supplier-cutoff importance (0-15)
  let stratScore = 0;
  let stratExp = '';
  if (task.taskType === 'Supplier') {
    stratScore = 15;
    stratExp = 'Supplier cutoff — strategic risk.';
  } else if (task.taskType === 'Visa') {
    stratScore = 10;
    stratExp = 'Visa — strategic compliance.';
  } else if (task.taskType === 'Deposit') {
    stratScore = 8;
    stratExp = 'Deposit — revenue recognition impact.';
  } else {
    stratScore = 3;
    stratExp = 'Standard strategic weight.';
  }

  // 5. Time efficiency (0-10) — shorter tasks get higher scores
  let timeScore = 0;
  let timeExp = '';
  const m = task.estimatedMinutes;
  if (m <= 5) {
    timeScore = 10;
    timeExp = 'Quick win (<5 min).';
  } else if (m <= 15) {
    timeScore = 8;
    timeExp = 'Short task (~15 min).';
  } else if (m <= 30) {
    timeScore = 6;
    timeExp = 'Medium task (~30 min).';
  } else if (m <= 60) {
    timeScore = 4;
    timeExp = 'Longer task (~1h).';
  } else {
    timeScore = 2;
    timeExp = `Extended task (${m} min).`;
  }

  const components: ScoreComponent[] = [
    { key: 'urgency', label: 'Deadline Urgency', score: urgencyScore, max: 30, explanation: urgencyExp },
    { key: 'value', label: 'Financial Impact', score: valueScore, max: 25, explanation: valueExp },
    { key: 'conversion', label: 'Conversion Likelihood', score: convScore, max: 20, explanation: convExp },
    { key: 'strategic', label: 'Strategic Importance', score: stratScore, max: 15, explanation: stratExp },
    { key: 'time', label: 'Time Efficiency', score: timeScore, max: 10, explanation: timeExp },
  ];

  let totalScore = components.reduce((s, c) => s + c.score, 0);
  if (criticalOverride) {
    totalScore = Math.max(totalScore, 90);
  }

  let priority: UrgencyLevel;
  if (totalScore >= config.p0Threshold || criticalOverride) {
    priority = 'P0';
  } else if (totalScore >= config.p1Threshold) {
    priority = 'P1';
  } else {
    priority = 'P2';
  }

  if (!task.dueAt) warnings.push('No due date set — urgency estimate is low-confidence.');
  if (task.estimatedValue <= 0) warnings.push('No estimated value — financial impact unknown.');

  const explanation = `${priority} — ${task.title}. Score ${totalScore}/100 (${urgencyExp} ${valueExp} ${timeExp})`;

  const recommendedAction = recommendAction(task, priority);

  return {
    task,
    totalScore,
    priority,
    components,
    explanation,
    recommendedAction,
    warnings,
    isOverdue,
    criticalOverride,
  };
}

function recommendAction(task: GsdTask, priority: UrgencyLevel): string {
  switch (task.taskType) {
    case 'Follow Up':
      return priority === 'P0' ? 'Call or message the client immediately.' : 'Send a follow-up message today.';
    case 'Quote':
      return 'Prepare and send the quote before the deadline.';
    case 'Deposit':
      return 'Confirm deposit receipt and update payment status.';
    case 'Itinerary':
      return 'Complete the custom itinerary and share with the client.';
    case 'Visa':
      return 'Check visa documentation and required lead time.';
    case 'Supplier':
      return 'Contact the supplier before the cutoff to secure availability.';
    default:
      return 'Complete this task.';
  }
}

export function rankTasks(
  tasks: GsdTask[],
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): ScoredTask[] {
  const scored = tasks
    .filter((t) => t.status === 'Open')
    .map((t) => scoreTask(t, config));
  return scored.sort((a, b) => {
    // Tie-break: earliest deadline, then highest value, then creation time
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aDue = a.task.dueAt ? new Date(a.task.dueAt).getTime() : Infinity;
    const bDue = b.task.dueAt ? new Date(b.task.dueAt).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    if (b.task.estimatedValue !== a.task.estimatedValue) {
      return b.task.estimatedValue - a.task.estimatedValue;
    }
    return new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
  });
}

export function streakInfo(tasks: GsdTask[], now: Date = new Date()): { currentStreak: number; completedToday: number } {
  const completed = tasks.filter((t) => t.status === 'Completed' && t.completedAt);
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const todayStr = dateFormatter.format(now);
  const completedToday = completed.filter(
    (t) => dateFormatter.format(new Date(t.completedAt!)) === todayStr,
  ).length;

  // Count consecutive days with at least one completion, ending today or yesterday
  let currentStreak = 0;
  const dayMap = new Set(completed.map((t) => dateFormatter.format(new Date(t.completedAt!))));
  const [year, month, day] = todayStr.split('-').map(Number);
  const cursor = new Date(year, month - 1, day, 12);
  // allow streak to count from today backwards; if today has none, start from yesterday
  if (!dayMap.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayMap.has(dateFormatter.format(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { currentStreak, completedToday };
}

export function priorityGroup(scored: ScoredTask[]): Record<UrgencyLevel, ScoredTask[]> {
  return {
    P0: scored.filter((s) => s.priority === 'P0'),
    P1: scored.filter((s) => s.priority === 'P1'),
    P2: scored.filter((s) => s.priority === 'P2'),
  };
}

export function attachContext(
  scored: ScoredTask,
  leads: Lead[],
  bookings: Booking[],
): { lead?: Lead; booking?: Booking } {
  return {
    lead: scored.task.leadId ? leads.find((l) => l.leadId === scored.task.leadId) : undefined,
    booking: scored.task.bookingId
      ? bookings.find((b) => b.bookingId === scored.task.bookingId)
      : undefined,
  };
}
