'use client'

import { useState } from 'react'
import { PiggyBank, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { PageIntro, StatCard } from '@/components/page-intro'
import { addGoal, allocateToGoal, calculate, deleteGoal, FinanceError, inr, parseMoney, withdrawFromGoal, type Goal } from '@/lib/finance'
import { commit, newId, useFinance } from '@/lib/store'

function AddGoalDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(form: FormData) {
    try {
      const input = { name: String(form.get('name') ?? ''), target: parseMoney(String(form.get('target') ?? '')), emergency: form.get('emergency') === 'on' }
      if (commit(s => addGoal(s, input, newId()), `${input.name.trim()} goal created.`)) setOpen(false)
    } catch (e) {
      setError(e instanceof FinanceError ? e.message : 'Check the form and try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); setError(null) }}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        New goal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a savings goal</DialogTitle>
          <DialogDescription>Money you add to a goal is protected and won’t count as free to spend.</DialogDescription>
        </DialogHeader>
        <form id="add-goal" action={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="goal-name">Goal name</FieldLabel>
              <Input id="goal-name" name="name" required maxLength={60} placeholder="Goa trip" autoComplete="off" />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="goal-target">Target (₹)</FieldLabel>
              <Input id="goal-target" name="target" required inputMode="decimal" placeholder="5000" aria-invalid={error ? true : undefined} autoComplete="off" />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field orientation="horizontal">
              <input id="goal-emergency" name="emergency" type="checkbox" className="size-4 accent-primary" />
              <FieldLabel htmlFor="goal-emergency" className="font-normal">This is an emergency fund</FieldLabel>
            </Field>
            <FieldDescription>Emergency funds are used first when an emergency needs more than your free money.</FieldDescription>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="add-goal">Create goal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const [amountText, setAmountText] = useState('')
  const percent = Math.round((goal.saved / goal.target) * 100)

  function move(direction: 'add' | 'withdraw') {
    try {
      const amount = parseMoney(amountText)
      const ok = commit(
        s => (direction === 'add' ? allocateToGoal(s, goal.id, amount) : withdrawFromGoal(s, goal.id, amount)),
        direction === 'add' ? `${inr(amount)} moved into ${goal.name}.` : `${inr(amount)} released from ${goal.name}.`,
      )
      if (ok) setAmountText('')
    } catch (e) {
      toast.error(e instanceof FinanceError ? e.message : 'Invalid amount.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {goal.emergency ? <ShieldCheck aria-hidden="true" className="size-4 text-success" /> : <PiggyBank aria-hidden="true" className="size-4 text-muted-foreground" />}
          {goal.name}
        </CardTitle>
        <CardDescription>{goal.emergency ? 'Emergency fund · used first in emergencies' : 'Protected savings'}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={() => commit(s => deleteGoal(s, goal.id), `${goal.name} deleted. ${inr(goal.saved)} returned to free money.`)}>
            <Trash2 />
            <span className="sr-only">Delete {goal.name}</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums">{inr(goal.saved)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">of {inr(goal.target)}</span>
        </div>
        <Progress value={percent} aria-label={`${goal.name}: ${percent}% funded`} />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{percent}% funded</span>
          {goal.saved >= goal.target ? <Badge className="bg-lime text-navy">Complete</Badge> : <span className="text-muted-foreground tabular-nums">{inr(goal.target - goal.saved)} to go</span>}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <label htmlFor={`goal-amount-${goal.id}`} className="sr-only">Amount for {goal.name} in rupees</label>
        <Input id={`goal-amount-${goal.id}`} value={amountText} onChange={e => setAmountText(e.target.value)} inputMode="decimal" placeholder="₹ amount" className="w-28 flex-1" autoComplete="off" />
        <Button size="sm" onClick={() => move('add')} disabled={!amountText}>Add</Button>
        <Button size="sm" variant="outline" onClick={() => move('withdraw')} disabled={!amountText || goal.saved === 0}>Withdraw</Button>
      </CardFooter>
    </Card>
  )
}

export function GoalsView() {
  const state = useFinance()
  const m = calculate(state)
  return (
    <>
      <PageIntro action={<AddGoalDialog />}>Savings goals are money you’ve locked away. Purchases can’t touch them, and only emergencies can draw on them, with your confirmation.</PageIntro>
      <section aria-label="Savings summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Protected savings" value={inr(m.protectedSavings)} hint={`across ${state.goals.length} goals`} icon={PiggyBank} />
        <StatCard label="Emergency buffer" value={inr(m.emergencySavings)} hint={`target ${inr(Math.round(state.starting * 0.15))}`} icon={ShieldCheck} />
        <StatCard label="Free to move into goals" value={inr(Math.max(0, m.available))} hint="without touching bill money" icon={Plus} />
      </section>
      {state.goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.goals.map(g => <GoalCard key={g.id} goal={g} />)}
        </div>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><PiggyBank /></EmptyMedia>
            <EmptyTitle>No savings goals yet</EmptyTitle>
            <EmptyDescription>Start with a small emergency fund, even ₹500 helps.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}
