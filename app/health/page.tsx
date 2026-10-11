import type { Metadata } from 'next'
import { HealthView } from '@/components/insight-views'

export const metadata: Metadata = { title: 'Financial health' }

export default function Page() {
  return <HealthView />
}
