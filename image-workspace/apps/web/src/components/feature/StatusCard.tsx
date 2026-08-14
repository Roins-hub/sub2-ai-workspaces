import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface StatusCardProps {
  status: string
}

export function StatusCard({ status }: StatusCardProps) {
  const { t } = useTranslation()
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-zinc-500 text-xs font-normal">{t('status.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-24 w-full rounded-md border border-zinc-800 bg-black p-3">
          <pre className="text-xs text-zinc-500 whitespace-pre-wrap font-mono">{status}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
