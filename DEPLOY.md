# 部署指南

## 架构概述

- **前端**: Next.js (部署到 Vercel)
- **后端**: FastAPI (部署到 Railway)
- **数据库**: TiDB Cloud (已有)

---

## 第一步：准备 GitHub 仓库

### 1. 初始化 Git 仓库

```bash
cd /Volumes/Data/Trae/cn_stock
git init
```

### 2. 创建 GitHub 仓库

在 GitHub 上创建一个名为 `realstock` 的新仓库。

### 3. 连接到远程仓库

```bash
git remote add origin https://github.com/你的用户名/realstock.git
```

---

## 第二步：部署前端到 Vercel

### 1. 准备前端配置

确保 `quantum-stock/.env.example` 已正确配置。

### 2. 登录 Vercel

访问 https://vercel.com 并使用 GitHub 账号登录。

### 3. 导入项目

1. 点击 "Add New Project"
2. 选择 `realstock` 仓库
3. 在 "Root Directory" 中选择 `quantum-stock`
4. 配置环境变量：
   - `NEXTAUTH_URL`: 你的 Vercel 应用 URL (例如: `https://realstock.vercel.app`)
   - `NEXTAUTH_SECRET`: 生成一个随机字符串 (可以使用 `openssl rand -hex 32` 生成)
   - `NEXT_PUBLIC_API_URL`: 你的 Railway 后端 URL (稍后获取)

### 4. 部署

点击 "Deploy" 等待部署完成。

---

## 第三步：部署后端到 Railway

### 1. 登录 Railway

访问 https://railway.app 并使用 GitHub 账号登录。

### 2. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from repo"
3. 选择 `realstock` 仓库

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

```
DB_HOST=你的TiDB主机地址
DB_PORT=4000
DB_USER=你的TiDB用户名
DB_PASSWORD=你的TiDB密码
DB_NAME=你的数据库名
APP_USERNAME=admin
APP_PASSWORD=设置一个安全的密码
SESSION_SECRET=生成一个随机字符串
```

### 4. 部署

Railway 会自动检测 `Dockerfile` 并开始部署。

### 5. 获取后端 URL

部署完成后，Railway 会提供一个 URL，例如：`https://realstock-backend.up.railway.app`

---

## 第四步：完成配置

### 1. 更新 Vercel 环境变量

回到 Vercel 项目设置，更新 `NEXT_PUBLIC_API_URL` 为你的 Railway 后端 URL。

### 2. 重新部署 Vercel

触发一次新的部署以使环境变量生效。

---

## 本地开发

### 前端开发

```bash
cd quantum-stock
npm install
npm run dev
```

### 后端开发

```bash
# 在项目根目录
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 环境变量

创建 `.env` 文件（不要提交到 Git）：

**前端** (`quantum-stock/.env`):
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**后端** (`.env`):
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=realstock
APP_USERNAME=admin
APP_PASSWORD=admin
SESSION_SECRET=your_session_secret_here
```

---

## 安全注意事项

1. **永远不要将 `.env` 文件提交到 Git**
2. 使用强密码和随机生成的密钥
3. 定期轮换密钥
4. 在生产环境中启用 HTTPS

---

## 故障排除

### 前端无法连接后端

- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 确保后端服务正在运行
- 检查 CORS 配置

### 后端无法连接数据库

- 检查数据库环境变量
- 确认数据库服务可访问
- 验证用户名和密码

---

## 技术栈

- **前端框架**: Next.js 14
- **后端框架**: FastAPI
- **数据库**: TiDB (MySQL兼容)
- **认证**: NextAuth.js
- **样式**: Tailwind CSS
- **部署**: Vercel (前端) + Railway (后端)
