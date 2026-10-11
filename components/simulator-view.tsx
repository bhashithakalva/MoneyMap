'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CancelSimulator } from '@/components/cancel-simulator'
import { DecisionSimulator, type Preset } from '@/components/decision-simulator'
import { PageIntro } from '@/components/page-intro'

const emergencyPresets: Preset[] = [
  { name: 'Phone screen repair', amount: 250000, category: 'Essentials' },
  { name: 'Doctor visit and medicines', amount: 120000, category: 'Essentials' },
  { name: 'Last-minute train ticket home', amount: 90000, category: 'Transport' },
]

export function SimulatorView() {
  return (
    <>
      <PageIntro>Try a decision before you make it. Every simulation runs on a copy of your data, so you can explore freely.</PageIntro>
      <Tabs defaultValue="purchase">
        <TabsList>
          <TabsTrigger value="purchase">Buy something</TabsTrigger>
          <TabsTrigger value="cancel">Cancel a subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase" className="pt-4"><DecisionSimulator kind="purchase" /></TabsContent>
        <TabsContent value="cancel" className="pt-4"><CancelSimulator /></TabsContent>
      </Tabs>
    </>
  )
}

export function EmergencyView() {
  return (
    <>
      <PageIntro>When something unexpected happens, MoneyMap shows exactly where the money will come from before you commit to it.</PageIntro>
      <DecisionSimulator kind="emergency" presets={emergencyPresets} />
    </>
  )
}
