/**
 * Event Manager Interface
 * Defines the contract for IPC event management
 */

import type { Window } from "../../main/core/Window";

export interface IEventManager {
  initialize(mainWindow: Window): void;
  registerHandlers(): void;
  cleanup(): void;
}

export interface ITabEvent {
  id: string;
  url?: string;
  title?: string;
  favicon?: string;
  isActive?: boolean;
}
