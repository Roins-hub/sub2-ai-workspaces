# Sub2 AI Workspaces

一套面向 OpenAI 兼容中转站的 AI 工作台，包含统一首页、图像生成工作台和聊天工作台。

## 项目结构

| 目录 | 线上地址 | 说明 |
| --- | --- | --- |
| `home/` | https://first.sub2image.cc.cd | 工作台入口首页 |
| `image-workspace/` | https://sub2image.cc.cd | Zenith 图像生成、图生图、多参考图、提示词优化 |
| `chat-workspace/` | https://chat.sub2image.cc.cd | assistant-ui 聊天、模型切换、Tavily 联网搜索 |

## 本地运行

### 首页

```bash
cd home
docker compose up -d --build
```

### 生图工作台

```bash
cd image-workspace
docker compose -f docker-compose.host-nginx.yml up -d --build
```

### 聊天工作台

```bash
cd chat-workspace
docker compose up -d --build
```

## 数据与密钥

- 中转站 API Key 和 Tavily API Key 均由用户在浏览器中填写。
- 图片历史和聊天历史保存在用户自己的浏览器中，不使用公共数据库。
- 仓库不包含生产环境密钥、SSH 私钥、构建产物或服务器备份。

## 部署端口

- 首页：`127.0.0.1:13001`
- 生图工作台：`127.0.0.1:13000`
- 聊天工作台：`127.0.0.1:13002`

生产环境由主机 Nginx 和 Cloudflare 提供域名、HTTPS 与反向代理。

