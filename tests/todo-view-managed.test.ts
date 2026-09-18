import { describe, it, expect } from 'vitest';
import { TodoListView } from '../src/ui/todo-list-view.js';

function viewWithRoot(root: unknown): any {
  const view = new TodoListView() as any;
  view.getRootNode = () => root;
  return view;
}

describe('todo-list-view managed', () => {
  it('is unmanaged without getRootNode (Node / standalone)', () => {
    const view = new TodoListView() as any;
    expect(view.managed).toBe(false);
  });

  it('is unmanaged when the root has no host (document)', () => {
    expect(viewWithRoot({}).managed).toBe(false);
  });

  it('is managed inside the orchestrator shadow root even though closest() cannot see the host', () => {
    const view = viewWithRoot({
      host: { tagName: 'TASKFLOW-ORCHESTRATOR' },
    });
    // closest() never crosses shadow boundaries — the old implementation
    // relied on it and always saw null here, causing double writes.
    view.closest = () => null;
    expect(view.managed).toBe(true);
  });

  it('is unmanaged under a non-orchestrator host', () => {
    const view = viewWithRoot({ host: { tagName: 'DIV' } });
    expect(view.managed).toBe(false);
  });
});
