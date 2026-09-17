import type { FinanceApi } from 'finance';
import { ExtensionLogger } from 'finance-logger';
import './styles/ext-tokens.css';

const logger = new ExtensionLogger('taskflow');
let _finance: FinanceApi | null = null;
export async function registerUIComponents(): Promise<void> {
  if (typeof window !== 'undefined') await import('./ui/index.js');
}

const openView =
  (finance: FinanceApi, childTag: string): (() => Promise<void>) =>
  async () => {
    await finance.ui?.requestMount('bp-diary', { view: childTag });
  };

export async function activate(
  finance: FinanceApi,
  ctx: { viewId?: string } & Record<string, unknown> = {},
): Promise<void> {
  _finance = finance;
  logger.info('activate taskflow', { viewId: ctx.viewId });
  finance.commands.registerCommand(
    'taskflow.show-overview',
    'BP Diary: Overview',
    () => openView(finance, 'bp-overview')(),
  );
  finance.commands.registerCommand('taskflow.show-todos', 'Todo List', () =>
    openView(finance, 'todo-list-view')(),
  );
  // Dashboard-compat alias: answer under the retired extension's service name
  // with identical shapes so dashboard's invoke('todo-list', 'counts') keeps working.
  finance.services.register('todo-list', {
    count: async () =>
      (await import('./services/todo-service.js')).countTodos(finance as any),
    counts: async () =>
      (await import('./services/todo-service.js')).counts(finance as any),
    list: async () =>
      (await import('./services/todo-service.js')).listTodos(finance as any),
  });
  if (typeof window !== 'undefined') await import('./ui/index.js');
  if (ctx.viewId && typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      const { BpDiaryOrchestrator } =
        await import('./ui/bp-diary-orchestrator.js');
      const el = document.createElement('bp-diary-orchestrator') as any;
      app.innerHTML = '';
      app.appendChild(el);
      const baseData = {
        viewId: ctx.viewId,
        ...(ctx as Record<string, unknown>),
      };
      queueMicrotask(() => void el.init(finance, baseData));
      setTimeout(() => {
        if (el.finance == null) void el.setFinance(finance);
      }, 50);
      app.addEventListener('mount-update', (e: Event) => {
        void el.init(finance, {
          ...baseData,
          ...((e as CustomEvent).detail ?? {}),
        });
      });
    }
  }
}

export function deactivate(): void {
  if (_finance) _finance.services.unregister('todo-list');
  _finance = null;
  logger.info('deactivate taskflow');
}
