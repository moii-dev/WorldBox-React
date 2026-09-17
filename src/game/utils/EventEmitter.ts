type Listener<T = any> = (data: T) => void;

export class EventEmitter {
  private events: Map<string, Set<Listener>> = new Map();

  on<T = any>(event: string, listener: Listener<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  off<T = any>(event: string, listener: Listener<T>): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<T = any>(event: string, data: T): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }
}
