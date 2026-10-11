'use client'

import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CancelSimulator } from '@/components/cancel-simulator'
import { PageIntro, StatCard } from '@/components/page-intro'
import { addCommitment, calculate, FinanceError, inr, parseMoney, payCommitment, PERIOD_DAYS, setCommitmentActive, type Commitment } from '@/lib/finance'
import { commit, newId, useFinance } from '@/lib/store'

function AddCommitmentDialog() {
  const state = useFinance()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(form: FormData) {
    try {
      const input = {
        name: String(form.get('name') ?? ''),
        amount: parseMoney(String(form.get('amount') ?? '')),
        day: Number(form.get('day')),
        kind: form.get('kind') === 'bill' ? ('bill' as const) : ('subscription' as const),
      }
      if (commit(s => addCommitment(s, input, newId()), `${input.name.trim()} added. ${inr(input.amount)} reserved.`)) setOpen(false)
    } catch (e) {
      setError(e instanceof FinanceError ? e.message : 'Check the form and try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); setError(null) }}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Add bill or subscription
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a commitment</DialogTitle>
          <DialogDescription>The amount is reserved right away so you can’t accidentally spend it.</DialogDescription>
        </DialogHeader>
        <form id="add-commitment" action={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="c-name">Name</FieldLabel>
              <Input id="c-name" name="name" required maxLength={60} placeholder="Gym membership" autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="c-amount">Amount (₹)</FieldLabel>
                <Input id="c-amount" name="amount" required inputMode="decimal" placeholder="499" aria-invalid={error ? true : undefined} autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-day">Due day</FieldLabel>
                <NativeSelect id="c-day" name="day" defaultValue={String(state.day)} className="w-full">
                  {Array.from({ length: PERIOD_DAYS - state.day + 1 }, (_, i) => state.day + i).map(d => <NativeSelectOption key={d} value={d}>Day {d}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="c-kind">Type</FieldLabel>
              <NativeSelect id="c-kind" name="kind" defaultValue="subscription" className="w-full">
                <NativeSelectOption value="subscription">Subscription</NativeSelectOption>
                <NativeSelectOption value="bill">Bill</NativeSelectOption>
              </NativeSelect>
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="add-commitment">Add commitment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ c, today }: { c: Commitment; today: number }) {
  if (c.status === 'paid') return <Badge className="bg-lime text-navy">Paid</Badge>
  if (c.status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>
  if (c.day < today) return <Badge variant="destructive">Overdue</Badge>
  if (c.day === today) return <Badge variant="outline" className="border-warning/30 text-warning">Due today</Badge>
  return <Badge variant="outline">Upcoming</Badge>
}

export function SubscriptionsView() {
  const state = useFinance()
  const m = calculate(state)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const rows = [...state.commitments].sort((a, b) => a.day - b.day)
  const subs = state.commitments.filter(c => c.kind === 'subscription' && c.status !== 'cancelled')

  return (
    <>
      <PageIntro action={<AddCommitmentDialog />}>Bills and subscriptions are reserved from your balance until paid. Cancel an unpaid subscription to free up its money.</PageIntro>
      <section aria-label="Commitment summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Reserved for unpaid" value={inr(m.commitmentsDue)} hint={`${state.commitments.filter(c => c.status === 'upcoming').length} commitments`} icon={CalendarClock} />
        <StatCard label="Active subscriptions" value={String(subs.length)} hint={`${inr(subs.reduce((n, c) => n + c.amount, 0))} this month`} icon={CalendarClock} />
        <StatCard label="Overdue" value={String(state.commitments.filter(c => c.status === 'upcoming' && c.day < state.day).length)} hint="pay these first" icon={CalendarClock} tone={state.commitments.some(c => c.status === 'upcoming' && c.day < state.day) ? 'bad' : undefined} />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
          <CardDescription>Paying records a Bills expense dated today. Deleting that transaction makes the bill unpaid again.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(c => (
                <TableRow key={c.id} className={c.status === 'cancelled' ? 'text-muted-foreground' : undefined}>
                  <TableCell className="font-medium">
                    {c.name}
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{c.kind}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">Day {c.day}</TableCell>
                  <TableCell><StatusBadge c={c} today={state.day} /></TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(c.amount)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {c.status === 'upcoming' && <Button size="sm" onClick={() => commit(s => payCommitment(s, c.id), `${c.name} paid.`)}>Pay now</Button>}
                      {c.status === 'upcoming' && c.kind === 'subscription' && <Button size="sm" variant="outline" onClick={() => setCancelId(c.id)}>Cancel…</Button>}
                      {c.status === 'cancelled' && <Button size="sm" variant="outline" onClick={() => commit(s => setCommitmentActive(s, c.id, true), `${c.name} reactivated.`)}>Reactivate</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={cancelId !== null} onOpenChange={o => !o && setCancelId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Cancel a subscription</DialogTitle>
            <DialogDescription>Review the impact before you confirm.</DialogDescription>
          </DialogHeader>
          {cancelId && <CancelSimulator initialId={cancelId} onDone={() => setCancelId(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
