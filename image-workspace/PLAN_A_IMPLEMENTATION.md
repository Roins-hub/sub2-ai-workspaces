# 方案 A：轻量级存储 - 完整实施计划

## 📋 目标概述

将当前的 IndexedDB blob 存储改造为轻量级的 localStorage 元数据存储，参考 HF 渠道 z-image 的实现模式。

**核心变化：**
- ❌ 移除：IndexedDB 存储图片 blob
- ✅ 保留：localStorage 存储图片元数据（URL + 参数）
- ✅ 新增：24 小时过期自动清理机制
- ✅ 新增：历史记录 UI 界面
- ✅ 优化：直接使用远程 URL（通过代理）

---

## 🎯 实施步骤

### 阶段 1：创建历史记录存储模块

#### 1.1 创建 `apps/web/src/lib/historyStore.ts`

**功能：**
- localStorage 存储图片元数据
- 24 小时过期自动清理
- 历史记录 CRUD 操作

**接口设计：**

```typescript
// 历史记录项结构
interface ImageHistoryItem {
  id: string                    // UUID
  url: string                   // HF Space URL (原始 URL)
  proxyUrl: string              // 代理 URL (用于实际加载)
  prompt: string                // 提示词
  negativePrompt?: string       // 负面提示词
  timestamp: number             // 创建时间戳
  expiresAt: number             // 过期时间戳 (timestamp + 24h)
  seed: number                  // 随机种子
  steps: number                 // 推理步数
  model: string                 // 模型名称
  provider: string              // 提供商名称
  width: number                 // 图片宽度
  height: number                // 图片高度
  duration?: string             // 生成耗时
}

// 核心 API
export function saveToHistory(item: Omit<ImageHistoryItem, 'id' | 'expiresAt'>): string
export function getHistory(): ImageHistoryItem[]
export function getValidHistory(): ImageHistoryItem[]  // 只返回未过期的
export function getHistoryById(id: string): ImageHistoryItem | null
export function deleteHistoryItem(id: string): void
export function clearExpiredHistory(): number  // 返回清理数量
export function clearAllHistory(): void
export function getHistoryStats(): { total: number; expired: number; valid: number }
```

**存储键名：**
- `zenith_image_history` - 历史记录数组

**过期策略：**
- 每次调用 `getHistory()` 时自动清理过期记录
- 提供手动清理接口 `clearExpiredHistory()`

---

### 阶段 2：修改图片生成 Hook

#### 2.1 修改 `apps/web/src/hooks/useImageGenerator.ts`

**位置：** `apps/web/src/hooks/useImageGenerator.ts:239-254`

**当前逻辑（需要移除）：**
```typescript
// 第 239-254 行：自动将 HF URL 转换为 blob URL
if (details.url.includes('.hf.space') && details.url.startsWith('http')) {
  try {
    addStatus('Caching image...')
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const proxyUrl = `${apiUrl}/api/proxy-image?url=${encodeURIComponent(details.url)}`
    const response = await fetch(proxyUrl)
    if (response.ok) {
      const blob = await response.blob()
      details.url = URL.createObjectURL(blob)  // ❌ 移除这个转换
    }
  } catch (e) {
    console.warn('Failed to cache HF image:', e)
  }
}
```

**新逻辑：**
```typescript
// 导入历史记录模块
import { saveToHistory } from '@/lib/historyStore'

// 在 handleGenerate 函数中（第 275 行之后）
setImageDetails(details)

// 保存到历史记录
const apiUrl = import.meta.env.VITE_API_URL || ''
const proxyUrl = details.url.includes('.hf.space')
  ? `${apiUrl}/api/proxy-image?url=${encodeURIComponent(details.url)}`
  : details.url

saveToHistory({
  url: details.url,           // 原始 URL
  proxyUrl,                   // 代理 URL
  prompt: details.prompt,
  negativePrompt: details.negativePrompt,
  timestamp: Date.now(),
  seed: details.seed,
  steps: details.steps,
  model: details.model,
  provider: details.provider,
  width,
  height,
  duration: details.duration,
})

toast.success('Image generated!')
```

**影响范围：**
- `handleGenerate` 函数：移除 blob 转换，添加历史记录保存
- 移除 `imageBlobStore` 相关导入（如果有）

---

### 阶段 3：修改图片显示组件

#### 3.1 修改 `apps/web/src/components/feature/ImageResultCard.tsx`

**需要添加的功能：**
1. 图片加载失败处理
2. URL 过期提示
3. 重新生成按钮

**新增状态：**
```typescript
const [imageLoadError, setImageLoadError] = useState(false)
const [isExpired, setIsExpired] = useState(false)

// 检查是否过期（如果有历史记录 ID）
useEffect(() => {
  if (imageDetails?.historyId) {
    const item = getHistoryById(imageDetails.historyId)
    if (item && Date.now() > item.expiresAt) {
      setIsExpired(true)
    }
  }
}, [imageDetails])
```

**图片显示逻辑：**
```typescript
<img
  src={imageDetails.proxyUrl || imageDetails.url}
  alt={imageDetails.prompt}
  onError={() => setImageLoadError(true)}
  onLoad={() => setImageLoadError(false)}
/>

{imageLoadError && (
  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
    <div className="text-center space-y-2">
      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
      <p className="text-sm text-zinc-300">
        {isExpired ? 'Image URL expired (24h limit)' : 'Failed to load image'}
      </p>
      <Button onClick={handleRegenerate} size="sm">
        Regenerate
      </Button>
    </div>
  </div>
)}
```

---

### 阶段 4：创建历史记录 UI

#### 4.1 创建 `apps/web/src/components/feature/ImageHistory.tsx`

**功能：**
- 显示历史记录列表
- 缩略图预览
- 点击加载到主界面
- 删除单条记录
- 清理过期记录
- 清空所有历史

**UI 结构：**
```typescript
export function ImageHistory() {
  const [history, setHistory] = useState<ImageHistoryItem[]>([])
  const [stats, setStats] = useState({ total: 0, expired: 0, valid: 0 })

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const items = getHistory()
    const statsData = getHistoryStats()
    setHistory(items)
    setStats(statsData)
  }

  const handleCleanExpired = () => {
    const count = clearExpiredHistory()
    toast.success(`Cleaned ${count} expired items`)
    loadHistory()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>History ({stats.valid}/{stats.total})</CardTitle>
          <div className="flex gap-2">
            {stats.expired > 0 && (
              <Button variant="outline" size="sm" onClick={handleCleanExpired}>
                Clean Expired ({stats.expired})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {history.map(item => (
            <HistoryItem key={item.id} item={item} onLoad={handleLoad} onDelete={handleDelete} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

**HistoryItem 组件：**
```typescript
function HistoryItem({ item, onLoad, onDelete }) {
  const isExpired = Date.now() > item.expiresAt
  const [imageError, setImageError] = useState(false)

  return (
    <div className={cn(
      "relative group cursor-pointer rounded-lg overflow-hidden border",
      isExpired && "opacity-50 border-yellow-500"
    )}>
      {/* 缩略图 */}
      <img
        src={item.proxyUrl}
        alt={item.prompt}
        className="w-full aspect-square object-cover"
        onError={() => setImageError(true)}
        onClick={() => !imageError && onLoad(item)}
      />

      {/* 过期标记 */}
      {isExpired && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded">
          Expired
        </div>
      )}

      {/* 加载失败 */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
      )}

      {/* Hover 操作 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button size="sm" onClick={() => onLoad(item)}>Load</Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>Delete</Button>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white truncate">{item.prompt}</p>
        <p className="text-xs text-zinc-400">{formatRelativeTime(item.timestamp)}</p>
      </div>
    </div>
  )
}
```

---

### 阶段 5：集成到主界面

#### 5.1 修改 `apps/web/src/pages/ImageGenerator.tsx`

**添加历史记录面板：**

```typescript
import { ImageHistory } from '@/components/feature/ImageHistory'

export default function ImageGenerator() {
  const [showHistory, setShowHistory] = useState(false)

  // ... existing code ...

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Header
            onSettingsClick={() => setShowSettings(true)}
            onHistoryClick={() => setShowHistory(true)}  // 新增
            hasToken={!!currentToken}
          />

          {/* 历史记录侧边栏 */}
          {showHistory && (
            <div className="fixed inset-y-0 right-0 w-96 bg-zinc-900 shadow-xl z-50 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">History</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ImageHistory />
              </div>
            </div>
          )}

          {/* ... existing grid ... */}
        </div>
      </div>
    </div>
  )
}
```

#### 5.2 修改 `apps/web/src/components/feature/Header.tsx`

**添加历史按钮：**
```typescript
export function Header({ onSettingsClick, onHistoryClick, hasToken }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Zenith Image Generator</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onHistoryClick}>
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
        <Button variant="outline" onClick={onSettingsClick}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </header>
  )
}
```

---

### 阶段 6：处理 FlowPageV2 的 imageBlobStore 依赖

**问题：** FlowPageV2 仍在使用 imageBlobStore 进行批量图片存储。

**方案选择：**

**选项 A：保留 imageBlobStore 仅供 FlowPageV2 使用**
- 优点：不影响 FlowPageV2 功能
- 缺点：代码库中存在两套存储逻辑

**选项 B：FlowPageV2 也改用 historyStore**
- 优点：统一存储逻辑
- 缺点：FlowPageV2 需要大量图片，localStorage 可能不够用

**推荐：选项 A**

**实施：**
1. 保留 `apps/web/src/lib/imageBlobStore.ts`
2. 在文件顶部添加注释：
```typescript
/**
 * Image Blob Store - IndexedDB storage for Flow mode
 *
 * NOTE: This module is only used by FlowPageV2 for batch image storage.
 * For single image generation (ImageGenerator page), use historyStore.ts instead.
 *
 * @deprecated for ImageGenerator - use historyStore.ts
 */
```

3. 从 `useImageGenerator.ts` 中移除 imageBlobStore 导入

---

### 阶段 7：数据迁移和清理

#### 7.1 创建迁移脚本（可选）

如果需要将现有 IndexedDB 数据迁移到 localStorage：

```typescript
// apps/web/src/lib/migration.ts
export async function migrateImageBlobToHistory() {
  // 1. 检查是否已迁移
  if (localStorage.getItem('zenith_migration_v1_done')) {
    return
  }

  // 2. 读取现有 imageDetails
  const lastImageDetails = localStorage.getItem('lastImageDetails')
  if (lastImageDetails) {
    try {
      const details = JSON.parse(lastImageDetails)
      // 如果是 blob URL，跳过（已过期）
      if (!details.url.startsWith('blob:')) {
        saveToHistory({
          url: details.url,
          proxyUrl: details.url,
          prompt: details.prompt,
          negativePrompt: details.negativePrompt || '',
          timestamp: Date.now(),
          seed: details.seed || 0,
          steps: details.steps || 9,
          model: details.model || 'unknown',
          provider: details.provider || 'unknown',
          width: 1024,
          height: 1024,
          duration: details.duration,
        })
      }
    } catch (e) {
      console.warn('Migration failed:', e)
    }
  }

  // 3. 标记迁移完成
  localStorage.setItem('zenith_migration_v1_done', 'true')
}
```

在 `App.tsx` 或 `main.tsx` 中调用：
```typescript
useEffect(() => {
  migrateImageBlobToHistory()
}, [])
```

#### 7.2 清理废弃代码

**移除的导入：**
- `apps/web/src/hooks/useImageGenerator.ts` 中的 imageBlobStore 导入（如果有）

**保留的文件：**
- `apps/web/src/lib/imageBlobStore.ts` - 标记为仅供 FlowPageV2 使用

---

## 📁 文件清单

### 新增文件
1. ✅ `apps/web/src/lib/historyStore.ts` - 历史记录存储模块
2. ✅ `apps/web/src/components/feature/ImageHistory.tsx` - 历史记录 UI
3. ✅ `apps/web/src/components/feature/HistoryItem.tsx` - 历史记录项组件
4. ⚠️ `apps/web/src/lib/migration.ts` - 数据迁移脚本（可选）

### 修改文件
1. ✏️ `apps/web/src/hooks/useImageGenerator.ts`
   - 移除第 239-254 行的 blob 转换逻辑
   - 添加 historyStore 导入和保存逻辑

2. ✏️ `apps/web/src/components/feature/ImageResultCard.tsx`
   - 添加图片加载失败处理
   - 添加过期提示
   - 添加重新生成按钮

3. ✏️ `apps/web/src/pages/ImageGenerator.tsx`
   - 添加历史记录侧边栏
   - 集成 ImageHistory 组件

4. ✏️ `apps/web/src/components/feature/Header.tsx`
   - 添加 History 按钮

5. ✏️ `apps/web/src/lib/imageBlobStore.ts`
   - 添加 @deprecated 注释
   - 说明仅供 FlowPageV2 使用

### 保持不变
- ✅ `apps/api/src/app.ts` - 后端代理端点无需修改
- ✅ `apps/api/src/utils/gradio.ts` - Gradio API 调用无需修改
- ✅ `apps/web/src/pages/FlowPageV2.tsx` - 继续使用 imageBlobStore

---

## 🧪 测试计划

### 功能测试

1. **图片生成测试**
   - [ ] 生成图片后自动保存到历史记录
   - [ ] 历史记录包含完整元数据
   - [ ] 图片通过代理 URL 正常显示

2. **历史记录测试**
   - [ ] 历史记录列表正常显示
   - [ ] 缩略图正常加载
   - [ ] 点击历史记录加载到主界面
   - [ ] 删除单条记录功能正常

3. **过期清理测试**
   - [ ] 手动清理过期记录功能正常
   - [ ] 自动清理在每次加载时触发
   - [ ] 过期记录显示警告标记

4. **错误处理测试**
   - [ ] 图片加载失败显示占位符
   - [ ] 过期 URL 显示友好提示
   - [ ] 重新生成按钮功能正常

5. **存储测试**
   - [ ] localStorage 正常读写
   - [ ] 数据格式正确
   - [ ] 不超过 localStorage 容量限制（监控）

### 兼容性测试

1. **FlowPageV2 测试**
   - [ ] FlowPageV2 继续使用 imageBlobStore
   - [ ] 批量生成功能正常
   - [ ] 不受 historyStore 影响

2. **数据迁移测试**
   - [ ] 现有 lastImageDetails 正确迁移
   - [ ] 迁移只执行一次
   - [ ] 迁移失败不影响正常使用

### 性能测试

1. **历史记录性能**
   - [ ] 100+ 条记录加载性能
   - [ ] 缩略图懒加载
   - [ ] 滚动流畅度

2. **存储空间监控**
   - [ ] localStorage 使用量监控
   - [ ] 达到阈值时提示用户

---

## ⚠️ 风险与注意事项

### 1. localStorage 容量限制
- **风险：** localStorage 通常限制 5-10MB
- **缓解：**
  - 只存储元数据（URL 字符串），不存储 blob
  - 24 小时自动清理
  - 监控存储使用量

### 2. URL 过期问题
- **风险：** HF Space URL 24 小时后失效
- **缓解：**
  - 明确标记过期记录
  - 提供重新生成选项
  - 用户教育（提示 URL 有效期）

### 3. 向后兼容性
- **风险：** 现有用户的 IndexedDB 数据丢失
- **缓解：**
  - 提供可选的数据迁移脚本
  - 保留 lastImageDetails 迁移逻辑
  - 在更新日志中说明变更

### 4. FlowPageV2 依赖
- **风险：** FlowPageV2 仍需要 imageBlobStore
- **缓解：**
  - 保留 imageBlobStore 文件
  - 明确标记使用范围
  - 未来可考虑 FlowPageV2 独立存储方案

### 5. 网络依赖
- **风险：** 每次查看历史都需要网络请求
- **缓解：**
  - 使用代理端点缓存（24h）
  - 浏览器自动缓存
  - 离线时显示友好提示

---

## 📊 实施优先级

### P0 - 核心功能（必须完成）
1. ✅ 创建 historyStore.ts
2. ✅ 修改 useImageGenerator.ts 移除 blob 转换
3. ✅ 创建 ImageHistory.tsx 基础 UI
4. ✅ 集成到 ImageGenerator.tsx

### P1 - 用户体验（重要）
1. ✅ 图片加载失败处理
2. ✅ 过期记录标记和清理
3. ✅ 历史记录缩略图优化

### P2 - 增强功能（可选）
1. ⚠️ 数据迁移脚本
2. ⚠️ 存储空间监控
3. ⚠️ 历史记录搜索/筛选

---

## 🚀 实施时间线

**建议分阶段实施：**

1. **第一阶段：核心存储（P0）**
   - 创建 historyStore.ts
   - 修改 useImageGenerator.ts
   - 基础功能测试

2. **第二阶段：UI 集成（P0 + P1）**
   - 创建 ImageHistory.tsx
   - 集成到主界面
   - 添加错误处理

3. **第三阶段：优化和清理（P1 + P2）**
   - 过期清理机制
   - 数据迁移
   - 性能优化

---

## 📝 代码审查检查清单

- [ ] historyStore.ts 的 API 设计合理
- [ ] localStorage 读写有错误处理
- [ ] 过期时间计算正确（24 小时）
- [ ] 图片 URL 正确使用代理
- [ ] UI 组件响应式设计
- [ ] 错误提示用户友好
- [ ] 没有引入安全漏洞（XSS 等）
- [ ] TypeScript 类型定义完整
- [ ] 代码符合项目规范（Biome）
- [ ] 添加必要的注释

---

## 📚 参考资料

- 参考项目 HF 渠道实现：localStorage 元数据存储
- 当前项目后端代理：`apps/api/src/app.ts:654-699`
- Gradio API 调用：`apps/api/src/utils/gradio.ts:90-121`
- HF Spaces 配置：`packages/shared/src/constants/providers.ts:8-14`

---

## ✅ 完成标准

**方案 A 实施完成的标准：**

1. ✅ 用户生成图片后自动保存到 localStorage 历史记录
2. ✅ 历史记录显示最近生成的图片（未过期）
3. ✅ 24 小时后自动清理过期记录
4. ✅ 图片通过代理 URL 正常显示
5. ✅ 图片加载失败有友好提示
6. ✅ 用户可以手动清理历史记录
7. ✅ FlowPageV2 功能不受影响
8. ✅ 所有测试用例通过
9. ✅ 代码通过 lint 和格式检查
10. ✅ 更新 CLAUDE.md 文档说明变更

---

**文档版本：** v1.0
**创建日期：** 2026-01-21
**最后更新：** 2026-01-21
