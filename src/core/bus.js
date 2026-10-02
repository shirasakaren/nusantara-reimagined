// Tiny event bus. Every system talks through this so modules stay loose.
const handlers = new Map();

export const bus = {
  on(evt, fn) {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt).add(fn);
    return () => handlers.get(evt)?.delete(fn);
  },
  once(evt, fn) {
    const off = bus.on(evt, (d) => { off(); fn(d); });
    return off;
  },
  emit(evt, data) {
    const set = handlers.get(evt);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(data); } catch (e) { console.error('[bus]', evt, e); }
    }
  },
};
