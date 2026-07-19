export type EventMap = Record<string, unknown>;

export class EventBus<Events extends EventMap> {
  private readonly listeners = new Map<
    keyof Events,
    Set<(payload: Events[keyof Events]) => void>
  >();

  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    const eventListeners = this.listeners.get(event) ?? new Set();
    eventListeners.add(listener as (payload: Events[keyof Events]) => void);
    this.listeners.set(event, eventListeners);
    return () => eventListeners.delete(listener as (payload: Events[keyof Events]) => void);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
