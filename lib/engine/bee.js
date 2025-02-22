const HyperBee = require('hyperbee')
const { Readable, getStreamError } = require('streamx')
const c = require('compact-encoding')

class BeeSnapshot {
  constructor (snap) {
    this.refs = 1
    this.snapshot = snap
    this.opened = false
  }

  async ready () {
    await this.snapshot.ready()
    this.opened = true
  }

  ref () {
    this.refs++
    return this
  }

  unref () {
    if (--this.refs === 0) {
      this.snapshot.close().catch(noop)
      this.snapshot = null
    }
  }

  cork () {}

  uncork () {}

  getIndirectRange (reconstruct, entries) {
    const promises = new Array(entries.length)

    for (let i = 0; i < promises.length; i++) {
      const { key, value } = entries[i]
      promises[i] = getWrapped(this.snapshot, key, reconstruct(key, value))
    }

    return promises
  }

  getBatch (keys) {
    const promises = new Array(keys.length)

    for (let i = 0; i < keys.length; i++) {
      promises[i] = getValue(this.snapshot, keys[i])
    }

    return Promise.all(promises)
  }

  get (key) {
    return getValue(this.snapshot, key)
  }

  createReadStream (range, options) {
    return this.snapshot.createReadStream(range, options)
  }
}

class ChangesStream extends Readable {
  constructor (db, version, definition, range) {
    super()

    this.db = db
    this.version = version
    this.definition = definition
    this.stream = null
    this.collectionsById = new Map()
    this.range = range

    for (const c of this.definition.collections) this.collectionsById.set(c.id, c)
  }

  _open (cb) {
    this.stream = this.db.createHistoryStream(this.range)
    this.stream.on('readable', this._ondrain.bind(this))
    this.stream.on('error', noop)
    this.stream.on('close', this._onclose.bind(this))
    cb(null)
  }

  _ondrain () {
    while (Readable.isBackpressured(this) === false) {
      const data = this.stream.read()

      if (data === null) break

      const id = c.uint.decode({ start: 0, end: data.key.byteLength, buffer: data.key })
      const coll = this.collectionsById.get(id)
      if (coll === undefined) continue

      if (data.type === 'put') {
        const doc = coll.reconstruct(this.version, data.key, data.value)
        this.push({ type: 'insert', seq: data.seq, collection: coll.name, value: doc })
      } else {
        const key = coll.reconstructKey(data.key)
        this.push({ type: 'delete', seq: data.seq, collection: coll.name, value: key })
      }
    }
  }

  _onclose () {
    const err = getStreamError(this.stream, { all: true })
    if (err === null) this.push(null)
    else this.destroy(err)
  }

  _read (cb) {
    this._ondrain()
    cb(null)
  }

  _destroy (cb) {
    this.stream.destroy()
    cb(null)
  }
}

module.exports = class BeeEngine {
  constructor (core, { extension } = {}) {
    this.asap = true
    this.clock = 0
    this.refs = 0
    this.core = core
    this.db = new HyperBee(core, {
      extension,
      keyEncoding: 'binary',
      valueEncoding: 'binary'
    })
  }

  get closed () {
    return this.db.closed
  }

  ready () {
    return this.db.ready()
  }

  close () {
    return this.db.close()
  }

  changes (snapshot, version, definition, range) {
    const db = snapshot === null ? this.db : snapshot.snapshot
    return new ChangesStream(db, version, definition, range)
  }

  snapshot () {
    return new BeeSnapshot(this.db.snapshot())
  }

  outdated (snap) {
    return snap === null || this.core.length !== snap.snapshot.core.length || this.core.fork !== snap.snapshot.core.fork
  }

  async commit (updates) {
    this.clock++

    const batch = this.db.batch()
    const entries = updates.batch()

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]

      if (value !== null) await batch.put(key, value)
      else await batch.del(key)
    }

    await batch.flush()
  }
}

async function getWrapped (db, key, value) {
  return { key, value: [value, await getValue(db, value)] }
}

async function getValue (db, key) {
  const node = await db.get(key)
  return node === null ? null : node.value
}

function noop () {}
