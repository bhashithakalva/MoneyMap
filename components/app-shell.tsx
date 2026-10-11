'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeftRight, CalendarClock, FlaskConical, Gauge, HeartPulse, LayoutDashboard, Menu, PiggyBank, Repeat, Siren, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DayControls } from '@/components/day-controls'
import { cn } from '@/lib/utils'

export const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/simulator', label: 'Decision simulator', icon: FlaskConical },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/goals', label: 'Savings goals', icon: PiggyBank },
  { href: '/subscriptions', label: 'Bills & subscriptions', icon: Repeat },
  { href: '/emergencies', label: 'Emergencies', icon: Siren },
  { href: '/forecast', label: 'Forecast', icon: CalendarClock },
  { href: '/health', label: 'Financial health', icon: HeartPulse },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2 py-1">
      <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_4px_18px_rgba(200,241,105,0.16)]">
        <Gauge aria-hidden="true" className="size-4.5" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">MoneyMap</span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  active && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const title = navItems.find(n => (n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)))?.label ?? 'MoneyMap'

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-white/5 bg-gradient-to-b from-sidebar via-sidebar to-[#192233] p-4 lg:flex">
        <Brand />
        <NavLinks />
        <p className="mt-auto px-2 text-xs leading-relaxed text-sidebar-foreground/70">
          Demo data, saved in this browser. Nothing leaves your device.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" />}>
              <Menu />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4 text-sidebar-foreground">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">MoneyMap navigation</SheetTitle>
                <Brand />
              </SheetHeader>
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
          <div className="ml-auto">
            <DayControls />
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
