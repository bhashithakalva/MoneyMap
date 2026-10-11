import type { Metadata } from 'next'
import { BudgetView } from '@/components/budget-view'

export const metadata: Metadata = { title: 'Budget' }

export default function Page() {
  return <BudgetView />
}
