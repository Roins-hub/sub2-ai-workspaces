## 本地开发与贡献指南

### 1. Fork 并克隆仓库

1. 访问 [https://github.com/WuMingDao/zenith-image-generator](https://github.com/WuMingDao/zenith-image-generator)
2. 点击右上角的 **Fork** 按钮
3. 克隆你 Fork 后的仓库：

```bash
git clone https://github.com/你的用户名/zenith-image-generator.git
cd zenith-image-generator
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp apps/web/.env.example apps/web/.env
```

### 4. 启动开发服务器

**选项 A：使用 Cloudflare Pages 启动全栈服务**

> ⚠️ **征求帮助**: 此方法与 wrangler 4.x 存在兼容性问题。欢迎提交 PR 进行修复！详见 [问题追踪器](https://github.com/WuMingDao/zenith-image-generator/issues/10)。

**选项 B：分别启动前端和 API（推荐）**

在不同的终端中分别运行前端和 API。

```bash
# 步骤 1：在 apps/web/.env 中设置 VITE_API_URL
# VITE_API_URL=http://localhost:8787

# 步骤 2：启动 API（终端 1）
pnpm dev:api

# 步骤 3：启动 Web 前端（终端 2）
pnpm dev:web
```

访问 `http://localhost:5173`

> **注意**：请确保在 `apps/web/.env` 中设置了 `VITE_API_URL=http://localhost:8787`

### 5. 打开浏览器

访问 `http://localhost:5173`

### 6. 运行测试

项目使用 Vitest 进行 API 和前端代码的测试。

```bash
# 以监听模式运行所有测试
pnpm test

# 运行一次测试（CI 模式）
pnpm test:run

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

**测试结构：**

- `apps/api/src/openai/__tests__/` - OpenAI 格式路由测试（`/v1/*`）
- `apps/api/src/providers/__tests__/` - Provider 单元测试（模拟 fetch）
- `apps/api/src/middleware/__tests__/` - 中间件测试
- `apps/api/src/utils/__tests__/` - 工具函数测试
- `apps/web/src/lib/__tests__/` - 前端库测试

**编写测试：**

- 所有外部 API 调用都是模拟的 - 无需真实 API 额度
- 使用 `vi.stubGlobal('fetch', vi.fn())` 模拟 fetch
- 前端测试需要 `@vitest-environment jsdom` 指令
- 提交 PR 前请运行测试

### 7. 局域网访问（可选）

如果你想从本地网络中的其他设备访问开发服务器（例如在手机上进行测试）：

**问题**：默认情况下，前端和 API 仅监听 `localhost`，其他设备无法访问。

**解决方案**：

1. **更新 `.env`** - 将 API 地址指向你机器的局域网 IP：

```bash
# apps/web/.env
VITE_API_URL=http://192.168.1.9:8787 # 替换为你的实际 IP
```

2. **更新 `wrangler.toml`** - 使 API 监听所有网口：

```toml
# apps/api/wrangler.toml
[dev]
port = 8787
ip = "0.0.0.0"

[vars]
CORS_ORIGINS = "http://localhost:5173,http://192.168.1.9:5173" # 添加你的局域网 IP
```

3. **使用 host 标志启动**：

```bash
# 终端 1：启动 API
pnpm dev:api

# 终端 2：启动 Web 前端并开启局域网访问
pnpm dev:web -- --host=0.0.0.0
```

4. **从其他设备访问**：`http://192.168.1.9:5173`

> **提示**：你可以通过 `ip addr` (Linux) 或 `ipconfig` (Windows) 命令查看你的局域网 IP

### 8. 提交 Pull Request

提交 PR 前，请在本地运行以下检查：

```bash
# 1. Lint 和格式检查
pnpm check

# 2. 运行测试
pnpm test:run

# 3. 构建验证无错误
pnpm build
```

**CI 流水线：**

所有 PR 会自动通过 GitHub Actions CI 检查，包括：
- Lint 和格式检查 (`pnpm check`)
- 类型检查 (`tsc --noEmit`)
- 构建所有包
- 运行所有测试

CI 未通过的 PR 无法合并。在本地运行检查可以节省时间和 CI 资源。

**PR 规范：**
- 从 `dev` 分支创建功能分支
- 遵循提交信息规范（见下方）
- 添加新功能时更新相关文档
- 为新功能编写测试

### 9. 提交信息规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范。格式：

```
<类型>(<范围>): <描述>

[可选正文]
```

**类型：**

| 类型 | 描述 |
|------|-------------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 仅文档更新 |
| `style` | 代码风格（格式化，无逻辑变更） |
| `refactor` | 代码重构 |
| `test` | 添加或更新测试 |
| `chore` | 构建、CI、依赖更新 |
| `perf` | 性能优化 |

**范围：**

| 范围 | 描述 |
|-------|-------------|
| `api` | 后端 API (`apps/api`) |
| `web` | 前端 (`apps/web`) |
| `shared` | 共享包 (`packages/shared`) |
| `ci` | GitHub Actions 工作流 |
| `deps` | 依赖项 |

**示例：**

```bash
feat(api): add ModelScope provider support
fix(web): resolve image download on Safari
docs: update API reference with new endpoints
test(api): add provider unit tests
refactor(shared): extract validation utilities
chore(deps): upgrade vitest to v4.0
```

**PR 标题：** 使用与提交信息相同的格式。
