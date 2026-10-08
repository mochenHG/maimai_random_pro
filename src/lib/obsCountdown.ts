/** Absolute deadlines prevent drift when an OBS source is throttled or hidden. */
export function countdownAt(endAt: number, now: number) {
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000))
  return {
    remaining,
    minutes: String(Math.floor(remaining / 60)).padStart(2, '0'),
    seconds: String(remaining % 60).padStart(2, '0'),
    nextDelay: remaining ? Math.max(16, Math.min(1000, endAt - (remaining - 1) * 1000 - now + 5)) : null,
  }
}
