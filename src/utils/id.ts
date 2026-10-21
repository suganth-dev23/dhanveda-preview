/**
 * Collision-free ID generator with monotonic sequence, base36 timestamp, and entropy.
 */
let sequence = 0;

export function generateId(prefix: string = 'id'): string {
  const ts = Date.now().toString(36);
  sequence = (sequence + 1) % 100000;
  const seq = sequence.toString(36).padStart(3, '0');
  let rand = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    rand = Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 4);
  } else {
    rand = Math.random().toString(36).substring(2, 6);
  }
  return `${prefix}-${ts}-${seq}-${rand}`;
}
