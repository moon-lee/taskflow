export type BpStatus = 'low' | 'normal' | 'elevated' | 'stage1' | 'stage2';

export const STATUS_LABELS: Record<BpStatus, string> = {
  low: 'Low',
  normal: 'Normal',
  elevated: 'Elevated',
  stage1: 'Stage 1',
  stage2: 'Stage 2',
};

export const STATUS_COLORS: Record<BpStatus, string> = {
  low: '#5AC8FA',
  normal: '#34C759',
  elevated: '#FF9500',
  stage1: '#FF3B30',
  stage2: '#B71C1C',
};

export function classifyStatus(sys: number, dia: number): BpStatus {
  if (sys < 90 || dia < 60) return 'low';
  if (sys >= 140 || dia >= 90) return 'stage2';
  if (sys >= 130 || dia >= 80) return 'stage1';
  if (sys >= 120) return 'elevated';
  return 'normal';
}

export interface FieldErrors {
  sys?: string;
  dia?: string;
  takenAt?: string;
}

export function validateReading(
  sys: unknown,
  dia: unknown,
  takenAt: unknown,
): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!Number.isInteger(sys) || (sys as number) < 40 || (sys as number) > 300) {
    errors.sys = 'SYS must be a whole number 40–300';
  }
  if (!Number.isInteger(dia) || (dia as number) < 20 || (dia as number) > 200) {
    errors.dia = 'DIA must be a whole number 20–200';
  }
  const t = Date.parse(String(takenAt ?? ''));
  if (!Number.isFinite(t)) {
    errors.takenAt = 'Date/time is not valid';
  } else if (t > Date.now()) {
    errors.takenAt = 'Date/time cannot be in the future';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function averages(
  readings: Array<{ sys: number; dia: number; taken_at: string }>,
): { avgSys: number; avgDia: number; daysRecorded: number } {
  if (readings.length === 0) return { avgSys: 0, avgDia: 0, daysRecorded: 0 };
  const sys = readings.reduce((n, r) => n + Number(r.sys), 0) / readings.length;
  const dia = readings.reduce((n, r) => n + Number(r.dia), 0) / readings.length;
  const days = new Set(readings.map((r) => String(r.taken_at).slice(0, 10)));
  return {
    avgSys: Math.round(sys),
    avgDia: Math.round(dia),
    daysRecorded: days.size,
  };
}
