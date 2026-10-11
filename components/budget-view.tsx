'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { CategoryChart } from '@/components/finance-visuals'
import { PageIntro } from '@/components/page-intro'
import { budgetRows, FinanceError, inr, parseMoney, setBudget, type Category } from '@/lib/finance'
import { commit, useFinance } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function saveLimit(category: Category, text: string) {
  try {
    const amount = text.trim() === '0' ? 0 : parseMoney(text)
    commit(s => setBudget(s, category, amount), `${category} budget set to ${inr(amount)}.`)
  } catch (e) {
    toast.error(e instanceof FinanceError ? e.message : 'Invalid amount.')
  }
}

export function BudgetView() {
  const state = useFinance()
  const rows = budgetRows(state)
  const totalLimit = rows.reduce((n, r) => n + r.limit, 0)
  const flagged = rows.filter(r => r.status !== 'ok')

  return (
    <>
      <PageIntro>Set a monthly limit per category. You’ll see a warning at 80% and an alert once you go over.</PageIntro>
      {flagged.length > 0 && (
        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="text-warning" />
          <AlertTitle>{flagged.length} {flagged.length === 1 ? 'category needs' : 'categories need'} attention</AlertTitle>
          <AlertDescription>{flagged.map(r => (r.status === 'over' ? `${r.category} is ${inr(-r.remaining)} over` : `${r.category} is at ${r.percent}%`)).join(' · ')}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card>
          <CardHeader>
            <CardTitle>Category limits</CardTitle>
            <CardDescription>Total budgeted: {inr(totalLimit)} of your {inr(state.starting)} starting budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {rows.map(r => (
                <li key={r.category} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.category}</span>
                      {r.status !== 'ok' && <Badge variant={r.status === 'over' ? 'destructive' : 'outline'} className={cn(r.status === 'warning' && 'border-warning/30 text-warning')}>{r.status === 'over' ? 'Over budget' : 'Almost there'}</Badge>}
                    </div>
                    <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); saveLimit(r.category, String(new FormData(e.currentTarget).get('limit') ?? '')) }}>
                      <label htmlFor={`limit-${r.category}`} className="sr-only">{r.category} monthly limit in rupees</label>
                      <Input id={`limit-${r.category}`} key={r.limit} name="limit" defaultValue={r.limit / 100} inputMode="decimal" className="w-28 text-right tabular-nums" />
                      <Button type="submit" variant="outline" size="sm">Save</Button>
                    </form>
                  </div>
                  <Progress value={Math.min(100, r.percent)} aria-label={`${r.category}: ${r.percent}% of budget used`} className={cn(r.status === 'over' && '[&_[data-slot=progress-indicator]]:bg-destructive', r.status === 'warning' && '[&_[data-slot=progress-indicator]]:bg-warning')} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="tabular-nums">{inr(r.spent)} spent · {r.percent}%</span>
                    <span className={cn('tabular-nums', r.remaining < 0 && 'font-medium text-destructive')}>{r.remaining >= 0 ? `${inr(r.remaining)} left` : `${inr(-r.remaining)} over`}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Spent vs budget</CardTitle>
            <CardDescription>Dark bars show spending, lime bars show the limit.</CardDescription>
          </CardHeader>
          <CardContent><CategoryChart state={state} /></CardContent>
        </Card>
      </div>
    </>
  )
}
