import {
  format,
  subDays,
  subMonths,
  subYears,
  startOfWeek,
  startOfMonth,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/** Rentang waktu yang bisa dipilih lewat tab. */
export type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y';

/** Granularitas bucket — tidak lagi dipilih user, diturunkan dari range. */
export type AggKey = 'day' | 'week' | 'month';

export interface RangeOption {
  value: RangeKey;
  /** Label pendek untuk tab, mis. "30 Hari". */
  label: string;
  /** Kalimat lengkap untuk subtitle, mis. "dalam 30 hari terakhir". */
  phrase: string;
}

export const RANGE_OPTIONS: RangeOption[] = [
  { value: '7d', label: '7 Hari', phrase: 'dalam 7 hari terakhir' },
  { value: '30d', label: '30 Hari', phrase: 'dalam 30 hari terakhir' },
  { value: '90d', label: '3 Bulan', phrase: 'dalam 3 bulan terakhir' },
  { value: '6m', label: '6 Bulan', phrase: 'dalam 6 bulan terakhir' },
  { value: '1y', label: '1 Tahun', phrase: 'dalam 1 tahun terakhir' },
];

/**
 * Granularitas otomatis supaya label sumbu tetap terbaca: bucket per-hari
 * untuk rentang pendek, per-minggu untuk 3 bulan, per-bulan untuk 6 bulan
 * ke atas. Tanpa ini, 90 hari × per-hari jadi 90 bar bertumpuk.
 */
export function autoAgg(range: RangeKey): AggKey {
  switch (range) {
    case '7d':
    case '30d':
      return 'day';
    case '90d':
      return 'week';
    case '6m':
    case '1y':
      return 'month';
  }
}

export function getRangeOption(range: RangeKey): RangeOption {
  return RANGE_OPTIONS.find((r) => r.value === range) ?? RANGE_OPTIONS[2];
}

export function getStartDate(range: RangeKey): Date {
  const now = new Date();
  switch (range) {
    case '7d':
      return subDays(now, 7);
    case '30d':
      return subDays(now, 30);
    case '90d':
      return subDays(now, 90);
    case '6m':
      return subMonths(now, 6);
    case '1y':
      return subYears(now, 1);
  }
}

export function getPeriodKey(d: Date, agg: AggKey): string {
  switch (agg) {
    case 'day':
      return format(d, 'dd MMM', { locale: localeId });
    case 'week':
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'dd MMM', { locale: localeId });
    case 'month':
      return format(d, 'MMM yy', { locale: localeId });
  }
}

/**
 * Parse tanggal `YYYY-MM-DD` dari server menjadi `Date` **lokal**.
 *
 * `new Date('2026-10-03')` di-parse sebagai tengah malam UTC, sehingga di
 * zona waktu negatif tanggalnya bergeser ke hari sebelumnya — dan satu hari
 * salah sudah cukup untuk menggeser seluruh bucket mingguan. Jadi komponen
 * tanggalnya dirakit manual.
 */
export function parseChartDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Daftar label periode yang berurutan, untuk.sumbu X. */
export function buildPeriods(start: Date, end: Date, agg: AggKey): string[] {
  switch (agg) {
    case 'day': {
      const ms = 24 * 60 * 60 * 1000;
      const days = Math.ceil((end.getTime() - start.getTime()) / ms);
      return Array.from({ length: days + 1 }, (_, i) =>
        getPeriodKey(new Date(start.getTime() + i * ms), 'day'),
      );
    }
    case 'week':
      return eachWeekOfInterval(
        { start: startOfWeek(start, { weekStartsOn: 1 }), end },
        { weekStartsOn: 1 },
      ).map((d) => getPeriodKey(d, 'week'));
    case 'month':
      return eachMonthOfInterval({ start: startOfMonth(start), end }).map((d) =>
        getPeriodKey(d, 'month'),
      );
  }
}