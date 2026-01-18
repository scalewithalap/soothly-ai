import type { AgentEvent } from "./types";

type EventHandler = (event: AgentEvent) => void | Promise<void>;

export class AgentCommunicator {
  private static instance: AgentCommunicator;
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: AgentEvent[] = [];

  private constructor() {}

  static getInstance(): AgentCommunicator {
    if (!AgentCommunicator.instance) {
      AgentCommunicator.instance = new AgentCommunicator();
    }
    return AgentCommunicator.instance;
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }

  async broadcast(event: AgentEvent): Promise<void> {
    this.eventHistory.push(event);

    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    const handlers = this.subscribers.get(event.eventType);
    if (handlers) {
      await Promise.all(Array.from(handlers).map((handler) => handler(event)));
    }

    // Also notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get("*");
    if (wildcardHandlers) {
      await Promise.all(
        Array.from(wildcardHandlers).map((handler) => handler(event))
      );
    }
  }

  getHistory(limit: number = 100): AgentEvent[] {
    return this.eventHistory.slice(-limit);
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

