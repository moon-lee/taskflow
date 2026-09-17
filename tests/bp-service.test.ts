import { describe, it, expect } from 'vitest';
import {
  classifyStatus,
  validateReading,
  averages,
} from '../src/services/bp-service.js';

describe('classifyStatus', () => {
  it('normal when sys<120 and dia<80', () => {
    expect(classifyStatus(118, 76)).toBe('normal');
  });
  it('elevated when sys 120-129 and dia<80', () => {
    expect(classifyStatus(125, 78)).toBe('elevated');
  });
  it('stage1 when sys 130-139 or dia 80-89', () => {
    expect(classifyStatus(135, 82)).toBe('stage1');
  });
  it('stage2 when sys>=140 or dia>=90', () => {
    expect(classifyStatus(145, 88)).toBe('stage2');
    expect(classifyStatus(130, 95)).toBe('stage2');
  });
  it('low when sys<90 or dia<60', () => {
    expect(classifyStatus(85, 70)).toBe('low');
  });
});

describe('validateReading', () => {
  it('accepts a valid reading', () => {
    expect(validateReading(120, 80, '2026-09-10T08:00').ok).toBe(true);
  });
  it('rejects out-of-range sys', () => {
    const r = validateReading(320, 80, '2026-09-10T08:00');
    expect(r.ok).toBe(false);
    expect(r.errors.sys).toBeTruthy();
  });
  it('rejects a future taken_at', () => {
    const r = validateReading(120, 80, '2999-01-01T08:00');
    expect(r.ok).toBe(false);
    expect(r.errors.takenAt).toBeTruthy();
  });
});

describe('averages', () => {
  it('computes avg sys/dia and day count', () => {
    expect(
      averages([
        { sys: 120, dia: 80, taken_at: '2026-09-16T08:00' },
        { sys: 130, dia: 70, taken_at: '2026-09-17T08:00' },
      ]),
    ).toEqual({ avgSys: 125, avgDia: 75, daysRecorded: 2 });
  });
});
