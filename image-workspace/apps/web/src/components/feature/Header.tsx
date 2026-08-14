import { CircleHelp, History, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface HeaderProps {
  children?: ReactNode
  onSettingsClick?: () => void
  onHistoryClick?: () => void
  onHelpClick?: () => void
  hasToken?: boolean
}

export function Header({
  children,
  onSettingsClick,
  onHistoryClick,
  onHelpClick,
  hasToken,
}: HeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-8 grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
      </div>

      <div className="text-center min-w-0">
        <h1 className="text-2xl sm:text-4xl font-bold text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] tracking-wider break-words">
          {t('header.title')}
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">{t('header.subtitle')}</p>
      </div>

      <div className="flex items-center gap-2">
        {children}
        {onHelpClick && (
          <button
            type="button"
            onClick={onHelpClick}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-200"
            aria-label="打开新手使用教程"
            title="新手使用教程"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        )}
        {onHistoryClick && (
          <button
            type="button"
            onClick={onHistoryClick}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{t('history.title')}</span>
          </button>
        )}
        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{t('common.api')}</span>
            {hasToken && <span className="w-2 h-2 bg-green-500 rounded-full" />}
          </button>
        )}
      </div>
    </div>
  )
}
