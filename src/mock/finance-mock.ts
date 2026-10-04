export function createMockFinance(): import('finance').FinanceApi {
  const mem = new Map<string, Map<number, Record<string, unknown>>>();
  let nextId = 1;
  // shared service registry for mock — survives across finance instances in same page (for cross-extension dev)
  const g: any = globalThis as any;
  if (!g.__mockServices)
    g.__mockServices = new Map<
      string,
      Record<string, (p?: unknown) => unknown>
    >();
  const servicesRegistry: Map<
    string,
    Record<string, (p?: unknown) => unknown>
  > = g.__mockServices;
  // Data is persisted to localStorage so mock dev behaves like a database.
  // Without it a reload silently empties every table, which looks exactly like
  // writes failing rather than like the data never being stored.
  const STORAGE_KEY = '__financeMockDb';
  const STORE: { tables: Record<string, Record<string, unknown>>; nextId: number } = (() => {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.tables) {
          return { tables: parsed.tables, nextId: Number(parsed.nextId) || 1 };
        }
      }
    } catch {
      /* private mode or corrupt JSON: start empty rather than fail */
    }
    return { tables: {}, nextId: 1 };
  })();
  nextId = STORE.nextId;

  function persist(): void {
    const plain: Record<string, Record<string, unknown>> = {};
    for (const [name, rows] of mem) {
      const bucket: Record<string, unknown> = {};
      for (const [id, row] of rows) bucket[String(id)] = row;
      plain[name] = bucket;
    }
    STORE.nextId = nextId;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ tables: plain, nextId }));
    } catch {
      /* quota or private mode: a dev convenience, never fatal */
    }
  }

  const table = (name: string) => {
    if (!mem.has(name)) {
      // Hydrate from the persisted store on first touch of a table.
      const restored = new Map<number, Record<string, unknown>>();
      const bucket = STORE.tables[name];
      if (bucket) {
        for (const [id, row] of Object.entries(bucket)) restored.set(Number(id), row);
      }
      mem.set(name, restored);
    }
    const m = mem.get(name)!;
    return {
      find: async (filter = {}) =>
        [...m.values()].filter((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        ),
      findOne: async (filter = {}) =>
        [...m.values()].find((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        ) ?? null,
      insert: async (row: Record<string, unknown>) => {
        const id = nextId++;
        const r = { id, ...row };
        m.set(id, r);
        persist();
        return { id };
      },
      update: async (
        filter: Record<string, unknown>,
        patch: Record<string, unknown>,
      ) => {
        let n = 0;
        for (const [id, r] of m)
          if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
            m.set(id, { ...r, ...patch });
            n++;
          }
        if (n > 0) persist();
        return { affected: n };
      },
      delete: async (filter: Record<string, unknown>) => {
        let n = 0;
        for (const [id, r] of m)
          if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
            m.delete(id);
            n++;
          }
        if (n > 0) persist();
        return { affected: n };
      },
      count: async (filter = {}) =>
        [...m.values()].filter((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        ).length,
    };
  };
  return {
    commands: { registerCommand: () => {}, execute: async () => {} },
    ai: { registerTool: () => {} },
    db: { table } as never,
    services: {
      register: (
        name: string,
        impl: Record<string, (p?: unknown) => unknown>,
      ) => {
        servicesRegistry.set(name, impl);
      },
      unregister: (name: string) => {
        servicesRegistry.delete(name);
      },
      invoke: async (name: string, method: string, params?: unknown) => {
        const svc = servicesRegistry.get(name);
        if (!svc || typeof svc[method] !== 'function') return null;
        return await svc[method](params);
      },
    },
    ui: {
      requestMount: async () => {},
      setDirty: () => {},
      autoSaveDraft: async () => {},
      onBeforeUnmount: () => {},
    },
    events: { on: () => () => {}, emit: async () => {} },
    settings: { get: async () => null, set: async () => {} },
  } as never;
}

/**
 * Empties every mock table. Exposed on `window` so a dev page can offer a reset
 * control — otherwise stale rows after a reload are indistinguishable from a
 * write that failed.
 */
export function resetMockDb(): void {
  try {
    globalThis.localStorage?.removeItem('__financeMockDb');
  } catch {
    /* nothing to clear */
  }
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).__resetMockDb = resetMockDb;
}
