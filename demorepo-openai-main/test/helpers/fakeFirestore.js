/**
 * In-memory Firestore fake for unit tests — NO credentials required.
 *
 * Implements just enough of the Admin SDK surface used by lib/usage.js,
 * lib/entitlements.js and lib/database.js:
 *   - collection(path).doc(id).get()/set()/update()
 *   - collection(path).where(...).limit(...).get() / .orderBy(...).get()
 *   - collection(path).add(data)
 *   - db.runTransaction(async (tx) => ...) with tx.get/set/update
 *   - FieldValue.increment / serverTimestamp sentinel handling
 *
 * Every document is stored as a plain object under a path key like
 * "users/uid/usage/2026-08". FieldValue.increment sentinels are applied as
 * real increments so limit math behaves like production.
 */

const { FieldValue, Timestamp } = require("firebase-admin/firestore");

// FieldValue sentinel detection (works across firebase-admin versions):
//   older:  { _methodName, _increment }
//   newer:  { operand } + prototype getter methodName === "increment"
const isIncrement = (v) =>
  v &&
  typeof v === "object" &&
  ((typeof v.methodName === "string" && v.methodName.endsWith("FieldValue.increment")) ||
    (typeof v.operand === "number" && typeof v._methodName === "string"));

const isServerTimestamp = (v) =>
  v &&
  typeof v === "object" &&
  (typeof v.methodName === "string" && v.methodName.includes("serverTimestamp"));

class FakeDocSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data || null;
  }
  get exists() {
    return !!this._data;
  }
  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

class FakeQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
  }
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
  forEach(cb) {
    this.docs.forEach(cb);
  }
}

class FakeDocRef {
  constructor(fake, path, id) {
    this.fake = fake;
    this.path = path;
    this.id = id;
  }
  collection(name) {
    return new FakeCollectionRef(this.fake, `${this.path}/${name}`);
  }
  async get() {
    const data = this.fake.store[this.path];
    return new FakeDocSnapshot(this.id, data);
  }
  async set(data, opts = {}) {
    const merged = opts && opts.merge;
    const raw = { ...data };
    const existing = this.fake.store[this.path];
    const mergedData = merged && existing ? { ...existing, ...raw } : { ...raw };
    // Apply increment/serverTimestamp sentinels against the target.
    const applied = this.fake.applySentinels(mergedData, existing || {});
    this.fake.store[this.path] = applied;
    return { id: this.id };
  }
  async update(data) {
    const existing = this.fake.store[this.path];
    if (!existing) {
      throw new Error("No document to update");
    }
    const merged = this.fake.applySentinels(data, existing);
    this.fake.store[this.path] = { ...existing, ...merged };
    return { id: this.id };
  }
  async delete() {
    delete this.fake.store[this.path];
    return { id: this.id };
  }
}

class FakeCollectionRef {
  constructor(fake, path) {
    this.fake = fake;
    this.path = path;
    this._where = null;
    this._orderBy = null;
    this._limit = Infinity;
  }
  doc(id) {
    const docId = id || `auto_${this.fake.counter++}`;
    return new FakeDocRef(this.fake, `${this.path}/${docId}`, docId);
  }
  add(data) {
    return this.doc().set(data);
  }
  where(field, op, value) {
    const c = new FakeCollectionRef(this.fake, this.path);
    c._where = { field, op, value };
    return c;
  }
  orderBy(field, dir) {
    const c = new FakeCollectionRef(this.fake, this.path);
    c._orderBy = { field, dir: dir || "asc" };
    return c;
  }
  limit(n) {
    const c = new FakeCollectionRef(this.fake, this.path);
    c._limit = n;
    return c;
  }
  async get() {
    const prefix = `${this.path}/`;
    const entries = Object.entries(this.fake.store).filter(([k]) =>
      k.startsWith(prefix) && !k.slice(prefix.length).includes("/")
    );
    let docs = entries.map(([k, v]) => new FakeDocSnapshot(k.split("/").pop(), { ...v }));

    if (this._where) {
      const { field, op, value } = this._where;
      docs = docs.filter((d) => {
        const actual = d.data()[field];
        if (op === "==") return actual === value;
        return false;
      });
    }
    if (this._orderBy) {
      const { field, dir } = this._orderBy;
      docs = docs.sort((a, b) => {
        const av = a.data()[field];
        const bv = b.data()[field];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      });
    }
    if (Number.isFinite(this._limit) && docs.length > this._limit) {
      docs = docs.slice(0, this._limit);
    }
    return new FakeQuerySnapshot(docs);
  }
}

class FakeTransaction {
  constructor(fake) {
    this.fake = fake;
    this._reads = new Map();
    this._writes = [];
  }
  async get(ref) {
    if (ref instanceof FakeDocRef) {
      const existing = this.fake.store[ref.path];
      return new FakeDocSnapshot(ref.id, existing);
    }
    throw new Error("Unsupported transaction read");
  }
  set(ref, data, opts) {
    this._writes.push({ type: "set", ref, data, opts });
  }
  update(ref, data) {
    this._writes.push({ type: "update", ref, data });
  }
  delete(ref) {
    this._writes.push({ type: "delete", ref });
  }
  _commit() {
    for (const w of this._writes) {
      if (w.type === "set") w.ref.set(w.data, w.opts);
      else if (w.type === "update") w.ref.update(w.data);
      else if (w.type === "delete") w.ref.delete();
    }
  }
}

class FakeFirestore {
  constructor() {
    this.store = {};
    this.counter = 1;
  }
  collection(path) {
    return new FakeCollectionRef(this, path);
  }
  async runTransaction(fn) {
    const tx = new FakeTransaction(this);
    await fn(tx);
    tx._commit();
  }
  applySentinels(incoming, existing) {
    const out = { ...incoming };
    for (const [key, val] of Object.entries(out)) {
      if (isIncrement(val)) {
        const n =
          typeof val.operand === "number"
            ? val.operand
            : typeof val._increment === "number"
              ? val._increment
              : 1;
        const base = typeof existing[key] === "number" ? existing[key] : 0;
        out[key] = base + n;
      } else if (isServerTimestamp(val)) {
        out[key] = Timestamp.now();
      } else if (val instanceof Date) {
        // Real Firestore stores JS Dates as Timestamps.
        out[key] = Timestamp.fromDate(val);
      }
    }
    return out;
  }
}

module.exports = { FakeFirestore, FakeDocRef, FakeCollectionRef };
