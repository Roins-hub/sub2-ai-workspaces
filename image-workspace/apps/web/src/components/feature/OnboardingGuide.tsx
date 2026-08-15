import { BookOpen, Check, KeyRound, Layers3, Lightbulb, Settings2, Upload, X } from 'lucide-react'
import { MAX_BATCH_CONCURRENCY } from '@/lib/batchQueue'

interface OnboardingGuideProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    icon: KeyRound,
    title: '1. 先配置图片接口',
    body: (
      <>
        <p>
          点击右上角“API”打开设置。选择一个中转站，或者选择“自定义地址”，只填写站点根地址，例如{' '}
          <code>https://example.com</code>。
        </p>
        <p>
          系统会根据当前模式自动补齐 <code>/v1/images/generations</code>（文字生图）或{' '}
          <code>/v1/images/edits</code>（图生图）。填写图片模型名称，例如 <code>gpt-image-2</code>
          ，再填入中转站提供的 API Key，最后点击保存。
        </p>
      </>
    ),
  },
  {
    icon: BookOpen,
    title: '2. 文字生图',
    body: (
      <>
        <p>
          保持“文字生图”模式，在提示词框描述你想生成的画面。建议写清楚主体、动作、环境、构图、光线、风格和需要出现的文字。
        </p>
        <p>
          可以选择宽高比和清晰度，确认后点击“生成图像”。生成时间取决于中转站和模型，期间请不要重复点击。
        </p>
      </>
    ),
  },
  {
    icon: Upload,
    title: '3. 图生图与多参考图',
    body: (
      <>
        <p>切换到“图生图 / 多参考图”，上传 1 至 4 张 PNG、JPEG 或 WebP 图片，每张不超过 10MB。</p>
        <p>
          上传后在提示词中说明要保留什么、修改什么，例如“保留人物姿势和服装，把背景改成海边黄昏”。图片会通过{' '}
          <code>/v1/images/edits</code> 发送给你的中转站。
        </p>
      </>
    ),
  },
  {
    icon: Layers3,
    title: '4. 批量生图',
    body: (
      <>
        <p>
          切换到“批量生图”后，可以选择“同提示词多张”，使用滑块一次生成 1 到 {MAX_BATCH_CONCURRENCY}{' '}
          张不同结果，生成几张就同时并发几个请求；也可以选择“逐条提示词”，每写好一条就点“确定添加”，最多确认
          8 条，最后统一点击批量生成。
        </p>
        <p>
          “逐条提示词”可以用滑块设置每批 1 到 {MAX_BATCH_CONCURRENCY}{' '}
          个并发，超过并发数的任务会自动进入下一批。每张图会独立显示耗时并保存到历史记录，也可以取消尚未开始的任务、单独重试失败项、下载单张图片，或使用“打包下载”保存全部成功结果。
        </p>
      </>
    ),
  },
  {
    icon: Settings2,
    title: '5. 参数怎么选',
    body: (
      <>
        <p>
          图片设置支持五种宽高比和 720P、1080P、2K、4K
          四档分辨率；背景支持自动、不透明、透明；输出格式支持 PNG、JPEG、WebP。4K
          属于实验性高分辨率，生成时间和费用通常更高。
        </p>
        <p>透明背景通常更适合 PNG。需要更小文件时可选择 JPEG 或 WebP，但它们不保存透明通道。</p>
      </>
    ),
  },
  {
    icon: Lightbulb,
    title: '6. 翻译与提示词优化',
    body: (
      <>
        <p>
          这两个功能调用的是聊天接口 <code>/v1/chat/completions</code>
          ，不一定和图片接口共用同一套能力。需要在 API
          设置中为“提示词优化”和“自动翻译”分别填写支持聊天模型的 Base URL、Key 和模型名。
        </p>
        <p>
          如果你的中转站只提供图片生成，建议关闭自动翻译，直接用中文或英文提示词生成。优化后的文字仍需自行检查，再提交生图。
        </p>
      </>
    ),
  },
  {
    icon: Check,
    title: '7. 历史记录、下载与隐私',
    body: (
      <>
        <p>
          生成成功的图片会保存到当前浏览器的本地存储，不会上传到 Zenith
          服务器。点击顶部“历史记录”可以重新查看、加载、下载或删除图片。
        </p>
        <p>
          历史记录不会在不同浏览器或设备之间同步；清理浏览器站点数据也可能清除图片。API Key
          会保存在当前浏览器，并会发送给你选择的中转站，请不要在公共电脑上保存密钥。
        </p>
      </>
    ),
  },
]

export function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="关闭教程"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
          <div className="pr-4">
            <div className="mb-1 flex items-center gap-2 text-sky-400">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-[0.18em]">Zenith Guide</span>
            </div>
            <h2
              id="onboarding-guide-title"
              className="text-xl font-semibold text-zinc-100 sm:text-2xl"
            >
              新手使用教程
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              从配置中转站到生成、保存图片，一次了解完整流程。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="关闭教程"
            title="关闭教程"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-3">
            {sections.map(({ icon: Icon, title, body }) => (
              <section
                key={title}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5"
              >
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-100 sm:text-base">{title}</h3>
                </div>
                <div className="space-y-2 text-xs leading-6 text-zinc-400 sm:text-sm">{body}</div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3 sm:px-6">
          <p className="text-[11px] text-zinc-600">教程关闭后可点击顶部帮助图标再次打开。</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
          >
            我了解了
          </button>
        </div>
      </div>
    </div>
  )
}
