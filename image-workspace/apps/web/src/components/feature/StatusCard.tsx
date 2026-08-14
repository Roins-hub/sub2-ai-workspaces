import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface StatusCardProps {
  status: string
}

export function StatusCard({ status }: StatusCardProps) {
  const { t } = useTranslation()
  return (
    <Card className="rounded-2xl border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-zinc-500 text-xs font-normal">{t('status.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-24 w-full rounded-xl border border-zinc-800 bg-black p-3">
          <pre className="text-xs text-zinc-500 whitespace-pre-wrap font-mono">{status}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
