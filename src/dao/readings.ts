export interface ReadingRow {
  id: number;
  sys: number;
  dia: number;
  taken_at: string;
  created_at?: string;
  updated_at?: string;
}

const TABLE = 'taskflow_bp_readings';

export async function listReadings(finance: any): Promise<ReadingRow[]> {
  const rows = (await finance.db.table(TABLE).find({})) as ReadingRow[];
  return rows
    .slice()
    .sort((a, b) => String(b.taken_at).localeCompare(String(a.taken_at)));
}

export async function createReading(
  finance: any,
  input: { sys: number; dia: number; taken_at: string },
): Promise<number> {
  const res = (await finance.db.table(TABLE).insert(input)) as { id: number };
  return res.id;
}

export async function updateReading(
  finance: any,
  id: number,
  patch: { sys: number; dia: number; taken_at: string },
): Promise<void> {
  await finance.db.table(TABLE).update({ id }, patch);
}

export async function deleteReading(finance: any, id: number): Promise<void> {
  await finance.db.table(TABLE).delete({ id });
}
