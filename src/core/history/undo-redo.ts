/**
 * Concrete — Undo/Redo Command Manager
 * Phase Zed.12: History & Undo/Redo
 *
 * Implements the Command pattern for undoable operations.
 * Maintains undo/redo stacks, supports batch commands, and
 * integrates with the EventBus and DataAdapter for persistence.
 */

import type { EventBus } from '../events/bus';
import type { DataAdapter } from '../store/adapter';
import { generateId, now } from '../types/base';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Command {
  id: string;
  description: string;
  timestamp: number;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// UndoManager
// ---------------------------------------------------------------------------

export class UndoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number;
  private store: DataAdapter;
  private events: EventBus;

  constructor(store: DataAdapter, events: EventBus, maxHistory = 100) {
    this.store = store;
    this.events = events;
    this.maxHistory = maxHistory;
  }

  /** Execute a command and push to undo stack. */
  async execute(command: Command): Promise<void> {
    await command.execute();

    this.undoStack.push(command);

    // Trim undo stack if it exceeds max history
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.splice(0, this.undoStack.length - this.maxHistory);
    }

    // Clear redo stack — new action invalidates redo history
    this.redoStack = [];

    this.events.emit('history.executed', {
      timestamp: now(),
      commandId: command.id,
      description: command.description,
    });
  }

  /** Undo the last command. */
  async undo(): Promise<Command | null> {
    const command = this.undoStack.pop();
    if (!command) {
      return null;
    }

    await command.undo();
    this.redoStack.push(command);

    this.events.emit('history.undone', {
      timestamp: now(),
      commandId: command.id,
      description: command.description,
    });

    return command;
  }

  /** Redo the last undone command. */
  async redo(): Promise<Command | null> {
    const command = this.redoStack.pop();
    if (!command) {
      return null;
    }

    await command.execute();
    this.undoStack.push(command);

    this.events.emit('history.redone', {
      timestamp: now(),
      commandId: command.id,
      description: command.description,
    });

    return command;
  }

  /** Check if undo is available. */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Check if redo is available. */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Get undo stack for display. */
  getUndoStack(): Array<{ id: string; description: string; timestamp: number }> {
    return this.undoStack.map((cmd) => ({
      id: cmd.id,
      description: cmd.description,
      timestamp: cmd.timestamp,
    }));
  }

  /** Get redo stack for display. */
  getRedoStack(): Array<{ id: string; description: string; timestamp: number }> {
    return this.redoStack.map((cmd) => ({
      id: cmd.id,
      description: cmd.description,
      timestamp: cmd.timestamp,
    }));
  }

  /** Create an insert command. */
  createInsertCommand(
    collection: string,
    record: Record<string, unknown>,
  ): Command {
    const store = this.store;
    const recordId = (record['id'] as string) ?? generateId();
    const recordWithId = { ...record, id: recordId };

    return {
      id: generateId(),
      description: `Insert into ${collection}`,
      timestamp: Date.now(),
      async execute(): Promise<void> {
        await store.insert(collection, recordWithId);
      },
      async undo(): Promise<void> {
        await store.remove(collection, recordId);
      },
    };
  }

  /** Create an update command. */
  createUpdateCommand(
    collection: string,
    id: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Command {
    const store = this.store;

    // Compute the diff — only store changed fields
    const forwardChanges: Record<string, unknown> = {};
    const reverseChanges: Record<string, unknown> = {};

    for (const key of Object.keys(after)) {
      if (after[key] !== before[key]) {
        forwardChanges[key] = after[key];
        reverseChanges[key] = before[key];
      }
    }

    return {
      id: generateId(),
      description: `Update ${collection}/${id}`,
      timestamp: Date.now(),
      async execute(): Promise<void> {
        await store.update(collection, id, forwardChanges);
      },
      async undo(): Promise<void> {
        await store.update(collection, id, reverseChanges);
      },
    };
  }

  /** Create a delete command. */
  createDeleteCommand(
    collection: string,
    record: Record<string, unknown>,
  ): Command {
    const store = this.store;
    const recordId = record['id'] as string;
    const snapshot = { ...record };

    return {
      id: generateId(),
      description: `Delete from ${collection}/${recordId}`,
      timestamp: Date.now(),
      async execute(): Promise<void> {
        await store.remove(collection, recordId);
      },
      async undo(): Promise<void> {
        await store.insert(collection, snapshot);
      },
    };
  }

  /** Create a batch command (e.g., undo entire import). */
  createBatchCommand(description: string, commands: Command[]): Command {
    return {
      id: generateId(),
      description,
      timestamp: Date.now(),
      async execute(): Promise<void> {
        for (const cmd of commands) {
          await cmd.execute();
        }
      },
      async undo(): Promise<void> {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          await commands[i].undo();
        }
      },
    };
  }

  /** Clear all history. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];

    this.events.emit('history.cleared', {
      timestamp: now(),
    });
  }
}
