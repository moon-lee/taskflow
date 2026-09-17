import { describe, it, expect } from 'vitest';
import { validateTodo, toggleTodo } from '../src/services/todo-service.js';

function mockTodos(rows: Array<{ id: number; title: string; is_done: boolean; due_date: string | null; priority: string }> = []) {
  const data = rows.map((r) => ({ ...r }));
  return {
    db: {
      table: (name: string) => {
        if (name !== 'taskflow_todos') throw new Error(`TableAccessDenied: ${name}`);
        return {
          find: async () => data.slice(),
          insert: async (input: Record<string, unknown>) => {
            const id = Math.max(0, ...data.map((r) => r.id)) + 1;
            data.push({ id, ...(input as { title: string; is_done: boolean; due_date: string | null; priority: string }) });
            return { id };
          },
          update: async (filter: { id: number }, patch: Record<string, unknown>) => {
            const row = data.find((r) => r.id === filter.id);
            if (row) Object.assign(row, patch);
            return { affected: row ? 1 : 0 };
          },
          delete: async (filter: { id: number }) => {
            const ix = data.findIndex((r) => r.id === filter.id);
            if (ix >= 0) data.splice(ix, 1);
            return { affected: ix >= 0 ? 1 : 0 };
          },
          count: async () => data.length,
        };
      },
    },
  };
}

describe('validateTodo', () => {
  it('accepts a full valid todo', () => {
    expect(validateTodo('Buy milk', '2026-09-20', 'high').ok).toBe(true);
  });

  it('accepts title-only (nulls use column defaults)', () => {
    expect(validateTodo('Buy milk', null, 'medium').ok).toBe(true);
  });

  it('rejects an empty title', () => {
    const r = validateTodo('   ', null, 'medium');
    expect(r.ok).toBe(false);
    expect(r.errors.title).toBeTruthy();
  });

  it('rejects an unknown priority', () => {
    const r = validateTodo('Buy milk', null, 'urgent');
    expect(r.ok).toBe(false);
    expect(r.errors.priority).toBeTruthy();
  });

  it('rejects a malformed due date', () => {
    const r = validateTodo('Buy milk', 'next friday', 'low');
    expect(r.ok).toBe(false);
    expect(r.errors.dueDate).toBeTruthy();
  });
});

describe('toggleTodo', () => {
  it('flips is_done false → true → false', async () => {
    const finance = mockTodos([{ id: 1, title: 'Buy milk', is_done: false, due_date: null, priority: 'medium' }]);
    expect(await toggleTodo(finance, 1)).toBe(true);
    expect(await toggleTodo(finance, 1)).toBe(false);
  });

  it('throws when the id does not exist', async () => {
    await expect(toggleTodo(mockTodos(), 99)).rejects.toThrow('not found');
  });
});

describe('rename + clear + counts', () => {
  it('renameTodo rewrites the title', async () => {
    const { renameTodo } = await import('../src/services/todo-service.js');
    const finance = mockTodos([{ id: 1, title: 'Buy milk', is_done: false, due_date: null, priority: 'medium' }]);
    await renameTodo(finance, 1, 'Buy oat milk');
    const rows = (await (finance.db.table('taskflow_todos') as { find: () => Promise<Array<{ title: string }>> }).find());
    expect(rows[0].title).toBe('Buy oat milk');
  });

  it('renameTodo rejects an empty title', async () => {
    const { renameTodo } = await import('../src/services/todo-service.js');
    await expect(renameTodo(mockTodos(), 1, '   ')).rejects.toThrow();
  });

  it('clearCompleted removes only done rows and returns the count', async () => {
    const { clearCompleted } = await import('../src/services/todo-service.js');
    const finance = mockTodos([
      { id: 1, title: 'done', is_done: true, due_date: null, priority: 'low' },
      { id: 2, title: 'open', is_done: false, due_date: null, priority: 'high' },
    ]);
    expect(await clearCompleted(finance)).toBe(1);
    const rows = (await (finance.db.table('taskflow_todos') as { find: () => Promise<Array<{ id: number }>> }).find());
    expect(rows.map((r) => r.id)).toEqual([2]);
  });

  it('counts returns the dashboard shape', async () => {
    const { counts } = await import('../src/services/todo-service.js');
    const finance = mockTodos([
      { id: 1, title: 'done', is_done: true, due_date: null, priority: 'low' },
      { id: 2, title: 'open', is_done: false, due_date: '2026-09-20', priority: 'high' },
    ]);
    await expect(counts(finance)).resolves.toEqual({ total: 2, active: 1, done: 1 });
  });

  it('listTodos returns the old camelCase shape sorted by id', async () => {
    const { listTodos } = await import('../src/services/todo-service.js');
    const finance = mockTodos([
      { id: 2, title: 'b', is_done: false, due_date: null, priority: 'medium' },
      { id: 1, title: 'a', is_done: true, due_date: null, priority: 'medium' },
    ]);
    await expect(listTodos(finance)).resolves.toEqual([
      { id: 1, title: 'a', isDone: true },
      { id: 2, title: 'b', isDone: false },
    ]);
  });
});
