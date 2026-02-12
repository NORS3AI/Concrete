/**
 * Phase Zed.17 - EventBus Tests
 * Verifies pub/sub, wildcards, once, unsubscribe, and priority ordering.
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/events/bus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test.event', handler);
    bus.emit('test.event', { data: 'hello' });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'hello' }),
    );
  });

  it('should support wildcard listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('module.*', handler);
    bus.emit('module.activated', { id: 'test' });
    expect(handler).toHaveBeenCalled();
  });

  it('should unsubscribe correctly', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle once listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('test', handler);
    bus.emit('test');
    bus.emit('test');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should respect priority order', () => {
    const bus = new EventBus();
    const order: number[] = [];
    bus.on('test', () => { order.push(1); }, 1);
    bus.on('test', () => { order.push(2); }, 10);
    bus.on('test', () => { order.push(3); }, 5);
    bus.emit('test');
    expect(order).toEqual([2, 3, 1]);
  });
});
