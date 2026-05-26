const fs = require('fs/promises');
const path = require('path');

class JsonCollection {
  constructor(filename) {
    this.dataPath = path.join(__dirname, '..', '..', 'data', filename);
    this.items = null;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.items) {
      return this.items;
    }

    try {
      const raw = await fs.readFile(this.dataPath, 'utf8');
      const parsed = JSON.parse(raw);
      this.items = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      this.items = [];
      await this.persist();
    }

    return this.items;
  }

  async persist() {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    this.writeQueue = this.writeQueue.then(() => (
      fs.writeFile(this.dataPath, JSON.stringify(this.items || [], null, 2))
    ));
    return this.writeQueue;
  }

  async create(item) {
    const items = await this.load();
    items.push(this.clone(item));
    await this.persist();
    return this.clone(item);
  }

  async list({ filter = () => true, sort = defaultSort, page = 1, limit = 50 } = {}) {
    const items = await this.load();
    const filtered = items.filter(filter).sort(sort);
    const skip = (page - 1) * limit;

    return {
      items: filtered.slice(skip, skip + limit).map((item) => this.clone(item)),
      total: filtered.length
    };
  }

  async all({ filter = () => true, sort = defaultSort } = {}) {
    const items = await this.load();
    return items.filter(filter).sort(sort).map((item) => this.clone(item));
  }

  async findById(id) {
    const items = await this.load();
    const item = items.find((entry) => entry._id === id);
    return item ? this.clone(item) : null;
  }

  async deleteById(id) {
    const items = await this.load();
    const index = items.findIndex((entry) => entry._id === id);
    if (index === -1) {
      return null;
    }

    const [deleted] = items.splice(index, 1);
    await this.persist();
    return this.clone(deleted);
  }

  async updateById(id, updates) {
    const items = await this.load();
    const index = items.findIndex((entry) => entry._id === id);
    if (index === -1) {
      return null;
    }

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    await this.persist();
    return this.clone(items[index]);
  }

  clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

const defaultSort = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

module.exports = JsonCollection;
