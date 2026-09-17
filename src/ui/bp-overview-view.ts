import { LitElement, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { taskflowStyles } from '../styles/taskflow-styles.js';
import { Chart } from 'chart.js/auto';
import { listReadings } from '../dao/readings.js';
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

function heart(color: string): unknown {
  return html`<svg
    width="72"
    height="72"
    viewBox="0 0 24 24"
    fill="${color}"
    aria-hidden="true"
  >
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
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
  sys = 120;
  dia = 80;
  editingId: number | null = null;
  editTakenAt: string | null = null;
  errors: Record<string, string> = {};
  private _chart: Chart | null = null;
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

  override updated(): void {
    if (typeof HTMLElement === 'undefined') return;
    const canvas = (this as any).renderRoot?.querySelector(
      '#history-chart',
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const labels = this.rows
      .slice()
      .reverse()
      .map((r) =>
        new Date(r.taken_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      );
    const data = {
      labels,
      datasets: [
        {
          label: 'SYS',
          data: this.rows
            .slice()
            .reverse()
            .map((r) => r.sys),
          borderColor: '#FF3B30',
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          tension: 0.2,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'DIA',
          data: this.rows
            .slice()
            .reverse()
            .map((r) => r.dia),
          borderColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue('--ff-accent')
              .trim() || '#007acc',
          backgroundColor: 'rgba(0, 122, 204, 0.1)',
          tension: 0.2,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          boxPadding: 3,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#858585', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#858585', font: { size: 11 } },
        },
      },
    };
    if (this._chart) {
      this._chart.data = data;
      this._chart.options = options;
      this._chart.update('none');
    } else {
      this._chart = new Chart(ctx, { type: 'line', data, options });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback?.();
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  }

  private _badge(): unknown {
    const status = classifyStatus(this.sys, this.dia);
    return html`<span
      class="card-badge"
      style="background:${STATUS_COLORS[status]}"
      >${STATUS_LABELS[status]}</span
    >`;
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
    this.sys = 120;
    this.dia = 80;
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
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const latest = this.rows[0];
    const status = latest ? classifyStatus(latest.sys, latest.dia) : null;
    const color = status ? STATUS_COLORS[status] : '#888';
    const avg = averages(this.rows);
    return html`
      <div class="topbar">
        <span class="crumb-current">BP Diary</span>
        <div class="spacer"></div>
      </div>
      <div class="view-container">
        <div class="view-container-inner">
          ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Summary</h3>
              ${this._badge()}
            </div>
            <div class="summary-card">
              <div class="summary-hero">
                ${heart(latest ? color : '#888')}
                <div>
                  <div class="hero-nums">
                    ${!latest ? '0/0' : `${latest.sys}/${latest.dia}`}
                  </div>
                  ${
                    !latest
                      ? ''
                      : html`<div class="btn-row" style="margin-top:4px">
                          <span class="card-badge" style="background:${color}"
                            >${status ? STATUS_LABELS[status] : 'Latest'}</span
                          >
                          <span class="stat-line">Latest reading</span>
                        </div>`
                  }
                </div>
              </div>
              <div class="summary-entry">
                <div class="summary-fields">
                  <div class="summary-stepper-row">
                    <label>SYS</label>
                    <button
                      class="stepper"
                      @click=${() => {
                        this.sys -= 1;
                        (this as any).requestUpdate();
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      .value=${String(this.sys)}
                      @input=${(e: Event) => {
                        this.sys = Number((e.target as HTMLInputElement).value);
                        (this as any).requestUpdate();
                      }}
                    />
                    <button
                      class="stepper"
                      @click=${() => {
                        this.sys += 1;
                        (this as any).requestUpdate();
                      }}
                    >
                      +
                    </button>
                  </div>
                  ${this.errors.sys ? html`<p class="field-error">${this.errors.sys}</p>` : ''}
                  <div class="summary-stepper-row" style="margin-top:12px">
                    <label>DIA</label>
                    <button
                      class="stepper"
                      @click=${() => {
                        this.dia -= 1;
                        (this as any).requestUpdate();
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      .value=${String(this.dia)}
                      @input=${(e: Event) => {
                        this.dia = Number((e.target as HTMLInputElement).value);
                        (this as any).requestUpdate();
                      }}
                    />
                    <button
                      class="stepper"
                      @click=${() => {
                        this.dia += 1;
                        (this as any).requestUpdate();
                      }}
                    >
                      +
                    </button>
                  </div>
                  ${this.errors.dia ? html`<p class="field-error">${this.errors.dia}</p>` : ''}
                </div>
                <div class="summary-actions">
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
            </div>
          </div>
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">History</h3>
              <div class="btn-row">
                <span class="history-avg"
                  >Avg ${avg.avgSys}/${avg.avgDia} · ${avg.daysRecorded}
                  day(s)</span
                >
                <span class="section-badge">${this.rows.length}</span>
              </div>
            </div>
            <div class="section-body">
              <div class="chart-card">
                <canvas id="history-chart"></canvas>
              </div>
            </div>
            ${
              this.rows.length === 0
                ? html`<div class="section-body">
                    <p class="empty">No readings yet.</p>
                  </div>`
                : html` <div class="table-wrap">
                    <table class="history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th class="num">SYS</th>
                          <th class="num">DIA</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${this._pagedRows().map((r) => {
                          const s = classifyStatus(r.sys, r.dia);
                          return html`<tr>
                            <td class="date">
                              ${r.taken_at.slice(0, 16).replace('T', ' ')}
                            </td>
                            <td class="num sys">${r.sys}</td>
                            <td class="num dia">${r.dia}</td>
                            <td>
                              <span
                                class="card-badge"
                                style="background:${STATUS_COLORS[s]}"
                                >${STATUS_LABELS[s]}</span
                              >
                            </td>
                            <td class="actions">
                              <button
                                class="btn btn-secondary"
                                @click=${() => this._startEdit(r)}
                              >
                                Edit
                              </button>
                              <button
                                class="btn-danger"
                                @click=${() => this._remove(r.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>`;
                        })}
                      </tbody>
                    </table>
                    <div class="pagination">
                      <button
                        class="btn btn-secondary"
                        @click=${() => this._goToHistoryPage(this.historyPage - 1)}
                        ?disabled=${this.historyPage === 0}
                      >
                        Previous
                      </button>
                      <span class="pagination-info"
                        >Page ${this.historyPage + 1} of
                        ${this._historyPageCount()}</span
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
