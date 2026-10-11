'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { budgetRows, forecastPoints, inr, type RiskLevel, type State } from '@/lib/finance'

const compact = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
const tooltipMoney = (value: unknown) => (typeof value === 'number' ? inr(value) : String(value))

const forecastConfig = {
  actual: { label: 'Actual balance', color: 'var(--chart-1)' },
  projected: { label: 'Projected', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function ForecastChart({ state, className }: { state: State; className?: string }) {
  const data = forecastPoints(state)
  return (
    <ChartContainer config={forecastConfig} className={cn('aspect-auto h-64 w-full', className)}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        <defs>
          <linearGradient id="fill-actual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={d => `D${d}`} interval={4} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={compact} />
        <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />
        <ReferenceLine x={state.day} stroke="var(--muted-foreground)" strokeDasharray="2 4" label={{ value: 'Today', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Day ${p?.[0]?.payload?.day ?? ''}`} formatter={(v, n) => <span className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{forecastConfig[n as keyof typeof forecastConfig]?.label}</span><span className="font-mono font-medium tabular-nums">{tooltipMoney(v)}</span></span>} />} />
        <Area dataKey="actual" type="monotone" stroke="var(--color-actual)" strokeWidth={2} fill="url(#fill-actual)" connectNulls={false} />
        <Area dataKey="projected" type="monotone" stroke="var(--color-projected)" strokeWidth={2} strokeDasharray="6 4" fill="transparent" connectNulls={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

const compareConfig = {
  before: { label: 'Without this decision', color: 'var(--chart-4)' },
  after: { label: 'With this decision', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function CompareForecastChart({ before, after }: { before: State; after: State }) {
  const a = forecastPoints(before)
  const b = forecastPoints(after)
  const data = a.filter(p => p.day >= before.day).map((p, i) => ({ day: p.day, before: p.projected, after: b[before.day - 1 + i]?.projected }))
  return (
    <ChartContainer config={compareConfig} className="aspect-auto h-48 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={d => `D${d}`} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={compact} />
        <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Day ${p?.[0]?.payload?.day ?? ''}`} formatter={(v, n) => <span className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{compareConfig[n as keyof typeof compareConfig]?.label}</span><span className="font-mono font-medium tabular-nums">{tooltipMoney(v)}</span></span>} />} />
        <Line dataKey="before" type="monotone" stroke="var(--color-before)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        <Line dataKey="after" type="monotone" stroke="var(--color-after)" strokeWidth={2.5} dot={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}

const categoryConfig = {
  spent: { label: 'Spent', color: 'var(--chart-1)' },
  limit: { label: 'Budget', color: 'var(--chart-3)' },
} satisfies ChartConfig

export function CategoryChart({ state }: { state: State }) {
  const data = budgetRows(state).map(r => ({ category: r.category.replace(' & drinks', ''), spent: r.spent, limit: r.limit }))
  return (
    <ChartContainer config={categoryConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={compact} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => <span className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{categoryConfig[n as keyof typeof categoryConfig]?.label}</span><span className="font-mono font-medium tabular-nums">{tooltipMoney(v)}</span></span>} />} />
        <Bar dataKey="limit" fill="var(--color-limit)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="spent" fill="var(--color-spent)" radius={[6, 6, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

const spendConfig = { spending: { label: 'Spent that day', color: 'var(--chart-1)' } } satisfies ChartConfig

export function DailySpendChart({ state }: { state: State }) {
  const data = forecastPoints(state).filter(p => p.day <= state.day)
  return (
    <ChartContainer config={spendConfig} className="aspect-auto h-48 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={d => `D${d}`} />
        <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={compact} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Day ${p?.[0]?.payload?.day ?? ''}`} formatter={v => <span className="font-mono font-medium tabular-nums">{tooltipMoney(v)}</span>} />} />
        <Bar dataKey="spending" fill="var(--color-spending)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function HealthRing({ score, size = 148, label = true }: { score: number; size?: number; label?: boolean }) {
  const stroke = size / 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const verdict = score >= 75 ? 'Looking good' : score >= 50 ? 'Room to grow' : 'Needs attention'
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Financial health score ${score} out of 100. ${verdict}.`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={score >= 50 ? 'var(--chart-2)' : 'var(--chart-5)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center" aria-hidden="true">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{score}</span>
        {label && <span className="text-xs text-muted-foreground">{verdict}</span>}
      </div>
    </div>
  )
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <Badge variant={risk === 'High' ? 'destructive' : 'outline'} className={cn(risk === 'Low' && 'border-success/30 bg-lime/40 text-success', risk === 'Moderate' && 'border-warning/30 bg-warning/10 text-warning')}>
      {risk} risk
    </Badge>
  )
}

export function Delta({ value, inverse = false, format = inr }: { value: number; inverse?: boolean; format?: (n: number) => string }) {
  if (value === 0) return <span className="text-muted-foreground">No change</span>
  const good = inverse ? value < 0 : value > 0
  return <span className={cn('font-medium tabular-nums', good ? 'text-success' : 'text-destructive')}>{value > 0 ? '+' : '−'}{format(Math.abs(value))}</span>
}
