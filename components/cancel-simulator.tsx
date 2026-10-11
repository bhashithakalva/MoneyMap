'use client'

import { useState } from 'react'
import { Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ImpactReport } from '@/components/impact-report'
import { applyDecision, inr, simulate } from '@/lib/finance'
import { commit, newId, useFinance } from '@/lib/store'

export function CancelSimulator({ initialId, onDone }: { initialId?: string; onDone?: () => void }) {
  const state = useFinance()
  const active = state.commitments.filter(c => c.kind === 'subscription' && c.status === 'upcoming')
  const [selected, setSelected] = useState(initialId ?? '')
  const [decisionId, setDecisionId] = useState(newId)
  const commitmentId = active.some(c => c.id === selected) ? selected : (active[0]?.id ?? '')
  const target = active.find(c => c.id === commitmentId)
  const decision = target ? { id: decisionId, kind: 'cancel' as const, commitmentId } : null
  const sim = decision ? simulate(state, decision) : null

  function confirm() {
    if (!decision || !target) return
    if (commit(s => applyDecision(s, decision), `${target.name} cancelled. ${inr(target.amount)} freed up.`)) {
      setDecisionId(newId())
      onDone?.()
    }
  }

  if (!target || !sim) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Repeat /></EmptyMedia>
          <EmptyTitle>No active subscriptions</EmptyTitle>
          <EmptyDescription>Every subscription is already paid or cancelled this month.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>What if I cancel?</CardTitle>
          <CardDescription>Cancelling releases the money reserved for an unpaid subscription.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cancel-target">Subscription</FieldLabel>
              <NativeSelect id="cancel-target" value={commitmentId} onChange={e => setSelected(e.target.value)} className="w-full">
                {active.map(c => <NativeSelectOption key={c.id} value={c.id}>{c.name} · {inr(c.amount)} on day {c.day}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={confirm}>Cancel {target.name}</Button>
          {onDone && <Button variant="ghost" onClick={onDone}>Keep it</Button>}
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Impact report</CardTitle>
          <CardDescription>A preview only. Your subscription stays active until you confirm.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImpactReport sim={sim} state={state} />
        </CardContent>
      </Card>
    </div>
  )
}
