import type { Metadata } from 'next'
import { SubscriptionsView } from '@/components/subscriptions-view'

export const metadata: Metadata = { title: 'Bills & subscriptions' }

export default function Page() {
  return <SubscriptionsView />
}
