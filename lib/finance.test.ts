import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addTransaction, allocateToGoal, applyDecision, calculate, deleteGoal, deleteTransaction, demo, FinanceError, forecastPoints,
  inr, parseMoney, payCommitment, setCommitmentActive, simulate, stateSchema, validateState, withdrawFromGoal, type State,
} from './finance'

const freeze = (s: State) => JSON.parse(JSON.stringify(s)) as State

test('demo data is valid and internally consistent', () => {
  const s = demo()
  assert.doesNotThrow(() => validateState(s))
  const m = calculate(s)
  assert.equal(m.totalFunds, 1_000_000)
  assert.equal(m.spent, 272_000)
  assert.equal(m.balance, 728_000)
  assert.equal(m.commitmentsDue, 119_600)
  assert.equal(m.protectedSavings, 150_000)
  assert.equal(m.available, m.balance - m.commitmentsDue - m.protectedSavings)
  assert.equal(m.available, 458_400)
  assert.equal(m.dailyAllowance, Math.floor(458_400 / 19))
  assert.equal(m.risk, 'Low')
  assert.ok(m.health >= 0 && m.health <= 100)
  assert.equal(m.health, m.factors.reduce((n, f) => n + f.score, 0))
})

test('parseMoney converts rupees to integer paise without float drift', () => {
  assert.equal(parseMoney('0.29'), 29)
  assert.equal(parseMoney('1,249.5'), 124_950)
  assert.equal(parseMoney('10000'), 1_000_000)
  assert.throws(() => parseMoney('0'), FinanceError)
  assert.throws(() => parseMoney('12.345'), FinanceError)
  assert.throws(() => parseMoney('-5'), FinanceError)
  assert.throws(() => parseMoney('abc'), FinanceError)
})

test('inr formats paise as Indian rupees', () => {
  assert.equal(inr(1_000_000), '₹10,000')
  assert.equal(inr(124_950), '₹1,249.50')
})

test('simulation never mutates the actual state', () => {
  const s = demo()
  const snapshot = freeze(s)
  const sim = simulate(s, { id: 'd1', kind: 'purchase', name: 'Sneakers', amount: 300_000, category: 'Shopping' })
  assert.deepEqual(s, snapshot)
  assert.equal(sim.before.available, 458_400)
  assert.equal(sim.after.available, 158_400)
  assert.equal(sim.after.spent - sim.before.spent, 300_000)
  assert.ok(sim.allowed)
})

test('applying a decision updates state exactly once', () => {
  const s = demo()
  const d = { id: 'd2', kind: 'purchase' as const, name: 'Concert ticket', amount: 150_000, category: 'Entertainment' as const }
  const once = applyDecision(s, d)
  const twice = applyDecision(once, d)
  assert.equal(once.transactions.length, s.transactions.length + 1)
  assert.equal(twice, once)
  assert.equal(calculate(twice).spent, calculate(s).spent + 150_000)
})

test('purchases that would use protected savings or commitments are blocked with an explanation', () => {
  const s = demo()
  const sim = simulate(s, { id: 'd3', kind: 'purchase', name: 'New phone', amount: 500_000, category: 'Shopping' })
  assert.equal(sim.allowed, false)
  assert.equal(sim.threat, 'savings')
  assert.match(sim.message, /protected/)
  assert.throws(() => applyDecision(s, { id: 'd3', kind: 'purchase', name: 'New phone', amount: 500_000, category: 'Shopping' }), FinanceError)

  const worse = simulate(s, { id: 'd4', kind: 'purchase', name: 'Laptop', amount: 650_000, category: 'Shopping' })
  assert.equal(worse.threat, 'commitments')
  const impossible = simulate(s, { id: 'd5', kind: 'purchase', name: 'Bike', amount: 900_000, category: 'Transport' })
  assert.equal(impossible.threat, 'cash')
})

test('emergencies draw from the emergency fund first and never double count', () => {
  const s = demo()
  const d = { id: 'e1', kind: 'emergency' as const, name: 'Hospital visit', amount: 508_400, category: 'Essentials' as const }
  const sim = simulate(s, d)
  assert.ok(sim.allowed)
  assert.deepEqual(sim.withdrawals.map(w => [w.goalId, w.amount]), [['g1', 50_000]])
  const next = applyDecision(s, d)
  const m = calculate(next)
  assert.equal(m.available, 0)
  assert.equal(m.balance, 728_000 - 508_400)
  assert.equal(m.protectedSavings, 100_000)
  assert.equal(m.balance, m.available + m.commitmentsDue + m.protectedSavings)
})

test('cancelling a subscription frees money only once and leaves original data alone', () => {
  const s = demo()
  const d = { id: 'x1', kind: 'cancel' as const, commitmentId: 'c3' }
  const sim = simulate(s, d)
  assert.equal(sim.after.commitmentsDue, sim.before.commitmentsDue - 14_900)
  assert.equal(s.commitments.find(c => c.id === 'c3')?.status, 'upcoming')
  const next = applyDecision(s, d)
  assert.equal(applyDecision(next, d), next)
  assert.throws(() => simulate(next, { id: 'x2', kind: 'cancel', commitmentId: 'c3' }), FinanceError)
})

test('paying a commitment moves money from commitments to spent without double counting', () => {
  const s = demo()
  const before = calculate(s)
  const paid = payCommitment(s, 'c1')
  const after = calculate(paid)
  assert.equal(after.spent, before.spent + 29_900)
  assert.equal(after.commitmentsDue, before.commitmentsDue - 29_900)
  assert.equal(after.available, before.available)
  assert.throws(() => payCommitment(paid, 'c1'), FinanceError)
  const undone = deleteTransaction(paid, 'payment-c1')
  assert.deepEqual(calculate(undone).available, before.available)
  assert.equal(undone.commitments.find(c => c.id === 'c1')?.status, 'upcoming')
})

test('transactions are validated and cannot overspend free money', () => {
  const s = demo()
  const ok = addTransaction(s, { name: 'Pizza', amount: 45_000, category: 'Food & drinks', type: 'expense', day: 12 }, 'n1')
  assert.equal(calculate(ok).spent, calculate(s).spent + 45_000)
  const income = addTransaction(s, { name: 'Freelance gig', amount: 200_000, category: 'Other', type: 'income', day: 9 }, 'n2')
  assert.equal(calculate(income).available, calculate(s).available + 200_000)
  assert.throws(() => addTransaction(s, { name: '', amount: 100, category: 'Other', type: 'expense', day: 12 }, 'n3'), FinanceError)
  assert.throws(() => addTransaction(s, { name: 'Future', amount: 100, category: 'Other', type: 'expense', day: 20 }, 'n4'), FinanceError)
  assert.throws(() => addTransaction(s, { name: 'Too much', amount: 500_000, category: 'Other', type: 'expense', day: 12 }, 'n5'), FinanceError)
  assert.throws(() => addTransaction(s, { name: 'Fractional paise', amount: 1.5, category: 'Other', type: 'expense', day: 1 }, 'n6'), FinanceError)
  assert.throws(() => deleteTransaction(income, 'n2') && deleteTransaction(addTransaction(income, { name: 'Big buy', amount: 500_000, category: 'Shopping', type: 'expense', day: 12 }, 'n7'), 'n2'), FinanceError)
})

test('savings allocation moves free money into protected savings', () => {
  const s = demo()
  const next = allocateToGoal(s, 'g1', 50_000)
  const m = calculate(next)
  assert.equal(m.protectedSavings, 200_000)
  assert.equal(m.available, calculate(s).available - 50_000)
  assert.throws(() => allocateToGoal(next, 'g1', 50_001), FinanceError)
  assert.throws(() => allocateToGoal(s, 'g1', 0), FinanceError)
  assert.throws(() => allocateToGoal(s, 'g2', 460_000), FinanceError)
  assert.equal(calculate(withdrawFromGoal(next, 'g1', 150_000)).protectedSavings, 50_000)
  assert.equal(calculate(deleteGoal(s, 'g2')).available, calculate(s).available + 50_000)
})

test('reactivating a cancelled subscription requires enough free money', () => {
  const s = setCommitmentActive(demo(), 'c2', false)
  assert.equal(calculate(s).commitmentsDue, 119_600 - 11_900)
  assert.equal(calculate(setCommitmentActive(s, 'c2', true)).commitmentsDue, 119_600)
})

test('forecast matches actual history and ends at the projected closing balance', () => {
  const s = demo()
  const m = calculate(s)
  const points = forecastPoints(s)
  assert.equal(points.length, 30)
  assert.equal(points[s.day - 1].actual, m.balance)
  assert.equal(points[29].projected, m.projectedClosing)
  assert.equal(m.projectedClosing, m.balance - m.commitmentsDue - m.projectedSpending)
})

test('risk rises as spending pace threatens savings', () => {
  const s = addTransaction(demo(), { name: 'Splurge', amount: 300_000, category: 'Shopping', type: 'expense', day: 12 }, 'r1')
  const m = calculate(s)
  assert.notEqual(m.risk, 'Low')
  assert.ok(m.health < calculate(demo()).health)
})

test('corrupted persisted data is rejected', () => {
  const bad = { ...demo(), starting: -5 }
  assert.equal(stateSchema.safeParse(bad).success, false)
})
