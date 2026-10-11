'use client'

import Link from 'next/link'
import { ArrowRight, CalendarClock, PiggyBank, Receipt, TrendingDown, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ForecastChart, HealthRing, RiskBadge } from '@/components/finance-visuals'
import { StatCard } from '@/components/page-intro'
import { budgetRows, calculate, inr, PERIOD_DAYS } from '@/lib/finance'
import { useFinance } from '@/lib/store'

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={href} />}>
      {label}
      <ArrowRight data-icon="inline-end" />
    </Button>
  )
}

export function DashboardView() {
  const state = useFinance()
  const m = calculate(state)
  const upcoming = state.commitments.filter(c => c.status === 'upcoming').sort((a, b) => a.day - b.day)
  const recent = [...state.transactions].sort((a, b) => b.day - a.day).slice(0, 5)
  const alerts = budgetRows(state).filter(r => r.status !== 'ok')

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="money-hero relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-navy p-6 text-primary-foreground md:p-8">
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Badge className="bg-lime text-navy">Day {state.day} of {PERIOD_DAYS}</Badge>
            <span className="text-sm text-primary-foreground/70">{m.daysLeftIncludingToday} days left, including today</span>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <p className="text-sm text-primary-foreground/70">Free to spend</p>
            <p className="text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">{inr(Math.max(0, m.available))}</p>
            <p className="text-pretty text-sm text-primary-foreground/70">
              After setting aside {inr(m.commitmentsDue)} for upcoming bills and {inr(m.protectedSavings)} in savings goals.
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/70">Safe to spend today</p>
              <p className="text-3xl font-semibold tabular-nums text-lime">{inr(m.dailyAllowance)}</p>
            </div>
            <Button nativeButton={false} render={<Link href="/simulator" />} className="bg-lime text-navy hover:bg-lime/90">
              Test a decision first
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Financial health</CardTitle>
            <CardDescription>{m.riskReasons[0]}</CardDescription>
            <CardAction><RiskBadge risk={m.risk} /></CardAction>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <HealthRing score={m.health} size={128} />
            <ul className="flex flex-1 flex-col gap-2 text-sm">
              {m.factors.slice(0, 4).map(f => (
                <li key={f.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="font-medium tabular-nums">{f.score}/{f.max}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cash balance" value={inr(m.balance)} hint={`of ${inr(m.totalFunds)} total funds`} icon={Wallet} />
        <StatCard label="Spent so far" value={inr(m.spent)} hint={`${inr(m.averageDailySpend)}/day average`} icon={Receipt} />
        <StatCard label="Upcoming commitments" value={inr(m.commitmentsDue)} hint={`${upcoming.length} unpaid this month`} icon={CalendarClock} />
        <StatCard label="Projected month-end" value={inr(m.projectedClosing)} hint="cash left at your current pace" icon={TrendingDown} tone={m.projectedClosing < 0 ? 'bad' : m.projectedFreeAtClose < 0 ? 'warn' : undefined} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>30-day balance forecast</CardTitle>
          <CardDescription>Actual balance so far, then a projection using your average daily spend and scheduled bills.</CardDescription>
          <CardAction><ViewAll href="/forecast" label="Details" /></CardAction>
        </CardHeader>
        <CardContent><ForecastChart state={state} /></CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming bills</CardTitle>
            <CardAction><ViewAll href="/subscriptions" label="Manage" /></CardAction>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ul className="flex flex-col gap-3">
                {upcoming.slice(0, 5).map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className={c.day < state.day ? 'text-destructive' : 'text-muted-foreground'}>{c.day < state.day ? `Overdue since day ${c.day}` : `Due day ${c.day}`}</span>
                    </div>
                    <span className="font-medium tabular-nums">{inr(c.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">All bills are paid. Nice.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent spending</CardTitle>
            <CardAction><ViewAll href="/transactions" label="All" /></CardAction>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {recent.map(t => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{t.category} · Day {t.day}</span>
                  </div>
                  <span className={t.type === 'income' ? 'font-medium tabular-nums text-success' : 'font-medium tabular-nums'}>{t.type === 'income' ? '+' : '−'}{inr(t.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings & budgets</CardTitle>
            <CardAction><ViewAll href="/goals" label="Goals" /></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {state.goals.slice(0, 2).map(g => (
              <div key={g.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium"><PiggyBank aria-hidden="true" className="size-4 text-muted-foreground" />{g.name}</span>
                  <span className="tabular-nums text-muted-foreground">{inr(g.saved)} / {inr(g.target)}</span>
                </div>
                <Progress value={(g.saved / g.target) * 100} aria-label={`${g.name} progress`} />
              </div>
            ))}
            <Separator />
            {alerts.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {alerts.map(a => (
                  <li key={a.category} className="flex justify-between gap-2">
                    <span>{a.category}</span>
                    <span className={a.status === 'over' ? 'font-medium text-destructive' : 'font-medium text-warning'}>{a.status === 'over' ? `${inr(-a.remaining)} over` : `${a.percent}% used`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Every category is under 80% of its budget.</p>}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
