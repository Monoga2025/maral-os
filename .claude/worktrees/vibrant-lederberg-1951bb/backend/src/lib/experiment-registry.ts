export type ExperimentMetric = 'responseRate' | 'conversionRate' | 'revenue'
export type ExperimentStatus = 'running' | 'completed' | 'cancelled'

export interface Cohort {
  name: string
  description: string
}

export interface ExperimentResult {
  cohort: string
  metricValue: number
  sampleSize: number
}

export interface Experiment {
  id: string
  name: string
  hypothesis: string
  metric: ExperimentMetric
  startDate: string
  endDate?: string
  status: ExperimentStatus
  cohorts: Cohort[]
  results?: ExperimentResult[]
  winner?: string
  conclusion?: string
}

const registry = new Map<string, Experiment>()

export const CANDIDATE_EXPERIMENTS: Omit<Experiment, 'id' | 'status' | 'startDate'>[] = [
  {
    name: 'Sábado vs entre semana',
    hypothesis: 'Enviar sábados 9-11am mejora respuesta vs martes-jueves 9-11am',
    metric: 'responseRate',
    cohorts: [
      { name: 'A', description: 'Envío martes-jueves 9-11am' },
      { name: 'B', description: 'Envío sábado 9-11am' },
    ],
  },
  {
    name: 'Emojis en apertura',
    hypothesis: 'Primera línea con emojis aumenta tasa de apertura y respuesta',
    metric: 'responseRate',
    cohorts: [
      { name: 'A', description: 'Sin emojis en primer mensaje' },
      { name: 'B', description: 'Con emojis en primer mensaje' },
    ],
  },
  {
    name: 'Precio temprano vs tardío',
    hypothesis: 'Mostrar precio en paso 1 reduce friction vs mostrarlo en paso 3',
    metric: 'conversionRate',
    cohorts: [
      { name: 'A', description: 'Precio en paso 1' },
      { name: 'B', description: 'Precio en paso 3' },
    ],
  },
]

export function startExperiment(data: Omit<Experiment, 'id' | 'status' | 'startDate'>): Experiment {
  const exp: Experiment = {
    ...data,
    id: `exp_${Date.now()}`,
    status: 'running',
    startDate: new Date().toISOString(),
  }
  registry.set(exp.id, exp)
  console.log(`[experiments] Started: ${exp.name}`)
  return exp
}

export function getExperiments(): Experiment[] {
  return Array.from(registry.values())
}

export function getExperiment(id: string): Experiment | undefined {
  return registry.get(id)
}

export function completeExperiment(id: string, results: ExperimentResult[], winner: string, conclusion: string): void {
  const exp = registry.get(id)
  if (!exp) return
  exp.results = results
  exp.winner = winner
  exp.conclusion = conclusion
  exp.status = 'completed'
  exp.endDate = new Date().toISOString()
  console.log(`[experiments] Completed: ${exp.name} — winner: ${winner}`)
}

// Deterministic cohort assignment — same client always gets same cohort
export function assignCohort(experimentId: string, clientId: string): string {
  const exp = registry.get(experimentId)
  if (!exp || exp.cohorts.length === 0 || exp.status !== 'running') return 'control'
  const hash = clientId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return exp.cohorts[hash % exp.cohorts.length].name
}

// Statistical significance: chi-square p < 0.05 proxy
export function isSignificant(a: ExperimentResult, b: ExperimentResult): boolean {
  if (a.sampleSize < 30 || b.sampleSize < 30) return false
  const diff = Math.abs(a.metricValue - b.metricValue)
  const avg = (a.metricValue + b.metricValue) / 2
  return avg > 0 && diff / avg > 0.05
}
