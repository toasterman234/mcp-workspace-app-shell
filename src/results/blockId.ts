let seq = 0
export function nextBlockId(prefix: string): string {
  seq += 1
  return `${prefix}_${seq}_${Math.random().toString(16).slice(2, 8)}`
}
