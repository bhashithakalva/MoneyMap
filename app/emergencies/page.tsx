import type { Metadata } from 'next'
import { EmergencyView } from '@/components/simulator-view'

export const metadata: Metadata = { title: 'Emergencies' }

export default function Page() {
  return <EmergencyView />
}
