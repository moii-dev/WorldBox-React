import { WorldEvent } from '../types';
import { EventEmitter } from '../utils/EventEmitter';

export class HistoryManager {
  public eventsList: WorldEvent[] = [];
  private nextEventId: number = 1;
  private events: EventEmitter;

  constructor(events: EventEmitter) {
    this.events = events;
  }

  public logEvent(
    year: number,
    text: string,
    type: WorldEvent['type'],
    color?: string
  ): WorldEvent {
    const event: WorldEvent = {
      id: `evt_${this.nextEventId++}`,
      year,
      text,
      type,
      color,
    };

    this.eventsList.push(event);

    // Keep max 500 events to prevent unbounded memory growth
    if (this.eventsList.length > 500) {
      this.eventsList.shift();
    }

    this.events.emit('worldEventLogged', event);
    return event;
  }

  public getRecentEvents(limit: number = 6): WorldEvent[] {
    return this.eventsList.slice(-limit).reverse();
  }

  public getAllEvents(): WorldEvent[] {
    return [...this.eventsList].reverse();
  }

  public clear(): void {
    this.eventsList = [];
    this.nextEventId = 1;
  }
}
