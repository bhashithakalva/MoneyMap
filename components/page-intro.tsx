import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PageIntro({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <p className="max-w-2xl text-pretty text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}

export function StatCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: LucideIcon; tone?: 'warn' | 'bad' }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#edf2ee] text-[#426b55] ring-1 ring-[#dce6de]">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        </div>
        <span className={cn('text-[1.7rem] font-semibold tracking-tight tabular-nums sm:text-3xl', tone === 'warn' && 'text-warning', tone === 'bad' && 'text-destructive')}>{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  )
}
