'use client'

import { useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ImpactReport } from '@/components/impact-report'
import { applyDecision, calculate, categories, FinanceError, inr, parseMoney, simulate, type Category, type Decision } from '@/lib/finance'
import { commit, newId, useFinance } from '@/lib/store'

export type Preset = { name: string; amount: number; category: Category }

function readAmount(text: string): { amount?: number; error?: string } {
  if (!text.trim()) return {}
  try {
    return { amount: parseMoney(text) }
  } catch (e) {
    return { error: e instanceof FinanceError ? e.message : 'Invalid amount.' }
  }
}

export function DecisionSimulator({ kind, presets = [] }: { kind: 'purchase' | 'emergency'; presets?: Preset[] }) {
  const state = useFinance()
  const [decisionId, setDecisionId] = useState(newId)
  const [name, setName] = useState('')
  const [amountText, setAmountText] = useState('')
  const [category, setCategory] = useState<Category>(kind === 'emergency' ? 'Essentials' : 'Shopping')

  const { amount, error: amountError } = readAmount(amountText)
  const ready = name.trim().length > 0 && amount !== undefined
  const decision: Decision | null = ready ? { id: decisionId, kind, name: name.trim(), amount, category } : null

  let sim = null
  let simError: string | null = null
  if (decision) {
    try {
      sim = simulate(state, decision)
    } catch (e) {
      simError = e instanceof FinanceError ? e.message : 'Could not simulate this decision.'
    }
  }

  function clear() {
    setName('')
    setAmountText('')
    setDecisionId(newId())
  }

  function apply() {
    if (!decision || decision.kind === 'cancel') return
    const label = decision.name
    const ok = commit(s => applyDecision(s, decision), kind === 'emergency' ? `${label} recorded as an emergency expense.` : `${label} added to your spending.`)
    if (ok) clear()
  }

  const copy = kind === 'emergency'
    ? { title: 'Plan for the unexpected', description: 'Emergencies use free money first, then your emergency fund, then other goals. Unpaid bills always stay protected.', action: 'Record emergency' }
    : { title: 'What if I buy this?', description: 'See the full impact before spending. Nothing changes until you apply the decision.', action: 'Apply decision' }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Common emergencies">
              {presets.map(p => (
                <Button key={p.name} variant="outline" size="sm" onClick={() => { setName(p.name); setAmountText(String(p.amount / 100)); setCategory(p.category) }}>
                  {p.name} · {inr(p.amount)}
                </Button>
              ))}
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); if (sim?.allowed) apply() }}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${kind}-name`}>{kind === 'emergency' ? 'What happened?' : 'What do you want to buy?'}</FieldLabel>
                <Input id={`${kind}-name`} value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder={kind === 'emergency' ? 'Phone screen repair' : 'Concert tickets'} autoComplete="off" />
              </Field>
              <Field data-invalid={amountError ? true : undefined}>
                <FieldLabel htmlFor={`${kind}-amount`}>Amount (₹)</FieldLabel>
                <Input id={`${kind}-amount`} value={amountText} onChange={e => setAmountText(e.target.value)} inputMode="decimal" placeholder="2500" aria-invalid={amountError ? true : undefined} aria-describedby={`${kind}-amount-help`} autoComplete="off" />
                {amountError ? <FieldError>{amountError}</FieldError> : <FieldDescription id={`${kind}-amount-help`}>You have {inr(Math.max(0, calculate(state).available))} free to spend.</FieldDescription>}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${kind}-category`}>Category</FieldLabel>
                <NativeSelect id={`${kind}-category`} value={category} onChange={e => setCategory(e.target.value as Category)} className="w-full">
                  {categories.map(c => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={apply} disabled={!sim?.allowed}>{copy.action}</Button>
          <Button variant="ghost" onClick={clear} disabled={!name && !amountText}>
            <RotateCcw data-icon="inline-start" />
            Discard
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impact report</CardTitle>
          <CardDescription>A preview only. Your real data stays the same until you apply.</CardDescription>
        </CardHeader>
        <CardContent>
          {sim ? (
            <ImpactReport sim={sim} state={state} />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FlaskConical /></EmptyMedia>
                <EmptyTitle>{simError ? 'Can’t simulate this' : 'Enter a decision to see its impact'}</EmptyTitle>
                <EmptyDescription>{simError ?? 'Add a name and amount. MoneyMap will show what happens to your balance, allowance, savings and risk.'}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
