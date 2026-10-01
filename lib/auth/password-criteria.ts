/**
 * Kriteria password — dipakai halaman set-password (dan nanti reset-password).
 * Disimpan terpusat agar aturan selalu konsisten.
 */
export interface PasswordCriterion {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'symbol';
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_CRITERIA: PasswordCriterion[] = [
  { id: 'length', label: 'Minimal 8 karakter', test: (v) => v.length >= 8 },
  { id: 'uppercase', label: 'Mengandung huruf besar (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: 'Mengandung huruf kecil (a-z)', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'Mengandung angka (0-9)', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'Mengandung simbol (!@#$%^&* dsb.)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export interface CriteriaStatus {
  id: PasswordCriterion['id'];
  label: string;
  met: boolean;
}

export function checkPassword(password: string): { items: CriteriaStatus[]; allMet: boolean } {
  const items = PASSWORD_CRITERIA.map((c) => ({ id: c.id, label: c.label, met: c.test(password) }));
  return { items, allMet: items.every((i) => i.met) };
}
