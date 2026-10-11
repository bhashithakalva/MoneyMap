import type { Metadata } from 'next'
import { ForecastView } from '@/components/insight-views'

export const metadata: Metadata = { title: 'Forecast' }

export default function Page() {
  return <ForecastView />
}
