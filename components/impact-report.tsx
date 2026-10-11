'use client'

import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CompareForecastChart, Delta, RiskBadge } from '@/components/finance-visuals'
import { inr, type Simulation, type State } from '@/lib/finance'

const points = (n: number) => `${n} pts`

export function ImpactReport({ sim, state }: { sim: Simulation; state: State }) {
  const { before, after } = sim
  const rows = [
    { label: 'Free to spend', b: before.available, a: after.available },
    { label: 'Cash balance', b: before.balance, a: after.balance },
    { label: 'Daily allowance', b: before.dailyAllowance, a: after.dailyAllowance },
    { label: 'Unpaid commitments', b: before.commitmentsDue, a: after.commitmentsDue, inverse: true },
    { label: 'Protected savings', b: before.protectedSavings, a: after.protectedSavings },
    { label: 'Projected month-end cash', b: before.projectedClosing, a: after.projectedClosing },
  ]
  const tone = !sim.allowed ? 'blocked' : sim.threat === 'savings' || after.risk !== 'Low' ? 'warn' : 'ok'

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <Alert variant={tone === 'blocked' ? 'destructive' : 'default'} className={tone === 'ok' ? 'border-success/30 bg-lime/25' : tone === 'warn' ? 'border-warning/30 bg-warning/5' : undefined}>
        {tone === 'blocked' ? <ShieldAlert /> : tone === 'warn' ? <AlertTriangle className="text-warning" /> : <CheckCircle2 className="text-success" />}
        <AlertTitle>{tone === 'blocked' ? 'Not affordable right now' : tone === 'warn' ? 'Affordable, with trade-offs' : 'You can afford this'}</AlertTitle>
        <AlertDescription>{sim.message}</AlertDescription>
      </Alert>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Now</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead className="text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.label}>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{inr(r.b)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{inr(r.a)}</TableCell>
                <TableCell className="text-right"><Delta value={r.a - r.b} inverse={r.inverse} /></TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-medium">Health score</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{before.health}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{after.health}</TableCell>
              <TableCell className="text-right"><Delta value={after.health - before.health} format={points} /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Risk level</TableCell>
              <TableCell className="text-right"><RiskBadge risk={before.risk} /></TableCell>
              <TableCell className="text-right"><RiskBadge risk={after.risk} /></TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {sim.goalImpact.length > 0 && (
        <section aria-labelledby="goal-impact" className="flex flex-col gap-3">
          <h3 id="goal-impact" className="text-sm font-semibold">Savings goals</h3>
          {sim.goalImpact.map(g => (
            <div key={g.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{g.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {g.after === g.before ? `${inr(g.after)} protected` : `${inr(g.before)} → ${inr(g.after)}`}
                </span>
              </div>
              <Progress value={(g.after / g.target) * 100} aria-label={`${g.name} progress after decision`} />
            </div>
          ))}
        </section>
      )}

      {sim.allowed && (
        <section aria-labelledby="forecast-impact" className="flex flex-col gap-2">
          <h3 id="forecast-impact" className="text-sm font-semibold">Rest-of-month forecast</h3>
          <CompareForecastChart before={state} after={sim.next} />
        </section>
      )}
    </div>
  )
}
