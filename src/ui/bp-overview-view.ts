import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taskflowStyles } from '../styles/taskflow-styles.js';
import {
  createReading,
  deleteReading,
  listReadings,
  updateReading,
} from '../dao/readings.js';
import {
  classifyStatus,
  validateReading,
  averages,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../services/bp-service.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);
function dayNightIcon(takenAt: string): unknown {
  const hour = new Date(takenAt).getHours();
  const isDay = hour >= 6 && hour < 18;
  if (isDay) {
    return html`<svg
      class="daynight-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Day"
    >
      <circle cx="12" cy="12" r="5" stroke="#FF9500" stroke-width="2" />
      <path
        d="M12 2v2M12 20v2M4 12H2M22 12h-2M6 6L4 4M20 20l-2-2M6 18l-2 2M20 6l-2 2"
        stroke="#FF9500"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>`;
  }
  return html`<svg
    class="daynight-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-label="Night"
  >
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#C7C7CC" />
  </svg>`;
}

function withSeconds(iso: string): string {
  const s = String(iso);
  return s.length === 16 ? `${s}:00` : s;
}

function nowStamp(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 19);
}

export class BpOverviewView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([sharedStyles, taskflowStyles] as any)
      : [];
  finance: any = null;
  rows: Array<{ id: number; sys: number; dia: number; taken_at: string }> = [];
  error = '';
  sys = 119;
  dia = 79;
  editingId: number | null = null;
  editTakenAt: string | null = null;
  errors: Record<string, string> = {};
  historyPage = 0;
  readonly historyPageSize = 20;

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.rows = (await listReadings(this.finance)) as Array<{
        id: number;
        sys: number;
        dia: number;
        taken_at: string;
      }>;
      this.historyPage = 0;
      this.error = '';
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }
  /**
   * Whether an orchestrator owns writes for this view.
   *
   * Inside the panel it does — it listens for the bubbled `entry-*` events.
   * Mounted standalone from `index.html` there is no orchestrator, so those
   * events reach nothing and the view has to write itself. Without this the Add
   * button silently does nothing in mock dev, which is exactly the bug the todo
   * view already solved for its own events.
   */
  private get managed(): boolean {
    const getRoot = (this as any).getRootNode;
    if (typeof getRoot !== 'function') return false;
    let node: any = getRoot.call(this);
    while (node) {
      const host = node.host;
      if (!host) return false;
      if (
        typeof host.tagName === 'string' &&
        host.tagName.toLowerCase() === 'taskflow-orchestrator'
      ) {
        return true;
      }
      node = host.getRootNode ? host.getRootNode() : null;
    }
    return false;
  }

  private _badge(): unknown {
    const status = classifyStatus(this.sys, this.dia);
    return html`<span
      class="card-badge"
      style="background:${STATUS_COLORS[status]}"
      >${STATUS_LABELS[status]}</span
    >`;
  }

  private _statusColor(): string {
    const status = classifyStatus(this.sys, this.dia);
    return STATUS_COLORS[status];
  }

  private _pagedRows(): Array<{
    id: number;
    sys: number;
    dia: number;
    taken_at: string;
  }> {
    const start = this.historyPage * this.historyPageSize;
    return this.rows.slice(start, start + this.historyPageSize);
  }

  private _historyPageCount(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.historyPageSize));
  }

  private _goToHistoryPage(page: number): void {
    this.historyPage = Math.max(
      0,
      Math.min(page, this._historyPageCount() - 1),
    );
    (this as any).requestUpdate?.();
  }

  private _resetForm(): void {
    this.sys = 119;
    this.dia = 79;
    this.editingId = null;
    this.editTakenAt = null;
    this.errors = {};
  }


  private _save(): void {
    // Save time is always stamped automatically: now for new readings,
    // the original timestamp when editing.
    const stamp =
      this.editingId !== null && this.editTakenAt
        ? withSeconds(this.editTakenAt)
        : nowStamp();
    const check = validateReading(this.sys, this.dia, stamp);
    this.errors = check.errors as Record<string, string>;
    if (!check.ok) {
      (this as any).requestUpdate?.();
      return;
    }
    const input = {
      sys: this.sys,
      dia: this.dia,
      taken_at: stamp,
    };
    if (this.editingId !== null) {
      const id = this.editingId;
      this._resetForm();
      (this as any).requestUpdate?.();
      this.dispatchEvent(
        new CustomEvent('entry-edit', {
          detail: { id, input },
          bubbles: true,
          composed: true,
        }),
      );
      if (this.finance && !this.managed) {
        updateReading(this.finance, id, input).then(() => this.load());
      }
    } else {
      this._resetForm();
      (this as any).requestUpdate?.();
      this.dispatchEvent(
        new CustomEvent('entry-create', {
          detail: { input },
          bubbles: true,
          composed: true,
        }),
      );
      if (this.finance && !this.managed) {
        createReading(this.finance, input).then(() => this.load());
      }
    }
  }

  private _startEdit(r: {
    id: number;
    sys: number;
    dia: number;
    taken_at: string;
  }): void {
    this.sys = r.sys;
    this.dia = r.dia;
    this.editTakenAt = r.taken_at;
    this.editingId = r.id;
    this.errors = {};
    (this as any).requestUpdate?.();
  }

  private _cancelEdit(): void {
    this._resetForm();
    (this as any).requestUpdate?.();
  }

  private _remove(id: number): void {
    if (
      typeof globalThis.confirm === 'function' &&
      !globalThis.confirm('Delete this reading?')
    )
      return;
    this.dispatchEvent(
      new CustomEvent('entry-delete', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.finance && !this.managed) {
      deleteReading(this.finance, id).then(() => this.load());
    }
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const latest = this.rows[0];
    const status = latest ? classifyStatus(latest.sys, latest.dia) : null;
    const color = status ? STATUS_COLORS[status] : '#888';
    const avg = averages(this.rows);
    return html`
      <div class="topbar">
          <span class="crumb-current">Taskflow · BP List</span>
        <div class="spacer"></div>
      </div>
      <div class="view-container">
        <div class="view-container-inner">
          ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}

          <div class="section" style="margin-top:16px">
            <div class="section-header">
              <h3 class="section-title">Blood Pressure</h3>
            </div>
            <div class="section-body">
              <div class="bp-cards">
                <div class="bp-panel">
                  <h4 class="bp-panel-title">Latest Reading</h4>
                  <div class="bp-card-value">
                    ${!latest ? '0/0' : `${latest.sys}/${latest.dia}`}
                  </div>
                    <div class="bp-card-meta">
                      <span class="stat-line">
                        ${latest ? dayNightIcon(latest.taken_at) : ''}
                        ${latest
                          ? latest.taken_at.slice(0, 16).replace('T', ' ')
                          : 'No readings yet'}
                      </span>
                      ${
                        !latest
                          ? ''
                          : html`<span
                                class="card-badge"
                                style="background:${color}"
                                >${status ? STATUS_LABELS[status] : 'Latest'}</span
                              >`
                      }
                    </div>
                </div>

                <div class="bp-panel">
                  <h4 class="bp-panel-title">Average Reading</h4>
                  <div class="bp-card-value">
                    ${avg.avgSys || avg.avgDia ? `${avg.avgSys}/${avg.avgDia}` : '0/0'}
                  </div>
                  <div class="bp-card-meta">
                    <span class="stat-line">${avg.daysRecorded} day(s) recorded</span>
                  </div>
                </div>

                <div class="bp-panel bp-panel-entry">
                  <div class="bp-entry-row">
                    <label class="bp-field">
                      <span>SYS</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="3"
                        aria-label="SYS"
                        .value=${String(this.sys)}
                        @input=${(e: Event) => {
                          const el = e.target as HTMLInputElement;
                          // maxlength is ignored on number inputs, and a blood
                          // pressure reading is at most three digits, so the
                          // value is sanitised rather than trusted.
                          const digits = el.value.replace(/\D/g, '').slice(0, 3);
                          if (digits !== el.value) el.value = digits;
                          this.sys = digits === '' ? 0 : Number(digits);
                          (this as any).requestUpdate();
                        }}
                      />
                    </label>
                    <label class="bp-field">
                      <span>DIA</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        maxlength="3"
                        aria-label="DIA"
                        .value=${String(this.dia)}
                        @input=${(e: Event) => {
                          const el = e.target as HTMLInputElement;
                          const digits = el.value.replace(/\D/g, '').slice(0, 3);
                          if (digits !== el.value) el.value = digits;
                          this.dia = digits === '' ? 0 : Number(digits);
                          (this as any).requestUpdate();
                        }}
                      />
                    </label>
                    <div class="bp-entry-actions">
                      <span aria-hidden="true"></span>
                      <button class="btn btn-primary" @click=${() => this._save()}>
                        ${this.editingId !== null ? 'Update' : 'Add'}
                      </button>
                      ${
                        this.editingId !== null
                          ? html`<button
                              class="btn btn-secondary"
                              @click=${() => this._cancelEdit()}
                            >
                              Cancel
                            </button>`
                          : ''
                      }
                    </div>
                  </div>
                  ${this.errors.sys ? html`<p class="field-error">${this.errors.sys}</p>` : ''}
                  ${this.errors.dia ? html`<p class="field-error">${this.errors.dia}</p>` : ''}
                </div>
          </div>
        </div>
      </div>

          <div class="section" style="margin-top:16px">
            <div class="section-header">
              <h3 class="section-title">Readings</h3>
              <span class="section-badge">${this.rows.length}</span>
            </div>
            ${
              this.rows.length === 0
                ? html`<div class="section-body">
                    <p class="empty">No readings yet.</p>
                  </div>`
                : html`<div class="section-body" style="padding:0">
                    <div class="table-wrap">
                      <table class="history-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time Period</th>
                            <th class="num">SYS</th>
                            <th class="num">DIA</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this._pagedRows().map((r) => {
                            const st = classifyStatus(r.sys, r.dia);
                            return html`<tr>
                              <td class="date">
                                ${r.taken_at.slice(0, 16).replace('T', ' ')}
                              </td>
                              <td>${dayNightIcon(r.taken_at)}</td>
                              <td class="num sys">${r.sys}</td>
                              <td class="num dia">${r.dia}</td>
                              <td>
                                <span
                                  class="card-badge"
                                  style="background:${STATUS_COLORS[st]}"
                                  >${STATUS_LABELS[st]}</span
                                >
                              </td>
                              <td class="actions">
                                <button
                                  class="btn btn-secondary btn-sm"
                                  @click=${() => this._startEdit(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  class="btn btn-danger btn-sm"
                                  @click=${() => this._remove(r.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>`;
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div class="pagination">
                      <button
                        class="btn btn-secondary"
                        @click=${() => this._goToHistoryPage(this.historyPage - 1)}
                        ?disabled=${this.historyPage === 0}
                      >
                        Previous
                      </button>
                      <span class="pagination-info"
                        >Page ${this.historyPage + 1} of ${this._historyPageCount()}</span
                      >
                      <button
                        class="btn btn-secondary"
                        @click=${() => this._goToHistoryPage(this.historyPage + 1)}
                        ?disabled=${this.historyPage >= this._historyPageCount() - 1}
                      >
                        Next
                      </button>
                    </div>
                  </div>`
            }
          </div>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('bp-overview-view')
) {
  customElements.define(
    'bp-overview-view',
    BpOverviewView as unknown as CustomElementConstructor,
  );
}
