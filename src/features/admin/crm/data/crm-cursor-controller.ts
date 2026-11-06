import type { CrmPage } from './crm-pagination';

export interface CursorSnapshot<T> {
  key: string; rows: T[]; cursor: string | undefined; history: Array<string | undefined>;
  hasMore: boolean; nextCursor: string | null; loading: boolean; error: unknown;
}
const empty = <T>(key: string): CursorSnapshot<T> => ({ key, rows: [], cursor: undefined, history: [], hasMore: false, nextCursor: null, loading: false, error: null });

/** Retains a single server page. A generation protects scope changes and overlapping requests from stale results. */
export class CrmCursorController<T> {
  private state = empty<T>('');
  private generation = 0;
  private loadPage: ((cursor?: string) => Promise<CrmPage<T>>) | undefined;
  private listeners = new Set<() => void>();
  getSnapshot = (): CursorSnapshot<T> => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(state: CursorSnapshot<T>): void { this.state = state; for (const listener of this.listeners) listener(); }
  invalidate = (): void => { this.generation++; };
  configure(key: string, loader: (cursor?: string) => Promise<CrmPage<T>>): Promise<void> {
    this.invalidate(); this.loadPage = loader; this.publish(empty<T>(key));
    return this.run(undefined, []);
  }
  async reloadFor(key: string): Promise<void> { if (key === this.state.key) await this.run(this.state.cursor, this.state.history); }
  async nextFor(key: string): Promise<void> {
    if (key !== this.state.key || this.state.loading || !this.state.hasMore || !this.state.nextCursor) return;
    await this.run(this.state.nextCursor, [...this.state.history, this.state.cursor]);
  }
  async previousFor(key: string): Promise<void> {
    if (key !== this.state.key || this.state.loading || !this.state.history.length) return;
    await this.run(this.state.history[this.state.history.length - 1], this.state.history.slice(0, -1));
  }
  updateFor(key: string, change: T[] | ((rows: T[]) => T[])): void {
    if (key !== this.state.key) return;
    this.publish({ ...this.state, rows: typeof change === 'function' ? change(this.state.rows) : change });
  }
  private async run(cursor: string | undefined, history: Array<string | undefined>): Promise<void> {
    const key = this.state.key; const ticket = ++this.generation; const load = this.loadPage;
    if (!load) return;
    this.publish({ ...empty<T>(key), cursor, history, loading: true });
    try {
      const result = await load(cursor);
      if (ticket !== this.generation || key !== this.state.key) return;
      if (!Array.isArray(result.items) || typeof result.page?.hasMore !== 'boolean' || result.page.hasMore && (!result.page.nextCursor || result.page.nextCursor === cursor || history.includes(result.page.nextCursor))) throw new Error('The CRM returned an invalid page cursor.');
      this.publish({ key, rows: result.items, cursor, history, hasMore: result.page.hasMore, nextCursor: result.page.nextCursor, loading: false, error: null });
    } catch (error) {
      if (ticket === this.generation && key === this.state.key) this.publish({ ...empty<T>(key), cursor, history, error });
    }
  }
}
