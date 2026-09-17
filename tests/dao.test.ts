import { describe, it, expect } from 'vitest';
import { listReadings, createReading, updateReading, deleteReading } from '../src/dao/readings.js';

type Row = Record<string, unknown> & { id: number };

function mockFinance(seedReadings: Row[] = [], seedTodos: Row[] = []) {
  const readings = seedReadings.map((r) => ({ ...r }));
  const todos = seedTodos.map((r) => ({ ...r }));
  const storeFor = (name: string): Row[] => {
    if (name === 'taskflow_bp_readings') return readings;
    if (name === 'taskflow_todos') return todos;
    throw new Error(`TableAccessDenied: ${name}`);
  };
  return {
    db: {
      table: (name: string) => {
        const rows = storeFor(name);
        return {
          find: async () => rows.slice(),
          insert: async (input: Record<string, unknown>) => {
            const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
            rows.push({ id, ...input });
            return { id };
          },
          update: async (filter: { id: number }, patch: Record<string, unknown>) => {
            const row = rows.find((r) => r.id === filter.id);
            if (row) Object.assign(row, patch);
            return { affected: row ? 1 : 0 };
          },
          delete: async (filter: { id: number }) => {
            const ix = rows.findIndex((r) => r.id === filter.id);
            if (ix >= 0) rows.splice(ix, 1);
            return { affected: ix >= 0 ? 1 : 0 };
          },
          count: async () => rows.length,
        };
      },
    },
  };
}

describe('readings dao', () => {
  it('lists newest first', async () => {
    const finance = mockFinance([
      { id: 1, sys: 120, dia: 80, taken_at: '2026-09-10T08:00' },
      { id: 2, sys: 130, dia: 85, taken_at: '2026-09-12T08:00' },
    ]);
    const rows = await listReadings(finance);
    expect(rows.map((r) => r.id)).toEqual([2, 1]);
  });

  it('creates then updates then deletes', async () => {
    const finance = mockFinance();
    const id = await createReading(finance, { sys: 120, dia: 80, taken_at: '2026-09-12T08:00' });
    expect(id).toBe(1);
    await updateReading(finance, id, { sys: 125, dia: 82, taken_at: '2026-09-12T08:00' });
    expect((await listReadings(finance))[0].sys).toBe(125);
    await deleteReading(finance, id);
    expect(await listReadings(finance)).toEqual([]);
  });
});

describe('todos dao', () => {
  it('creates and lists undone-first, due-date ASC nulls-last', async () => {
    const { listTodos, createTodo } = await import('../src/dao/todos.js');
    const finance = mockFinance();
    await createTodo(finance, { title: 'done late', is_done: true, due_date: '2026-09-10', priority: 'low' });
    await createTodo(finance, { title: 'no due', is_done: false, due_date: null, priority: 'medium' });
    await createTodo(finance, { title: 'due soon', is_done: false, due_date: '2026-09-12', priority: 'high' });
    const rows = await listTodos(finance);
    expect(rows.map((r) => r.title)).toEqual(['due soon', 'no due', 'done late']);
  });
});
