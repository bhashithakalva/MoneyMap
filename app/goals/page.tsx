import type { Metadata } from 'next'
import { GoalsView } from '@/components/goals-view'

export const metadata: Metadata = { title: 'Savings goals' }

export default function Page() {
  return <GoalsView />
}
