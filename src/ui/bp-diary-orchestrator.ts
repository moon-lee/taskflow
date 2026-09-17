import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { ExtensionLogger } from 'finance-logger';
import {
  createReading,
  updateReading,
  deleteReading,
} from '../dao/readings.js';
import { listTodos, createTodo, deleteTodo } from '../dao/todos.js';
import { validateReading } from '../services/bp-service.js';
import { validateTodo, toggleTodo } from '../services/todo-service.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);
const logger = new ExtensionLogger('taskflow');

export type BpTag = 'bp-overview' | 'todo-list-view';

export class BpDiaryOrchestrator extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            #child {
              flex: 1;
              min-height: 0;
              display: block;
              overflow: hidden;
            }
          `,
        ] as any)
      : [];
  finance: any = null;
  view: BpTag = 'bp-overview';
  mountData: Record<string, unknown> = {};
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.pushFinance();
  }

  async init(f: any, mount: Record<string, unknown> = {}): Promise<void> {
    this.finance = f;
    this.mountData = mount;
    const v = (mount.view ?? mount.viewId) as string | undefined;
    if (v === 'todo-list-view') this.view = 'todo-list-view';
    else this.view = 'bp-overview';
    await this.pushFinance();
  }

  navigate(tag: BpTag): void {
    this.view = tag;
    (this as any).requestUpdate?.();
    void this.pushFinance();
  }

  private child(): any {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    return root?.querySelector('#child');
  }

  private async pushFinance(): Promise<void> {
    (this as any).requestUpdate?.();
    await Promise.resolve();
    const c = this.child() as any;
    if (c && this.finance) {
      Object.assign(c, this.mountData);
      c.finance = this.finance;
    }
    if (c && typeof c.setFinance === 'function') {
      try {
        await c.setFinance(this.finance);
      } catch (e: any) {
        this.error = String(e?.message || e);
      }
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('entry-create', async (e: Event) => {
      const input = (e as CustomEvent).detail?.input as {
        sys: number;
        dia: number;
        taken_at: string;
      };
      const check = validateReading(input.sys, input.dia, input.taken_at);
      if (!check.ok) return;
      try {
        await createReading(this.finance, input);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('entry-edit', async (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        id: number;
        input: { sys: number; dia: number; taken_at: string };
      };
      const check = validateReading(
        detail.input.sys,
        detail.input.dia,
        detail.input.taken_at,
      );
      if (!check.ok) return;
      try {
        await updateReading(this.finance, detail.id, detail.input);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('entry-delete', async (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number;
      try {
        await deleteReading(this.finance, id);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        logger.error('entry-delete failed', err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('todo-create', async (e: Event) => {
      const input = (e as CustomEvent).detail?.input as {
        title: string;
        due_date: string | null;
        priority: string;
      };
      const check = validateTodo(input.title, input.due_date, input.priority);
      if (!check.ok) return;
      try {
        await createTodo(this.finance, {
          title: input.title.trim(),
          is_done: false,
          due_date: input.due_date || null,
          priority: input.priority,
        });
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('todo-toggle', async (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number;
      try {
        await toggleTodo(this.finance, id);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        logger.error('todo-toggle failed', err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('todo-delete', async (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number;
      try {
        await deleteTodo(this.finance, id);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        logger.error('todo-delete failed', err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('todo-rename', async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: number; title: string };
      const check = validateTodo(detail.title, null, 'medium');
      if (!check.ok) return;
      try {
        const { renameTodo } = await import('../services/todo-service.js');
        await renameTodo(this.finance, detail.id, detail.title);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        logger.error('todo-rename failed', err);
        (this as any).requestUpdate?.();
      }
    });
    this.addEventListener('todo-clear-completed', async () => {
      try {
        const { clearCompleted } = await import('../services/todo-service.js');
        await clearCompleted(this.finance);
        await this.pushFinance();
      } catch (err: any) {
        this.error = String(err?.message || err);
        logger.error('todo-clear-completed failed', err);
        (this as any).requestUpdate?.();
      }
    });
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      ${
        this.error
          ? html`<div class="view-container">
              <div class="view-container-inner">
                <p class="field-error">Error: ${this.error}</p>
              </div>
            </div>`
          : ''
      }
      ${this.view === 'bp-overview' ? html`<bp-overview-view id="child"></bp-overview-view>` : ''}
      ${this.view === 'todo-list-view' ? html`<todo-list-view id="child"></todo-list-view>` : ''}
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('bp-diary-orchestrator')
) {
  customElements.define(
    'bp-diary-orchestrator',
    BpDiaryOrchestrator as unknown as CustomElementConstructor,
  );
}
