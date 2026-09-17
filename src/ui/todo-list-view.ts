import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taskflowStyles } from '../styles/taskflow-styles.js';
import { listTodos, createTodo, deleteTodo } from '../dao/todos.js';
import {
  validateTodo,
  isOverdue,
  toggleTodo,
  renameTodo,
  clearCompleted,
  type TodoPriority,
} from '../services/todo-service.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  low: '#5AC8FA',
  medium: '#FF9500',
  high: '#FF3B30',
};

export class TodoListView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([sharedStyles, taskflowStyles] as any)
      : [];
  finance: any = null;
  rows: Array<{
    id: number;
    title: string;
    is_done: boolean;
    due_date: string | null;
    priority: string;
  }> = [];
  title = '';
  dueDate = new Date().toISOString().slice(0, 10);
  priority: TodoPriority = 'medium';
  errors: Record<string, string> = {};
  error = '';
  filter: 'all' | 'active' | 'done' = 'all';
  sortKey: 'none' | 'due' | 'priority' = 'none';
  sortDir: 'asc' | 'desc' = 'asc';
  editingId: number | null = null;
  editingDraft = '';
  busyIds = new Set<number>();

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.rows = (await listTodos(this.finance)) as Array<{
        id: number;
        title: string;
        is_done: boolean;
        due_date: string | null;
        priority: string;
      }>;
      this.error = '';
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  private get visibleTodos(): Array<{
    id: number;
    title: string;
    is_done: boolean;
    due_date: string | null;
    priority: string;
  }> {
    let list = this.rows;
    if (this.filter === 'active') list = list.filter((r) => !r.is_done);
    else if (this.filter === 'done') list = list.filter((r) => r.is_done);
    if (this.sortKey === 'due') {
      list = [...list].sort((a, b) => {
        const aDate = a.due_date || '';
        const bDate = b.due_date || '';
        const cmp = aDate.localeCompare(bDate);
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'priority') {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => {
        const cmp = (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }

  private _setSort(key: 'none' | 'due' | 'priority'): void {
    if (this.sortKey === key) {
      if (this.sortDir === 'asc') this.sortDir = 'desc';
      else {
        this.sortKey = 'none';
        this.sortDir = 'asc';
      }
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    (this as any).requestUpdate?.();
  }

  private get counts(): { total: number; active: number; done: number } {
    const done = this.rows.filter((r) => r.is_done).length;
    return { total: this.rows.length, active: this.rows.length - done, done };
  }

  private _create(): void {
    const check = validateTodo(this.title, this.dueDate || null, this.priority);
    this.errors = check.errors as Record<string, string>;
    if (!check.ok) {
      (this as any).requestUpdate?.();
      return;
    }
    const input = {
      title: this.title.trim(),
      due_date: this.dueDate || null,
      priority: this.priority,
    };
    this.title = '';
    this.dueDate = new Date().toISOString().slice(0, 10);
    this.priority = 'medium';
    this.errors = {};
    (this as any).requestUpdate?.();
    this.dispatchEvent(
      new CustomEvent('todo-create', {
        detail: { input },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance) {
      createTodo(this.finance, {
        ...input,
        is_done: false,
      }).then(() => this.load());
    }
  }

  private _toggle(id: number, isDone: boolean): void {
    const next = !isDone;
    this.rows = this.rows.map((r) =>
      r.id === id ? { ...r, is_done: next } : r,
    );
    this.busyIds.add(id);
    (this as any).requestUpdate?.();
    this.dispatchEvent(
      new CustomEvent('todo-toggle', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance) {
      toggleTodo(this.finance, id).then(() => this.load());
    }
    setTimeout(() => {
      this.busyIds.delete(id);
      (this as any).requestUpdate?.();
    }, 1000);
  }

  private _startEdit(id: number, title: string): void {
    this.editingId = id;
    this.editingDraft = title;
    this.errors = {};
    (this as any).requestUpdate?.();
  }

  private _cancelEdit(): void {
    this.editingId = null;
    this.editingDraft = '';
    (this as any).requestUpdate?.();
  }

  private _saveEdit(id: number): void {
    const check = validateTodo(this.editingDraft, null, 'medium');
    if (!check.ok) {
      this.errors = { title: check.errors.title ?? 'Invalid title' };
      (this as any).requestUpdate?.();
      return;
    }
    const title = this.editingDraft.trim();
    this.errors = {};
    this.editingId = null;
    this.editingDraft = '';
    (this as any).requestUpdate?.();
    this.dispatchEvent(
      new CustomEvent('todo-rename', {
        detail: { id, title },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance) {
      renameTodo(this.finance, id, title).then(() => this.load());
    }
  }

  private _remove(id: number): void {
    if (
      typeof globalThis.confirm === 'function' &&
      !globalThis.confirm('Delete this todo?')
    )
      return;
    this.dispatchEvent(
      new CustomEvent('todo-delete', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance) {
      deleteTodo(this.finance, id).then(() => this.load());
    }
  }

  private _clearCompleted(): void {
    this.dispatchEvent(
      new CustomEvent('todo-clear-completed', {
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance) {
      clearCompleted(this.finance).then(() => this.load());
    }
  }

  private _emptyMessage(): string {
    if (this.rows.length === 0) return 'No todos yet — add one above.';
    if (this.filter === 'active') return 'No active todos — all done.';
    if (this.filter === 'done') return 'No completed todos yet.';
    return 'No todos.';
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const c = this.counts;
    const visible = this.visibleTodos;
    return html`
      <div class="topbar">
        <span class="crumb-current">Todo List</span>
        <div class="spacer"></div>
        <button
          class="filter-btn ${this.filter === 'all' ? 'on' : ''}"
          @click=${() => {
            this.filter = 'all';
            (this as any).requestUpdate();
          }}
        >
          All (${c.total})
        </button>
        <button
          class="filter-btn ${this.filter === 'active' ? 'on' : ''}"
          @click=${() => {
            this.filter = 'active';
            (this as any).requestUpdate();
          }}
        >
          Active (${c.active})
        </button>
        <button
          class="filter-btn ${this.filter === 'done' ? 'on' : ''}"
          @click=${() => {
            this.filter = 'done';
            (this as any).requestUpdate();
          }}
        >
          Done (${c.done})
        </button>
        <button
          class="filter-btn"
          ?disabled=${c.done === 0}
          @click=${() => this._clearCompleted()}
        >
          Clear completed
        </button>
      </div>
      <div class="view-container">
        <div class="view-container-inner">
          <h1>Todo List</h1>
          <p>${c.active} active · ${c.done} done · ${c.total} total</p>
          <div class="section" style="margin-top:16px">
            <div class="section-header">
              <h3 class="section-title">Add Todo</h3>
            </div>
            <div class="section-body">
              <div class="add-row">
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  .value=${this.title}
                  @input=${(e: Event) => {
                    this.title = (e.target as HTMLInputElement).value;
                    (this as any).requestUpdate();
                  }}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') this._create();
                  }}
                />
                <input
                  type="date"
                  .value=${this.dueDate}
                  @input=${(e: Event) => {
                    this.dueDate = (e.target as HTMLInputElement).value;
                    (this as any).requestUpdate();
                  }}
                />
                <select
                  .value=${this.priority}
                  @change=${(e: Event) => {
                    this.priority = (e.target as HTMLSelectElement)
                      .value as TodoPriority;
                    (this as any).requestUpdate();
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button class="btn btn-primary" @click=${() => this._create()}>
                  Add
                </button>
              </div>
              ${this.errors.title ? html`<p class="field-error">${this.errors.title}</p>` : ''}
              ${this.errors.dueDate ? html`<p class="field-error">${this.errors.dueDate}</p>` : ''}
              ${this.errors.priority ? html`<p class="field-error">${this.errors.priority}</p>` : ''}
            </div>
          </div>
          <div class="table-wrap" style="margin-top:16px">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px 12px;width:36px">
                    Done
                  </th>
                  <th style="text-align:left;padding:8px 12px">Title</th>
                  <th
                    style="text-align:left;padding:8px 12px;width:120px;white-space:nowrap;cursor:pointer"
                    @click=${() => this._setSort('due')}
                  >
                    Due
                    ${this.sortKey === 'due' ? (this.sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    style="text-align:left;padding:8px 12px;width:100px;white-space:nowrap;cursor:pointer"
                    @click=${() => this._setSort('priority')}
                  >
                    Priority
                    ${this.sortKey === 'priority' ? (this.sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    style="text-align:left;padding:8px 12px;width:190px;white-space:nowrap"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                ${
                  visible.length === 0
                    ? html`<tr>
                        <td
                          colspan="5"
                          class="empty"
                          style="padding:16px;text-align:center"
                        >
                          ${this._emptyMessage()}
                        </td>
                      </tr>`
                    : visible.map(
                        (r) =>
                          html`<tr>
                            <td style="padding:8px 12px">
                              <input
                                type="checkbox"
                                .checked=${r.is_done}
                                ?disabled=${this.busyIds.has(r.id)}
                                @change=${() => this._toggle(r.id, r.is_done)}
                                aria-label="Mark ${r.title} ${r.is_done ? 'not done' : 'done'}"
                              />
                            </td>
                            <td style="padding:8px 12px">
                              ${
                                this.editingId === r.id
                                  ? html`<input
                                      type="text"
                                      class="todo-edit"
                                      style="text-align:left;width:100%"
                                      .value=${this.editingDraft}
                                      @input=${(e: Event) => {
                                        this.editingDraft = (
                                          e.target as HTMLInputElement
                                        ).value;
                                      }}
                                      @keydown=${(e: KeyboardEvent) => {
                                        if (e.key === 'Enter')
                                          this._saveEdit(r.id);
                                        else if (e.key === 'Escape')
                                          this._cancelEdit();
                                      }}
                                    />`
                                  : html`<span
                                      style=${r.is_done ? 'text-decoration:line-through;opacity:0.7' : ''}
                                      >${r.title}</span
                                    >`
                              }
                            </td>
                            <td style="padding:8px 12px;white-space:nowrap">
                              ${r.due_date ? html`<span class="card-badge ${isOverdue(r.due_date, r.is_done) ? 'chip-overdue' : ''}">${r.due_date}</span>` : html`<span style="color:var(--ff-text-muted,#858585)">—</span>`}
                            </td>
                            <td style="padding:8px 12px;white-space:nowrap">
                              <span
                                class="card-badge"
                                style="background:${PRIORITY_COLORS[(r.priority as TodoPriority) ?? 'medium']}"
                                >${r.priority}</span
                              >
                            </td>
                            <td style="padding:8px 12px;white-space:nowrap">
                              ${
                                this.editingId === r.id
                                  ? html`<div
                                      style="display:flex;gap:6px;flex-wrap:nowrap;align-items:center"
                                    >
                                      <button
                                        class="btn btn-primary"
                                        @click=${() => this._saveEdit(r.id)}
                                        ?disabled=${this.busyIds.has(r.id)}
                                      >
                                        Save
                                      </button>
                                      <button
                                        class="btn btn-secondary"
                                        @click=${() => this._cancelEdit()}
                                      >
                                        Cancel
                                      </button>
                                    </div>`
                                  : html`<div
                                      style="display:flex;gap:6px;flex-wrap:nowrap;align-items:center"
                                    >
                                      <button
                                        class="btn btn-secondary"
                                        ?disabled=${this.busyIds.has(r.id)}
                                        @click=${() => this._startEdit(r.id, r.title)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        class="btn btn-secondary"
                                        ?disabled=${this.busyIds.has(r.id)}
                                        @click=${() => this._remove(r.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>`
                              }
                            </td>
                          </tr>`,
                      )
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('todo-list-view')
) {
  customElements.define(
    'todo-list-view',
    TodoListView as unknown as CustomElementConstructor,
  );
}
