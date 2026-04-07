// Registry - Extensible data registry pattern
// New data items can be added by simply calling registry.register()
export class Registry {
  constructor(name) {
    this.name = name;
    this.items = new Map();
  }

  register(id, data) {
    if (this.items.has(id)) {
      console.warn(`[Registry:${this.name}] Overwriting existing item: ${id}`);
    }
    this.items.set(id, { id, ...data });
  }

  get(id) {
    const item = this.items.get(id);
    if (!item) console.warn(`[Registry:${this.name}] Item not found: ${id}`);
    return item;
  }

  getAll() {
    return Array.from(this.items.values());
  }

  has(id) {
    return this.items.has(id);
  }

  count() {
    return this.items.size;
  }

  ids() {
    return Array.from(this.items.keys());
  }
}

export default Registry;
