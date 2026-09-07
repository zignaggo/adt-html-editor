export type NodeId = string

export function createIdFactory(prefix = 'n') {
  let seq = 0
  return function nextId(): NodeId {
    seq += 1
    return `${prefix}${seq.toString(36)}`
  }
}
