'use client'

import { AlertTriangle, CalendarClock, CheckCircle2, Receipt, TrendingDown, Wallet } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DailySpendChart, ForecastChart, HealthRing, RiskBadge } from '@/components/finance-visuals'
import { PageIntro, StatCard } from '@/components/page-intro'
import { calculate, inr } from '@/lib/finance'
import { useFinance } from '@/lib/store'

export function ForecastView() {
  const state = useFinance()
  const m = calculate(state)
  const safe = m.risk === 'Low'
  return (
    <>
      <PageIntro>The projection takes your balance, subtracts scheduled bills on their due days, and assumes you keep spending at your average daily rate.</PageIntro>
      <Alert variant={m.risk === 'High' ? 'destructive' : 'default'} className={safe ? 'border-success/30 bg-lime/25' : m.risk === 'Moderate' ? 'border-warning/30 bg-warning/5' : undefined}>
        {safe ? <CheckCircle2 className="text-success" /> : <AlertTriangle className={m.risk === 'Moderate' ? 'text-warning' : undefined} />}
        <AlertTitle>{safe ? 'On track to finish the month' : m.risk === 'High' ? 'You’re on track to run short' : 'Slow down a little'}</AlertTitle>
        <AlertDescription>{m.riskReasons.join(' ')} {!safe && m.daysLeftIncludingToday > 0 && `Keeping daily spend under ${inr(m.dailyAllowance)} gets you back on track.`}</AlertDescription>
      </Alert>
      <section aria-label="Forecast numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Average daily spend" value={inr(m.averageDailySpend)} hint="excluding bill payments" icon={Receipt} />
        <StatCard label="Safe daily allowance" value={inr(m.dailyAllowance)} hint={`for ${m.daysLeftIncludingToday} remaining days`} icon={Wallet} tone={m.averageDailySpend > m.dailyAllowance ? 'warn' : undefined} />
        <StatCard label="Projected spending" value={inr(m.projectedSpending)} hint="for the rest of the month" icon={TrendingDown} />
        <StatCard label="Projected month-end cash" value={inr(m.projectedClosing)} hint={`${inr(m.protectedSavings)} of it is savings`} icon={CalendarClock} tone={m.projectedClosing < 0 ? 'bad' : m.projectedFreeAtClose < 0 ? 'warn' : undefined} />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Balance over the month</CardTitle>
          <CardDescription>Solid line is what happened. Dashed line is the projection.</CardDescription>
        </CardHeader>
        <CardContent><ForecastChart state={state} className="h-80" /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Daily spending so far</CardTitle>
          <CardDescription>Includes bill payments on the day they were paid.</CardDescription>
        </CardHeader>
        <CardContent><DailySpendChart state={state} /></CardContent>
      </Card>
    </>
  )
}

export function HealthView() {
  const state = useFinance()
  const m = calculate(state)
  return (
    <>
      <PageIntro>Your score is out of 100 and is built from five factors. Each one is explained so you know exactly what moves it.</PageIntro>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Overall score</CardTitle>
            <CardAction><RiskBadge risk={m.risk} /></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <HealthRing score={m.health} size={180} />
            <ul className="flex w-full flex-col gap-2 text-sm text-muted-foreground">
              {m.riskReasons.map(r => <li key={r} className="text-pretty">{r}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score breakdown</CardTitle>
            <CardDescription>Points earned out of the maximum for each factor.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {m.factors.map(f => (
                <li key={f.key} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-sm font-medium tabular-nums">{f.score} / {f.max}</span>
                  </div>
                  <Progress value={(f.score / f.max) * 100} aria-label={`${f.name}: ${f.score} of ${f.max} points`} />
                  <p className="text-pretty text-sm text-muted-foreground">{f.explanation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
