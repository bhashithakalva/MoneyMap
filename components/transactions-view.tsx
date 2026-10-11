'use client'

import { useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageIntro } from '@/components/page-intro'
import { addTransaction, categories, deleteTransaction, FinanceError, inr, parseMoney, type Category } from '@/lib/finance'
import { commit, newId, useFinance } from '@/lib/store'

function AddTransactionDialog() {
  const state = useFinance()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(form: FormData) {
    try {
      const amount = parseMoney(String(form.get('amount') ?? ''))
      const input = {
        name: String(form.get('name') ?? ''),
        amount,
        category: String(form.get('category')) as Category,
        type: form.get('type') === 'income' ? ('income' as const) : ('expense' as const),
        day: Number(form.get('day')),
      }
      if (commit(s => addTransaction(s, input, newId()), `${input.name.trim()} added.`)) {
        setError(null)
        setOpen(false)
      }
    } catch (e) {
      setError(e instanceof FinanceError ? e.message : 'Check the form and try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); setError(null) }}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Add transaction
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a transaction</DialogTitle>
          <DialogDescription>Expenses can’t dip into money reserved for bills or savings goals.</DialogDescription>
        </DialogHeader>
        <form id="add-transaction" action={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tx-name">Description</FieldLabel>
              <Input id="tx-name" name="name" required maxLength={60} placeholder="Chai and samosa" autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="tx-amount">Amount (₹)</FieldLabel>
                <Input id="tx-amount" name="amount" required inputMode="decimal" placeholder="120" aria-invalid={error ? true : undefined} autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="tx-day">Day</FieldLabel>
                <NativeSelect id="tx-day" name="day" defaultValue={String(state.day)} className="w-full">
                  {Array.from({ length: state.day }, (_, i) => i + 1).reverse().map(d => <NativeSelectOption key={d} value={d}>Day {d}{d === state.day ? ' (today)' : ''}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="tx-type">Type</FieldLabel>
                <NativeSelect id="tx-type" name="type" defaultValue="expense" className="w-full">
                  <NativeSelectOption value="expense">Expense</NativeSelectOption>
                  <NativeSelectOption value="income">Income</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="tx-category">Category</FieldLabel>
                <NativeSelect id="tx-category" name="category" defaultValue="Food & drinks" className="w-full">
                  {categories.map(c => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="add-transaction">Save transaction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransactionsView() {
  const state = useFinance()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | Category>('all')

  const rows = [...state.transactions]
    .sort((a, b) => b.day - a.day)
    .filter(t => (category === 'all' || t.category === category) && t.name.toLowerCase().includes(query.trim().toLowerCase()))
  const total = rows.reduce((n, t) => n + (t.type === 'expense' ? t.amount : 0), 0)

  return (
    <>
      <PageIntro action={<AddTransactionDialog />}>Every rupee in and out this month. Removing a bill payment moves it back to upcoming commitments.</PageIntro>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search transactions" aria-label="Search transactions" className="pl-8" />
            </div>
            <NativeSelect value={category} onChange={e => setCategory(e.target.value as 'all' | Category)} aria-label="Filter by category">
              <NativeSelectOption value="all">All categories</NativeSelectOption>
              {categories.map(c => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          {rows.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.name}
                        {t.commitmentId && <Badge variant="secondary" className="ml-2">Bill payment</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.category}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{t.day}</TableCell>
                      <TableCell className={t.type === 'income' ? 'text-right font-medium tabular-nums text-success' : 'text-right font-medium tabular-nums'}>
                        {t.type === 'income' ? '+' : '−'}{inr(t.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => commit(s => deleteTransaction(s, t.id), `${t.name} removed.`)}>
                          <Trash2 />
                          <span className="sr-only">Delete {t.name}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-right text-sm text-muted-foreground">Expenses shown: <span className="font-medium tabular-nums text-foreground">{inr(total)}</span></p>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No transactions found</EmptyTitle>
                <EmptyDescription>Try a different search or category.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  )
}
