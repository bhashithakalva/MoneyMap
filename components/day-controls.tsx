'use client'

import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { advanceDay, PERIOD_DAYS } from '@/lib/finance'
import { commit, resetDemo, useFinance } from '@/lib/store'

export function DayControls() {
  const state = useFinance()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="hidden tabular-nums sm:inline-flex">
        Day {state.day} of {PERIOD_DAYS}
      </Badge>
      <Button variant="outline" size="sm" disabled={state.day >= PERIOD_DAYS} onClick={() => commit(advanceDay, `Moved to day ${state.day + 1}.`)}>
        Next day
        <ChevronRight data-icon="inline-end" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <RotateCcw />
          <span className="sr-only">Reset demo data</span>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to demo data?</DialogTitle>
            <DialogDescription>This replaces every transaction, budget, goal and subscription with the original demo month. It cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep my data</DialogClose>
            <Button variant="destructive" onClick={() => { resetDemo(); setOpen(false) }}>Reset demo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
