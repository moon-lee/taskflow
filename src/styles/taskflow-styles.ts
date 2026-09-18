import { css } from 'lit';

// Taskflow view styles — lives in src/styles/.
// All colors resolve through --ff-* tokens (dark + light themes); status
// colors arrive inline from the service layer (STATUS_COLORS).
export const taskflowStyles = css`
  .card-badge {
    display: inline-block;
    font-size: var(--ff-font-sm, 12px);
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 9999px;
    background: var(--ff-border, #3e3e3e);
    color: #fff;
    white-space: nowrap;
  }
  .card-badge.muted {
    background: var(--ff-border, #3e3e3e);
    color: var(--ff-text-muted, #858585);
  }
  .cols {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .col-main {
    flex: 2;
    min-width: 0;
  }
  .col-side {
    flex: 1;
    min-width: 260px;
  }
  @media (max-width: 720px) {
    .cols {
      flex-wrap: wrap;
    }
    .col-main,
    .col-side {
      flex: 1 1 100%;
    }
  }
  .merge-hero {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 16px;
  }
  .hero-nums {
    font-size: 40px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--ff-text-strong, #fff);
    font-variant-numeric: tabular-nums;
  }
  .hero-avg {
    margin-top: 8px;
  }
  .history-avg {
    font-size: var(--ff-font-base, 14px);
    font-weight: 700;
    color: var(--ff-accent, #007acc);
    background: var(--ff-bg-input, #3c3c3c);
    border: 1px solid var(--ff-accent, #007acc);
    padding: 2px 12px;
    border-radius: 9999px;
    white-space: nowrap;
  }
  .form-divider {
    border-top: 1px solid var(--ff-border, #3e3e3e);
  }
  .summary-entry > label {
    display: block;
    margin-bottom: 12px;
  }
  .summary-entry .field-error {
    margin: 4px 0 12px;
  }
  .summary-entry {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 16px;
  }
  .summary-fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .summary-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    justify-content: center;
  }
  .summary-actions .btn-primary {
    align-self: center;
    padding: 8px 16px;
    font-size: var(--ff-font-base, 14px);
  }
  .summary-stepper-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
  }
  .summary-stepper-row input {
    flex: 1;
    min-width: 0;
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--summary-status-color, var(--ff-border, #3e3e3e));
    border-radius: 3px;
    padding: 6px 10px;
    font-size: var(--ff-font-base, 14px);
    font-family: inherit;
    outline: none;
  }
  .summary-stepper-row input:focus {
    border-color: var(--ff-accent, #007acc);
  }
  .summary-stepper-row .stepper {
    min-width: 32px;
    padding: 6px 10px;
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: var(--ff-radius-sm, 3px);
    font-size: var(--ff-font-lg, 15px);
    line-height: 1;
  }
  .summary-stepper-row .stepper:hover {
    border-color: var(--ff-accent, #007acc);
  }
  .stat-line {
    color: var(--ff-text-muted, #858585);
    font-size: var(--ff-font-base, 14px);
    margin: 0;
  }
  .chart-card {
    padding: 12px 16px 8px;
    position: relative;
    height: 220px;
  }
  .chart-card canvas {
    position: absolute;
    inset: 12px 16px 8px;
  }
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid var(--ff-border, #3e3e3e);
  }
  .pagination-info {
    font-size: var(--ff-font-sm, 12px);
    color: var(--ff-text-muted, #858585);
  }
  .btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .section > label {
    display: block;
    padding: 12px 16px;
  }
  .section > p.field-error {
    margin: 0;
    padding: 0 16px 12px;
  }
  .stepper {
    min-width: 32px;
    padding: 6px 10px;
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: var(--ff-radius-sm, 3px);
    font-size: var(--ff-font-lg, 15px);
    line-height: 1;
  }
  .stepper:hover {
    border-color: var(--ff-accent, #007acc);
  }
  .btn-danger {
    background: transparent;
    color: var(--ff-danger, #f48771);
    border: 1px solid var(--ff-danger, #f48771);
    padding: 4px 20px;
    border-radius: 3px;
    font-size: var(--ff-font-base, 14px);
    cursor: pointer;
  }
  .btn-danger:hover {
    background: var(--ff-danger, #f48771);
    color: #fff;
  }
  .btn-sm {
    padding: 2px 12px;
    font-size: var(--ff-font-sm, 12px);
    border-radius: 3px;
  }
  .filter-btn.on {
    border-color: var(--ff-accent, #007acc);
    color: var(--ff-text-strong, #fff);
  }
  .todo-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
  }
  .todo-row:last-child {
    border-bottom: none;
  }
  .todo-row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--ff-accent, #007acc);
    flex-shrink: 0;
  }
  .todo-title {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .todo-title.done {
    text-decoration: line-through;
    opacity: 0.6;
  }
  .todo-edit {
    flex: 1;
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-accent, #007acc);
    border-radius: 3px;
    padding: 6px 10px;
    font-size: var(--ff-font-base, 14px);
    font-family: inherit;
    outline: none;
  }
  .chip-overdue {
    background: #b71c1c;
  }
  .add-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .add-row input[type='text'] {
    flex: 2;
    min-width: 140px;
  }
  .add-row input,
  .add-row select {
    background: var(--ff-bg-input, #3c3c3c);
    color: var(--ff-text, #d4d4d4);
    border: 1px solid var(--ff-border, #3e3e3e);
    border-radius: 3px;
    padding: 6px 10px;
    font-size: var(--ff-font-base, 14px);
    font-family: inherit;
    outline: none;
  }
  .add-row input:focus,
  .add-row select:focus {
    border-color: var(--ff-accent, #007acc);
  }
  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--ff-font-base, 14px);
    table-layout: fixed;
  }
  .history-table thead th {
    text-align: center;
    padding: 10px 8px;
    font-size: var(--ff-font-sm, 12px);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ff-text-muted, #858585);
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
    white-space: nowrap;
  }
  .history-table thead th.num,
  .history-table td.num {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .history-table tbody td {
    padding: 12px 8px;
    border-bottom: 1px solid var(--ff-border, #3e3e3e);
    vertical-align: middle;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .history-table tbody td.date {
    text-align: left;
  }
  .history-table tbody td.actions {
    text-align: right;
    white-space: nowrap;
  }
  .history-table tbody tr:last-child td {
    border-bottom: none;
  }
  .history-table tbody tr:hover {
    background: var(--ff-bg-subpanel, #2a2a2a);
  }
  .history-table td.sys,
  .history-table td.dia {
    font-weight: 700;
    font-size: var(--ff-font-lg, 15px);
    color: var(--ff-text-strong, #fff);
  }
  .history-table td.date {
    color: var(--ff-text-muted, #858585);
  }
  .daynight-icon {
    width: 18px;
    height: 18px;
    display: inline-block;
    vertical-align: middle;
  }
  .chart-legend {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }
  .chart-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--ff-font-sm, 12px);
    color: var(--ff-text-muted, #858585);
  }
  .chart-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .chart-dot.sys {
    background: #ff3b30;
  }
  .chart-dot.dia {
    background: var(--ff-accent, #007acc);
  }
  .history-table td.actions {
    text-align: right;
    white-space: nowrap;
  }
  .history-table td.actions .btn,
  .history-table td.actions .btn-danger {
    padding: 2px 12px;
    font-size: var(--ff-font-sm, 12px);
    border-radius: 3px;
  }
`;
