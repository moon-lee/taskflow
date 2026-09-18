export type TodoPriority = 'low' | 'medium' | 'high';

const PRIORITIES: readonly string[] = ['low', 'medium', 'high'];

/**
 * SQLite has no BOOLEAN type — better-sqlite3 stores `is_done` as INTEGER
 * 1/0 and returns numbers on read (see dao-service `coerceParam`). Mocks and
 * dev doubles use real booleans. Accept both everywhere.
 */
export function isDoneFlag(value: unknown): boolean {
  return value === true || value === 1;
}

export interface TodoFieldErrors {
  title?: string;
  dueDate?: string;
  priority?: string;
}

export function validateTodo(
  title: unknown,
  dueDate: unknown,
  priority: unknown,
): { ok: boolean; errors: TodoFieldErrors } {
  const errors: TodoFieldErrors = {};
  if (
    typeof title !== 'string' ||
    title.trim().length === 0 ||
    title.trim().length > 200
  ) {
    errors.title = 'Title must be 1–200 characters';
  }
  if (dueDate !== null && dueDate !== undefined && dueDate !== '') {
    if (
      typeof dueDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      !Number.isFinite(Date.parse(dueDate))
    ) {
      errors.dueDate = 'Due date must be YYYY-MM-DD';
    }
  }
  if (typeof priority !== 'string' || !PRIORITIES.includes(priority)) {
    errors.priority = 'Priority must be low, medium, or high';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export async function toggleTodo(finance: any, id: number): Promise<boolean> {
  const rows = (await finance.db
    .table('taskflow_todos')
    .find({ id })) as Array<{ id: number; is_done: boolean }>;
  const row = rows[0];
  if (!row) throw new Error(`todo ${id} not found`);
  const next = !isDoneFlag(row.is_done);
  await finance.db.table('taskflow_todos').update({ id }, { is_done: next });
  return next;
}

export async function renameTodo(
  finance: any,
  id: number,
  title: string,
): Promise<void> {
  const check = validateTodo(title, null, 'medium');
  if (!check.ok) throw new Error(check.errors.title ?? 'Invalid title');
  await finance.db
    .table('taskflow_todos')
    .update({ id }, { title: title.trim() });
}

export async function clearCompleted(finance: any): Promise<number> {
  const rows = (await finance.db.table('taskflow_todos').find({})) as Array<{
    id: number;
    is_done: boolean;
  }>;
  let n = 0;
  for (const r of rows) {
    if (r.is_done) {
      await finance.db.table('taskflow_todos').delete({ id: r.id });
      n += 1;
    }
  }
  return n;
}

export interface OldTodo {
  id: number;
  title: string;
  isDone: boolean;
  createdAt?: string;
}

function toOldShape(r: {
  id: number;
  title: string;
  is_done: boolean;
  created_at?: string;
}): OldTodo {
  const out: OldTodo = {
    id: Number(r.id),
    title: String(r.title),
    isDone: isDoneFlag(r.is_done),
  };
  if (typeof r.created_at === 'string' && r.created_at.length > 0)
    out.createdAt = r.created_at;
  return out;
}

/** Dashboard-compat readers: identical shapes to the retired todo-list service. */
export async function listTodos(finance: any): Promise<OldTodo[]> {
  const rows = (await finance.db.table('taskflow_todos').find({})) as Array<{
    id: number;
    title: string;
    is_done: boolean;
    created_at?: string;
  }>;
  return rows.map(toOldShape).sort((a, b) => a.id - b.id);
}

export async function counts(
  finance: any,
): Promise<{ total: number; active: number; done: number }> {
  const rows = (await finance.db.table('taskflow_todos').find({})) as Array<{
    is_done: boolean;
  }>;
  const done = rows.filter((r) => isDoneFlag(r.is_done)).length;
  return { total: rows.length, active: rows.length - done, done };
}

export async function countTodos(finance: any): Promise<number> {
  return finance.db.table('taskflow_todos').count({});
}

export function isOverdue(
  dueDate: string | null,
  isDone: boolean,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (isDone || dueDate == null) return false;
  return dueDate < today;
}
