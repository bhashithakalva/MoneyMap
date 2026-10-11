import type { Metadata } from 'next'
import { SimulatorView } from '@/components/simulator-view'

export const metadata: Metadata = { title: 'Decision simulator' }

export default function Page() {
  return <SimulatorView />
}
