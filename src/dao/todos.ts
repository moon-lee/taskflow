export interface TodoRow {
  id: number;
  title: string;
  is_done: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at?: string;
  updated_at?: string;
}

const TABLE = 'taskflow_todos';

export async function listTodos(finance: any): Promise<TodoRow[]> {
  const rows = (await finance.db.table(TABLE).find({})) as TodoRow[];
  return rows.slice().sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (a.due_date == null && b.due_date == null) return a.id - b.id;
    if (a.due_date == null) return 1;
    if (b.due_date == null) return -1;
    return String(a.due_date).localeCompare(String(b.due_date)) || a.id - b.id;
  });
}

export async function createTodo(
  finance: any,
  input: {
    title: string;
    is_done: boolean;
    due_date: string | null;
    priority: string;
  },
): Promise<number> {
  const res = (await finance.db.table(TABLE).insert(input)) as { id: number };
  return res.id;
}

export async function deleteTodo(finance: any, id: number): Promise<void> {
  await finance.db.table(TABLE).delete({ id });
}
