const MIN_GAP = parseInt(process.env.CAMPAIGN_MIN_GAP_SECONDS ?? '8')
const MAX_GAP = parseInt(process.env.CAMPAIGN_MAX_GAP_SECONDS ?? '25')
export const BATCH_SIZE = parseInt(process.env.CAMPAIGN_BATCH_SIZE ?? '10')
const BATCH_PAUSE = parseInt(process.env.CAMPAIGN_BATCH_PAUSE_SECONDS ?? '90')
const QUIET_HOURS = process.env.CAMPAIGN_QUIET_HOURS ?? '22-7'

export function isQuietHour(): boolean {
  const [startH, endH] = QUIET_HOURS.split('-').map(Number)
  // Bogotá = UTC-5
  const hour = new Date(Date.now() - 5 * 3600 * 1000).getUTCHours()
  return startH > endH
    ? hour >= startH || hour < endH
    : hour >= startH && hour < endH
}

function randomGapMs(): number {
  return (MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP)) * 1000
}

export function scheduleRecipients(count: number, baseMs = Date.now()): Date[] {
  const dates: Date[] = []
  let ms = baseMs
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % BATCH_SIZE === 0) {
      ms += BATCH_PAUSE * 1000
    } else if (i > 0) {
      ms += randomGapMs()
    }
    dates.push(new Date(ms))
  }
  return dates
}
