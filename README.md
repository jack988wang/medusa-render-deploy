# Medusa Render 部署项目

这是一个简化的 Medusa 后端项目，专门为 Render 平台优化，支持自动发货功能。

## 功能特性

- ✅ 基于 Medusa v1.20+ 的现代化电商后端
- ✅ 支持数字商品自动发货（邮件发送下载链接）
- ✅ 一键部署到 Render（Docker + PostgreSQL + Redis）
- ✅ 前端可部署到 Cloudflare Pages
- ✅ 完整的订单流程和支付集成

## 快速开始

### 1. 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp env.example .env

# 编辑 .env 文件，配置数据库和 Redis

# 启动开发服务器
npm run dev
```

### 2. 部署到 Render

1. 将代码推送到 GitHub 仓库
2. 在 Render 控制台选择 "Blueprint"
3. 连接你的 GitHub 仓库
4. 选择 `render.yaml` 文件
5. 点击 "Apply" 一键部署

### 3. 前端部署到 Cloudflare Pages

使用官方的 Next.js Storefront：
- 仓库：`https://github.com/medusajs/nextjs-starter-medusa`
- 环境变量：`NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://你的render域名`

## 自动发货功能

当订单支付完成后，系统会自动：
1. 生成下载链接
2. 发送邮件给客户
3. 邮件包含所有数字商品的下载链接

## 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ |
| `REDIS_URL` | Redis 连接字符串 | ✅ |
| `JWT_SECRET` | JWT 密钥 | ✅ |
| `COOKIE_SECRET` | Cookie 密钥 | ✅ |
| `SMTP_HOST` | SMTP 服务器 | ✅ |
| `SMTP_USER` | SMTP 用户名 | ✅ |
| `SMTP_PASS` | SMTP 密码 | ✅ |
| `MEDUSA_BACKEND_URL` | 后端 URL | ✅ |
| `MEDUSA_ADMIN_CORS` | 管理后台 CORS | ✅ |
| `MEDUSA_STORE_CORS` | 商店前端 CORS | ✅ |

## 项目结构

```
medusa-render-deploy/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── loaders/
│   │   └── subscribers.ts    # 订阅器加载器
│   └── subscribers/
│       └── order-paid.ts     # 订单支付完成订阅器
├── data/
│   └── seed.json            # 种子数据
├── Dockerfile               # Docker 配置
├── render.yaml             # Render Blueprint
└── package.json
```

## 支持

- 官方文档：https://docs.medusajs.com/
- GitHub：https://github.com/medusajs/medusa
- Telegram 群组：https://t.me/dujiaoka

