import { z } from 'zod'

/** All money values are integer paise (₹1 = 100 paise). */
export const PERIOD_DAYS = 30
export const MAX_MONEY = 100_000_000

export const categories = ['Food & drinks', 'Transport', 'Shopping', 'Entertainment', 'Essentials', 'Bills', 'Other'] as const
export type Category = (typeof categories)[number]

export const moneySchema = z.number().int().nonnegative().max(MAX_MONEY)
const positiveMoney = moneySchema.positive('Amount must be greater than zero.')
const nameSchema = z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name under 60 characters.')
const daySchema = z.number().int().min(1).max(PERIOD_DAYS)

export const transactionSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
  amount: positiveMoney,
  category: z.enum(categories),
  type: z.enum(['income', 'expense']),
  day: daySchema,
  commitmentId: z.string().optional(),
})

export const commitmentSchema = z.object({
  id: z.string().min(1),
  name: nameSchema,
  amount: positiveMoney,
  day: daySchema,
  kind: z.enum(['bill', 'subscription']),
  status: z.enum(['upcoming', 'paid', 'cancelled']),
})

export const goalSchema = z
  .object({ id: z.string().min(1), name: nameSchema, target: positiveMoney, saved: moneySchema, emergency: z.boolean() })
  .refine(g => g.saved <= g.target, 'Saved amount cannot exceed the goal target.')

export const stateSchema = z.object({
  version: z.literal(2),
  starting: positiveMoney,
  day: daySchema,
  transactions: z.array(transactionSchema),
  commitments: z.array(commitmentSchema),
  goals: z.array(goalSchema),
  budgets: z.record(z.enum(categories), moneySchema),
  applied: z.array(z.string()),
})

export type State = z.infer<typeof stateSchema>
export type Transaction = z.infer<typeof transactionSchema>
export type Commitment = z.infer<typeof commitmentSchema>
export type Goal = z.infer<typeof goalSchema>

export type Decision =
  | { id: string; kind: 'purchase' | 'emergency'; name: string; amount: number; category: Category }
  | { id: string; kind: 'cancel'; commitmentId: string }

export class FinanceError extends Error {}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function inr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100)
}

/** Parses a rupee string such as "249" or "249.50" into paise, without floating point drift. */
export function parseMoney(value: string): number {
  const trimmed = value.trim().replace(/,/g, '')
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(trimmed)
  if (!match) throw new FinanceError('Enter an amount in rupees, with up to two decimals.')
  const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  const result = positiveMoney.safeParse(paise)
  if (!result.success) throw new FinanceError(result.error.issues[0]?.message ?? 'Invalid amount.')
  return result.data
}

export function demo(): State {
  return {
    version: 2,
    starting: 1_000_000,
    day: 12,
    applied: [],
    budgets: { 'Food & drinks': 250000, Transport: 100000, Shopping: 120000, Entertainment: 80000, Essentials: 150000, Bills: 125000, Other: 50000 },
    transactions: [
      { id: 't1', name: 'Weekly groceries', amount: 65000, category: 'Essentials', type: 'expense', day: 2 },
      { id: 't2', name: 'Metro card recharge', amount: 30000, category: 'Transport', type: 'expense', day: 3 },
      { id: 't3', name: 'Lunch with friends', amount: 42000, category: 'Food & drinks', type: 'expense', day: 5 },
      { id: 't4', name: 'Phone case', amount: 38000, category: 'Shopping', type: 'expense', day: 7 },
      { id: 't5', name: 'Movie night', amount: 35000, category: 'Entertainment', type: 'expense', day: 8 },
      { id: 't6', name: 'Zomato order', amount: 28000, category: 'Food & drinks', type: 'expense', day: 10 },
      { id: 't7', name: 'Blue Tokai coffee', amount: 22000, category: 'Food & drinks', type: 'expense', day: 11 },
      { id: 't8', name: 'Uber Auto', amount: 12000, category: 'Transport', type: 'expense', day: 12 },
    ],
    commitments: [
      { id: 'c1', name: 'Mobile recharge', amount: 29900, day: 16, kind: 'bill', status: 'upcoming' },
      { id: 'c2', name: 'Spotify Premium', amount: 11900, day: 18, kind: 'subscription', status: 'upcoming' },
      { id: 'c3', name: 'Netflix Mobile', amount: 14900, day: 21, kind: 'subscription', status: 'upcoming' },
      { id: 'c4', name: 'Wi-Fi share', amount: 50000, day: 24, kind: 'bill', status: 'upcoming' },
      { id: 'c5', name: 'YouTube Premium', amount: 12900, day: 27, kind: 'subscription', status: 'upcoming' },
    ],
    goals: [
      { id: 'g1', name: 'Emergency fund', target: 200000, saved: 100000, emergency: true },
      { id: 'g2', name: 'Goa trip', target: 500000, saved: 50000, emergency: false },
    ],
  }
}

export type RiskLevel = 'Low' | 'Moderate' | 'High'
export type Metrics = ReturnType<typeof calculate>

export function calculate(s: State) {
  const expenses = s.transactions.filter(t => t.type === 'expense')
  const income = sum(s.transactions.filter(t => t.type === 'income').map(t => t.amount))
  const spent = sum(expenses.map(t => t.amount))
  const discretionarySpent = sum(expenses.filter(t => !t.commitmentId).map(t => t.amount))

  const totalFunds = s.starting + income
  const balance = totalFunds - spent
  const upcoming = s.commitments.filter(c => c.status === 'upcoming')
  const commitmentsDue = sum(upcoming.map(c => c.amount))
  const protectedSavings = sum(s.goals.map(g => g.saved))
  const emergencySavings = sum(s.goals.filter(g => g.emergency).map(g => g.saved))
  const available = balance - commitmentsDue - protectedSavings

  const daysLeftIncludingToday = PERIOD_DAYS - s.day + 1
  const dailyAllowance = Math.max(0, Math.floor(available / daysLeftIncludingToday))
  const averageDailySpend = Math.round(discretionarySpent / s.day)
  const projectedSpending = averageDailySpend * (PERIOD_DAYS - s.day)
  const projectedClosing = balance - commitmentsDue - projectedSpending
  const projectedFreeAtClose = projectedClosing - protectedSavings

  const byCategory = Object.fromEntries(
    categories.map(c => [c, sum(expenses.filter(t => t.category === c).map(t => t.amount))]),
  ) as Record<Category, number>

  const budgeted = categories.filter(c => s.budgets[c] > 0 || byCategory[c] > 0)
  const adherence = budgeted.length
    ? sum(budgeted.map(c => (byCategory[c] <= s.budgets[c] ? 1 : s.budgets[c] / byCategory[c]))) / budgeted.length
    : 1
  const emergencyTarget = Math.round(s.starting * 0.15)

  const factors = [
    { key: 'budget', name: 'Budget adherence', max: 25, ratio: adherence, explanation: `${budgeted.filter(c => byCategory[c] <= s.budgets[c]).length} of ${budgeted.length} categories are within their limit.` },
    { key: 'pace', name: 'Spending pace', max: 25, ratio: projectedSpending ? clamp01(available / projectedSpending) : 1, explanation: projectedSpending ? `At ${inr(averageDailySpend)}/day you would spend ${inr(projectedSpending)} more; ${inr(Math.max(0, available))} is free to spend.` : 'No spending pace yet.' },
    { key: 'emergency', name: 'Emergency buffer', max: 20, ratio: clamp01(emergencySavings / Math.max(1, emergencyTarget)), explanation: `${inr(emergencySavings)} saved against a ${inr(emergencyTarget)} target (15% of your starting budget).` },
    { key: 'commitments', name: 'Commitment coverage', max: 15, ratio: commitmentsDue ? clamp01((balance - protectedSavings) / commitmentsDue) : 1, explanation: commitmentsDue ? `Unreserved cash covers ${Math.round(clamp01((balance - protectedSavings) / commitmentsDue) * 100)}% of ${inr(commitmentsDue)} in unpaid commitments.` : 'No unpaid commitments.' },
    { key: 'goals', name: 'Goal progress', max: 15, ratio: s.goals.length ? sum(s.goals.map(g => g.saved / g.target)) / s.goals.length : 0, explanation: s.goals.length ? `Goals are ${Math.round((sum(s.goals.map(g => g.saved / g.target)) / s.goals.length) * 100)}% funded on average.` : 'Create a goal to start earning these points.' },
  ].map(f => ({ ...f, score: Math.round(f.max * f.ratio) }))
  const health = sum(factors.map(f => f.score))

  const riskReasons: string[] = []
  let risk: RiskLevel = 'Low'
  if (available < 0) {
    risk = 'High'
    riskReasons.push(`You are ${inr(-available)} short of covering commitments and protected savings.`)
  } else if (projectedClosing < 0) {
    risk = 'High'
    riskReasons.push(`At your current pace you would run out of cash and miss ${inr(-projectedClosing)} of commitments.`)
  } else if (projectedFreeAtClose < 0) {
    risk = 'Moderate'
    riskReasons.push(`At your current pace you would dip ${inr(-projectedFreeAtClose)} into your protected savings.`)
  }
  const over = categories.filter(c => byCategory[c] > s.budgets[c])
  if (over.length) {
    if (risk === 'Low') risk = 'Moderate'
    riskReasons.push(`Over budget in ${over.join(', ')}.`)
  }
  if (!riskReasons.length) riskReasons.push('Commitments and savings are covered at your current pace.')

  return {
    totalFunds, income, spent, discretionarySpent, balance, commitmentsDue, protectedSavings, emergencySavings,
    available, daysLeftIncludingToday, dailyAllowance, averageDailySpend, projectedSpending, projectedClosing,
    projectedFreeAtClose, byCategory, factors, health, risk, riskReasons,
  }
}

export type BudgetStatus = 'ok' | 'warning' | 'over'
export function budgetRows(s: State) {
  const m = calculate(s)
  return categories.map(category => {
    const limit = s.budgets[category]
    const spent = m.byCategory[category]
    const percent = limit ? Math.round((spent / limit) * 100) : spent ? 100 : 0
    const status: BudgetStatus = spent > limit ? 'over' : percent >= 80 ? 'warning' : 'ok'
    return { category, limit, spent, remaining: limit - spent, percent, status }
  })
}

/** Ensures the state is structurally valid and never spends money reserved for commitments or savings. */
export function validateState(s: State): State {
  const parsed = stateSchema.safeParse(s)
  if (!parsed.success) throw new FinanceError(parsed.error.issues[0]?.message ?? 'Invalid data.')
  if (s.transactions.some(t => t.day > s.day)) throw new FinanceError('Transactions cannot be dated in the future.')
  const ids = new Set<string>()
  for (const t of s.transactions) {
    if (ids.has(t.id)) throw new FinanceError('Duplicate transaction detected.')
    ids.add(t.id)
  }
  for (const c of s.commitments) {
    const payments = s.transactions.filter(t => t.commitmentId === c.id).length
    if (payments !== (c.status === 'paid' ? 1 : 0)) throw new FinanceError(`${c.name} payment records are inconsistent.`)
  }
  const m = calculate(s)
  if (m.balance < 0) throw new FinanceError('This would take your balance below zero.')
  if (m.available < 0) {
    const shortfall = inr(-m.available)
    const savingsAtRisk = m.balance - m.commitmentsDue >= 0
    throw new FinanceError(
      savingsAtRisk
        ? `This needs ${shortfall} more than your free money and would eat into your protected savings goals.`
        : `This needs ${shortfall} more than your free money and would leave upcoming commitments unpaid.`,
    )
  }
  return s
}

const newTransactionSchema = transactionSchema.omit({ id: true, commitmentId: true })
export type NewTransaction = z.infer<typeof newTransactionSchema>

export function addTransaction(s: State, input: NewTransaction, id: string): State {
  const parsed = newTransactionSchema.safeParse(input)
  if (!parsed.success) throw new FinanceError(parsed.error.issues[0]?.message ?? 'Invalid transaction.')
  return validateState({ ...s, transactions: [...s.transactions, { ...parsed.data, id }] })
}

export function deleteTransaction(s: State, id: string): State {
  const target = s.transactions.find(t => t.id === id)
  if (!target) return s
  return validateState({
    ...s,
    transactions: s.transactions.filter(t => t.id !== id),
    commitments: s.commitments.map(c => (c.id === target.commitmentId ? { ...c, status: 'upcoming' as const } : c)),
  })
}

export function payCommitment(s: State, id: string): State {
  const c = s.commitments.find(x => x.id === id)
  if (!c || c.status !== 'upcoming') throw new FinanceError('This commitment is not awaiting payment.')
  return validateState({
    ...s,
    commitments: s.commitments.map(x => (x.id === id ? { ...x, status: 'paid' as const } : x)),
    transactions: [...s.transactions, { id: `payment-${id}`, commitmentId: id, name: c.name, amount: c.amount, category: 'Bills', type: 'expense', day: s.day }],
  })
}

const newCommitmentSchema = commitmentSchema.omit({ id: true, status: true })
export function addCommitment(s: State, input: z.infer<typeof newCommitmentSchema>, id: string): State {
  const parsed = newCommitmentSchema.safeParse(input)
  if (!parsed.success) throw new FinanceError(parsed.error.issues[0]?.message ?? 'Invalid commitment.')
  if (parsed.data.day < s.day) throw new FinanceError('Choose a due day from today onwards.')
  return validateState({ ...s, commitments: [...s.commitments, { ...parsed.data, id, status: 'upcoming' }] })
}

export function setCommitmentActive(s: State, id: string, active: boolean): State {
  const c = s.commitments.find(x => x.id === id)
  if (!c || c.status === 'paid') throw new FinanceError('Paid commitments cannot be changed.')
  return validateState({ ...s, commitments: s.commitments.map(x => (x.id === id ? { ...x, status: active ? 'upcoming' : 'cancelled' } : x)) })
}

export function setBudget(s: State, category: Category, amount: number): State {
  return validateState({ ...s, budgets: { ...s.budgets, [category]: moneySchema.parse(amount) } })
}

const newGoalSchema = z.object({ name: nameSchema, target: positiveMoney, emergency: z.boolean() })
export function addGoal(s: State, input: z.infer<typeof newGoalSchema>, id: string): State {
  const parsed = newGoalSchema.safeParse(input)
  if (!parsed.success) throw new FinanceError(parsed.error.issues[0]?.message ?? 'Invalid goal.')
  return validateState({ ...s, goals: [...s.goals, { ...parsed.data, id, saved: 0 }] })
}

export function allocateToGoal(s: State, id: string, amount: number): State {
  const g = s.goals.find(x => x.id === id)
  if (!g) throw new FinanceError('Goal not found.')
  if (!Number.isInteger(amount) || amount <= 0) throw new FinanceError('Enter an amount greater than zero.')
  if (g.saved + amount > g.target) throw new FinanceError(`Only ${inr(g.target - g.saved)} is needed to complete this goal.`)
  return validateState({ ...s, goals: s.goals.map(x => (x.id === id ? { ...x, saved: x.saved + amount } : x)) })
}

export function withdrawFromGoal(s: State, id: string, amount: number): State {
  const g = s.goals.find(x => x.id === id)
  if (!g) throw new FinanceError('Goal not found.')
  if (!Number.isInteger(amount) || amount <= 0 || amount > g.saved) throw new FinanceError(`You can withdraw up to ${inr(g?.saved ?? 0)}.`)
  return validateState({ ...s, goals: s.goals.map(x => (x.id === id ? { ...x, saved: x.saved - amount } : x)) })
}

/** Deleting a goal releases its savings back into free money. */
export function deleteGoal(s: State, id: string): State {
  return validateState({ ...s, goals: s.goals.filter(g => g.id !== id) })
}

export function advanceDay(s: State): State {
  if (s.day >= PERIOD_DAYS) throw new FinanceError('You are already on the last day of this month.')
  return validateState({ ...s, day: s.day + 1 })
}

/** Releases savings to cover an emergency shortfall: emergency funds first, then other goals. */
function coverFromSavings(s: State, shortfall: number) {
  let remaining = shortfall
  const order = [...s.goals].sort((a, b) => Number(b.emergency) - Number(a.emergency))
  const withdrawals: { goalId: string; name: string; amount: number }[] = []
  for (const g of order) {
    if (remaining <= 0) break
    const take = Math.min(g.saved, remaining)
    if (take > 0) withdrawals.push({ goalId: g.id, name: g.name, amount: take })
    remaining -= take
  }
  const goals = s.goals.map(g => {
    const w = withdrawals.find(x => x.goalId === g.id)
    return w ? { ...g, saved: g.saved - w.amount } : g
  })
  return { state: { ...s, goals }, withdrawals }
}

export type Threat = 'none' | 'savings' | 'commitments' | 'cash'

export interface Simulation {
  before: Metrics
  after: Metrics
  next: State
  allowed: boolean
  threat: Threat
  withdrawals: { goalId: string; name: string; amount: number }[]
  message: string
  goalImpact: { id: string; name: string; before: number; after: number; target: number }[]
}

/** Pure: never mutates the input state. */
export function simulate(s: State, d: Decision): Simulation {
  const before = calculate(s)
  let next: State
  let withdrawals: Simulation['withdrawals'] = []

  if (s.applied.includes(d.id)) {
    next = s
  } else if (d.kind === 'cancel') {
    const c = s.commitments.find(x => x.id === d.commitmentId)
    if (!c || c.status !== 'upcoming') throw new FinanceError('This subscription is no longer active.')
    next = { ...s, applied: [...s.applied, d.id], commitments: s.commitments.map(x => (x.id === c.id ? { ...x, status: 'cancelled' as const } : x)) }
  } else {
    const parsed = transactionSchema.safeParse({ id: d.id, name: d.name, amount: d.amount, category: d.category, type: 'expense', day: s.day })
    if (!parsed.success) throw new FinanceError(parsed.error.issues[0]?.message ?? 'Invalid decision.')
    next = { ...s, applied: [...s.applied, d.id], transactions: [...s.transactions, parsed.data] }
    const shortfall = -calculate(next).available
    if (d.kind === 'emergency' && shortfall > 0) {
      const covered = coverFromSavings(next, shortfall)
      next = covered.state
      withdrawals = covered.withdrawals
    }
  }

  const after = calculate(next)
  const threat: Threat = after.balance < 0 ? 'cash' : after.available < 0 ? (after.balance >= after.commitmentsDue ? 'savings' : 'commitments') : withdrawals.length ? 'savings' : 'none'
  const allowed = after.balance >= 0 && after.available >= 0
  const goalImpact = s.goals.map(g => ({ id: g.id, name: g.name, target: g.target, before: g.saved, after: next.goals.find(x => x.id === g.id)?.saved ?? 0 }))

  let message: string
  if (d.kind === 'cancel') message = `Cancelling frees ${inr(before.commitmentsDue - after.commitmentsDue)} and raises your daily allowance by ${inr(after.dailyAllowance - before.dailyAllowance)}.`
  else if (threat === 'cash') message = `You don't have enough cash. This is ${inr(-after.balance)} more than your entire balance.`
  else if (threat === 'commitments') message = `This would leave ${inr(-after.available)} of upcoming commitments unpaid, even after using all savings.`
  else if (threat === 'savings' && d.kind === 'purchase') message = `This needs ${inr(-after.available)} of the money protected for your savings goals. Reduce the amount or withdraw from a goal first.`
  else if (withdrawals.length) message = `Your free money falls short, so ${withdrawals.map(w => `${inr(w.amount)} from ${w.name}`).join(' and ')} would cover the rest.`
  else if (after.risk !== 'Low') message = `Affordable, but your risk becomes ${after.risk.toLowerCase()}: ${after.riskReasons[0]}`
  else message = `Affordable. Your commitments and savings goals stay fully protected.`

  return { before, after, next, allowed, threat, withdrawals, message, goalImpact }
}

/** Applies a decision exactly once. Re-applying the same decision id is a no-op. */
export function applyDecision(s: State, d: Decision): State {
  if (s.applied.includes(d.id)) return s
  const result = simulate(s, d)
  if (!result.allowed) throw new FinanceError(result.message)
  return validateState(result.next)
}

export function forecastPoints(s: State) {
  const m = calculate(s)
  return Array.from({ length: PERIOD_DAYS }, (_, i) => {
    const day = i + 1
    const daySpend = sum(s.transactions.filter(t => t.day === day && t.type === 'expense').map(t => t.amount))
    if (day <= s.day) {
      const balance = s.starting + sum(s.transactions.filter(t => t.day <= day).map(t => (t.type === 'income' ? t.amount : -t.amount)))
      return { day, actual: balance, projected: day === s.day ? balance : null, spending: daySpend }
    }
    const due = sum(s.commitments.filter(c => c.status === 'upcoming' && Math.max(s.day + 1, c.day) <= day).map(c => c.amount))
    return { day, actual: null, projected: m.balance - m.averageDailySpend * (day - s.day) - due, spending: null }
  })
}
