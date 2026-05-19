import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface LaunchReportData {
  date: Date;
  spend: number;
  currency: string;
  conversations: number;
  groupSignups: number;
  manychatCtr: number;
}

const fmtMoney = (n: number, currency: string) => {
  const symbol = currency === 'CRC' ? '₡' : '$';
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function computeCostPerSignup(spend: number, signups: number): number {
  return signups > 0 ? spend / signups : 0;
}

export function computeCostPerConversation(spend: number, conversations: number): number {
  return conversations > 0 ? spend / conversations : 0;
}

export function formatLaunchReport(
  data: LaunchReportData,
  prev?: { date: Date; costPerSignup: number } | null,
): string {
  const { date, spend, currency, conversations, groupSignups, manychatCtr } = data;
  const cps = computeCostPerSignup(spend, groupSignups);
  const cpc = computeCostPerConversation(spend, conversations);

  let comparison = '';
  if (prev && prev.costPerSignup > 0 && cps > 0) {
    const prevDay = cap(format(prev.date, 'EEEE', { locale: es }));
    if (cps < prev.costPerSignup) comparison = ` ✅ (bajó vs ${prevDay.toLowerCase()})`;
    else if (cps > prev.costPerSignup) comparison = ` ⚠️ (subió vs ${prevDay.toLowerCase()})`;
    else comparison = ` (igual vs ${prevDay.toLowerCase()})`;
  }

  const dateLabel = cap(format(date, "EEEE d 'de' MMMM", { locale: es }));

  return [
    `📊 Reporte ${dateLabel}`,
    '',
    `Ingresos al grupo: ${groupSignups} personas`,
    '',
    `💰 Inversión del día: ${fmtMoney(spend, currency)}`,
    `Costo por conversación: ${fmtMoney(cpc, currency)} (${conversations} conversaciones)`,
    `Costo por ingreso: ${fmtMoney(cps, currency)}${comparison}`,
    `📲 CTR Manychat: ${manychatCtr.toFixed(1)}%`,
  ].join('\n');
}
