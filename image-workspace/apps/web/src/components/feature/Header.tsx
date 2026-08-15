import { CircleHelp, History, Moon, Settings, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface HeaderProps {
  children?: ReactNode
  onSettingsClick?: () => void
  onHistoryClick?: () => void
  onHelpClick?: () => void
  hasToken?: boolean
  theme?: 'light' | 'dark'
  onThemeToggle?: () => void
}

export function Header({
  children,
  onSettingsClick,
  onHistoryClick,
  onHelpClick,
  hasToken,
  theme = 'dark',
  onThemeToggle,
}: HeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-8 grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[auto_1fr_auto]">
      <div className="col-start-1 row-start-2 flex items-center gap-3 sm:col-start-1 sm:row-start-1">
        <LanguageSwitcher />
      </div>

      <div className="col-span-2 row-start-1 min-w-0 text-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <h1 className="whitespace-nowrap text-2xl font-bold tracking-wider text-sky-500 drop-shadow-[0_0_10px_rgba(14,165,233,0.32)] dark:text-orange-500 dark:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] sm:text-4xl">
          {t('header.title')}
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">{t('header.subtitle')}</p>
      </div>

      <div className="col-start-2 row-start-2 flex items-center gap-2 sm:col-start-3 sm:row-start-1">
        {children}
        {onThemeToggle && (
          <button
            type="button"
            onClick={onThemeToggle}
            className="rounded-xl border border-zinc-300 p-2 text-zinc-600 transition-all duration-200 hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-600 active:scale-95 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-sky-300"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            title={theme === 'dark' ? '浅色模式' : '深色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
        {onHelpClick && (
          <button
            type="button"
            onClick={onHelpClick}
            className="rounded-xl border border-zinc-300 p-2 text-zinc-600 transition-colors hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-sky-300"
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
            className="flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-1.5 text-zinc-600 transition-colors hover:border-sky-400 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-sky-300"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{t('history.title')}</span>
          </button>
        )}
        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-1.5 text-zinc-600 transition-colors hover:border-sky-400 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-sky-300"
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
