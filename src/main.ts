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
    await finance.ui?.requestMount('taskflow', { view: childTag });
  };

export async function activate(
  finance: FinanceApi,
  ctx: { viewId?: string } & Record<string, unknown> = {},
): Promise<void> {
  _finance = finance;
  logger.info('activate taskflow', { viewId: ctx.viewId });

  // Nav-bar Refresh (Quick Links group), same pattern as taxflow. pushData
  // rather than requestMount: the latter would create the panel if it were
  // closed, popping a view the user had deliberately shut. Dropped when nothing
  // is mounted, which is what a Refresh item should do.
  finance.commands.registerCommand('taskflow.refresh', 'Refresh Task Flow', async () => {
    try {
      await finance.ui?.pushData?.('taskflow', { refreshedAt: Date.now() });
    } catch (err) {
      logger.error('taskflow refresh failed', err);
    }
  });
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
      const { TaskflowOrchestrator } =
        await import('./ui/taskflow-orchestrator.js');
      const el = document.createElement('taskflow-orchestrator') as any;
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
