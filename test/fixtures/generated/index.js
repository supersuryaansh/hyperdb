// This file is autogenerated by the hyperdb compiler
/* eslint-disable camelcase */

const { IndexEncoder, c } = require('hyperdb/runtime')

const { version, resolveStruct } = require('./messages.js')

// '@db/members' collection key
const collection0_key = new IndexEncoder([
  IndexEncoder.STRING
], { prefix: 1 })

function collection0_indexify (record) {
  const arr = []

  const a0 = record.id
  if (a0 === undefined) return arr
  arr.push(a0)

  return arr
}

// '@db/members' reconstruction function
function collection0_reconstruct (version, keyBuf, valueBuf) {
  // TODO: This should be fully code generated
  const key = collection0_key.decode(keyBuf)
  const value = c.decode(resolveStruct('@db/members/value', version), valueBuf)
  return { id: key[0], ...value }
}

// '@db/members'
const collection0 = {
  name: '@db/members',
  encodeKey: function encodeKey (record) {
    const key = [record.id]
    return collection0_key.encode(key)
  },
  encodeKeyRange: function encodeKeyRange ({ gt, lt, gte, lte } = {}) {
    return collection0_key.encodeRange({
      gt: gt ? collection0_indexify(gt) : null,
      lt: lt ? collection0_indexify(lt) : null,
      gte: gte ? collection0_indexify(gte) : null,
      lte: lte ? collection0_indexify(lte) : null
    })
  },
  encodeValue: function encodeValue (version, record) {
    return c.encode(resolveStruct('@db/members/value', version), record)
  },
  reconstruct: collection0_reconstruct,
  indexes: []
}

// '@db/members-by-age' collection key
const index0_key = new IndexEncoder([
  IndexEncoder.UINT,
  IndexEncoder.STRING
], { prefix: 2 })

function index0_indexify (record) {
  const arr = []

  const a0 = record.age
  if (a0 === undefined) return arr
  arr.push(a0)

  const a1 = record.id
  if (a1 === undefined) return arr
  arr.push(a1)

  return arr
}

// '@db/members-by-age'
const index0 = {
  _collectionName: '@db/members',
  name: '@db/members-by-age',
  encodeKey: function encodeKey (record) {
    const key = [record.age, record.id]
    return index0_key.encode(key)
  },
  encodeKeyRange: function encodeKeyRange ({ gt, lt, gte, lte } = {}) {
    return index0_key.encodeRange({
      gt: gt ? index0_indexify(gt) : null,
      lt: lt ? index0_indexify(lt) : null,
      gte: gte ? index0_indexify(gte) : null,
      lte: lte ? index0_indexify(lte) : null
    })
  },
  offset: 0,
  collection: null
}

const IndexMap = new Map([
  ['@db/members-by-age', index0]
])
const CollectionMap = new Map([
  ['@db/members', collection0]
])
const Collections = [...CollectionMap.values()]
const Indexes = [...IndexMap.values()]
for (const index of IndexMap.values()) {
  const collection = CollectionMap.get(index._collectionName)
  collection.indexes.push(index)
  index.collection = collection
  index.offset = collection.indexes.length - 1
}

function resolveCollection (fqn) {
  return CollectionMap.get(fqn) || null
}

function resolveIndex (fqn) {
  return IndexMap.get(fqn) || null
}

module.exports = {
  version,
  collections: Collections,
  indexes: Indexes,
  resolveCollection,
  resolveIndex
}
