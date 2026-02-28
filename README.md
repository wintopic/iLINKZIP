# iLINKZIP

中文优先的动态二维码、短链接、活网址平台（支持中英双语，默认中文）。

English summary: iLINKZIP is a dynamic QR / short-link / live URL platform with bilingual UI (default Chinese), built on Astro + Hono and S3-only persistence.

## 功能特性

- 魔法链接登录（Resend）
- 短链接与活网址（`/r/:slug`）
- 动态二维码（`/q/:slug.svg`）
- 基础统计（总点击、7 日趋势、国家/设备分布）
- 防滥用（Turnstile + 按日限流）
- 单仓库可部署到 Vercel 与 Cloudflare Pages

## 技术栈

- 前端：Astro
- API：Hono
- 存储：AWS S3（S3-only）
- 邮件：Resend
- 验证：Cloudflare Turnstile

## API（v1）

- `POST /api/v1/auth/request-magic-link`
- `GET /api/v1/auth/callback?token=...`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/links`
- `POST /api/v1/links`
- `GET /api/v1/links/:id`
- `PATCH /api/v1/links/:id`
- `DELETE /api/v1/links/:id`
- `GET /api/v1/links/:id/stats?range=7d`
- `GET /r/:slug`（重写到 `/api/v1/r/:slug`）
- `GET /q/:slug.svg`（重写到 `/api/v1/q/:slug.svg`）

## S3 数据模型

- `users/by-email/{sha256(email)}.json -> { userId }`
- `users/{userId}.json`
- `auth/magic/{tokenHash}.json`
- `links/{linkId}.json`
- `slug/{slug}.json -> { linkId, ownerId, status }`
- `owner/{ownerId}/links/{linkId}.json`
- `stats/{linkId}/{yyyy-mm-dd}.json`
- `ratelimit/{yyyy-mm-dd}/{scope}/{sha256(identifier)}.json`

## 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:4321`。

未配置 S3 凭据时，系统会自动使用内存仓储模式（仅本地调试）。

## 部署前必须准备（你还需要配置的设置）

以下项目必须先准备好，否则无法在生产环境正常工作：

1. AWS S3 与 IAM
- 创建 S3 Bucket（建议单独一个 bucket，仅用于 iLINKZIP）
- 记录 Bucket 所在区域（如 `us-east-1`）
- 创建 IAM 用户并生成 Access Key
- 给 IAM 用户最小权限（至少包含）：
  - `s3:ListBucket`（bucket 级）
  - `s3:GetObject`
  - `s3:PutObject`
  - 资源范围限定到你的 iLINKZIP bucket

最小 IAM Policy 示例（将 `YOUR_BUCKET_NAME` 替换为你的 bucket 名称）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Sid": "AllowObjectReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

如果你想进一步限制路径，可把 Object 资源改为：

```text
arn:aws:s3:::YOUR_BUCKET_NAME/users/*
arn:aws:s3:::YOUR_BUCKET_NAME/auth/*
arn:aws:s3:::YOUR_BUCKET_NAME/links/*
arn:aws:s3:::YOUR_BUCKET_NAME/slug/*
arn:aws:s3:::YOUR_BUCKET_NAME/owner/*
arn:aws:s3:::YOUR_BUCKET_NAME/stats/*
arn:aws:s3:::YOUR_BUCKET_NAME/ratelimit/*
```

2. Resend 邮件服务
- 创建 Resend API Key
- 配置并验证发件域名或发件邮箱
- 准备发件地址（用于 `RESEND_FROM_EMAIL`，如 `no-reply@yourdomain.com`）

3. Cloudflare Turnstile
- 创建一个 Turnstile Site
- 添加你的站点域名（测试阶段可先加本地域名）
- 获取 `Site Key` 与 `Secret Key`

4. 应用安全密钥
- 生成强随机 `SESSION_SECRET`
- 生成强随机 `MAGIC_LINK_SECRET`
- 两个密钥必须不同，且不要提交到 Git 仓库

5. 站点基础域名
- 确定生产访问地址（例如 `https://ilinkzip.example.com`）
- 填到 `APP_BASE_URL`
- 如果后续切换自定义域名，必须同步修改 `APP_BASE_URL` 并重新部署

## 环境变量说明（Vercel / Cloudflare Pages 相同）

| 变量名 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `APP_BASE_URL` | 是 | `https://ilinkzip.example.com` | 对外访问基准地址，影响魔法链接与二维码跳转 URL |
| `SESSION_SECRET` | 是 | 长随机字符串 | 登录会话签名密钥 |
| `MAGIC_LINK_SECRET` | 是 | 长随机字符串 | 魔法链接 token 哈希盐 |
| `RESEND_API_KEY` | 是 | `re_xxx` | Resend API Key |
| `RESEND_FROM_EMAIL` | 是 | `no-reply@yourdomain.com` | 发件邮箱（需在 Resend 验证通过） |
| `AWS_ACCESS_KEY_ID` | 是 | `AKIA...` | IAM Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | 是 | `xxxx` | IAM Secret Access Key |
| `S3_BUCKET` | 是 | `ilinkzip-prod` | S3 bucket 名称 |
| `S3_REGION` | 是 | `us-east-1` | bucket 区域 |
| `TURNSTILE_SITE_KEY` | 建议 | `0x4AAAA...` | 前端验证码 key |
| `TURNSTILE_SECRET_KEY` | 建议 | `0x4AAAA...` | 后端验证码校验 key |

## Vercel 部署步骤（推荐）

### 方式 A：Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwintopic%2FiLINKZIP)

### 方式 B：控制台手动导入

1. 打开 Vercel 控制台，导入仓库 `wintopic/iLINKZIP`
2. 配置 Build：
- Build Command：`npm run build`
- Output Directory：`dist`
3. 在 Project Settings -> Environment Variables 中配置上面表格的全部变量
4. 点击 Deploy

说明：
- `vercel.json` 已配置 `/r/*` 与 `/q/*.svg` 重写
- API 入口：`api/[[route]].ts`

## Cloudflare Pages 部署步骤（纯 Pages）

1. 打开：`https://dash.cloudflare.com/?to=/:account/pages/new`
2. 导入仓库 `wintopic/iLINKZIP`
3. Build 设置：
- Build command：`npm run build`
- Build output directory：`dist`
4. 在 Pages 项目环境变量中配置上面表格的全部变量
5. 确认 Functions 目录存在：`functions/`
6. 点击部署

说明：
- `public/_redirects` 已配置 `/r/*` 与 `/q/*` 重写
- API 入口：`functions/api/[[route]].ts`

## 自定义域名配置（实例级）

1. 在 Vercel 或 Cloudflare Pages 项目中添加自定义域名
2. 按平台提示配置 DNS（通常是 CNAME）
3. 域名生效后，把 `APP_BASE_URL` 改成正式域名
4. 重新部署一次，确保魔法登录链接与二维码跳转域名一致

## 部署后验收清单

1. 基础可用性
- 打开首页无乱码
- 语言切换可用，默认中文

2. 认证链路
- 在登录页输入邮箱后能收到邮件
- 点击魔法链接能进入控制台

3. 核心业务
- 新建短链成功
- 访问 `/r/:slug` 正常 302 跳转
- 访问 `/q/:slug.svg` 返回二维码
- 修改目标 URL 后，旧二维码仍跳到新地址

4. 统计
- 访问短链后，`/api/v1/links/:id/stats?range=7d` 可看到累计数据

## 质量检查（本地）

```bash
npm run check
npm test
npm run build
```

## 常见问题

1. 收不到魔法链接邮件
- 检查 `RESEND_API_KEY` 是否正确
- 检查 `RESEND_FROM_EMAIL` 是否已在 Resend 完成验证
- 检查垃圾邮箱

2. 创建链接时报验证码错误
- 检查 `TURNSTILE_SITE_KEY` 与 `TURNSTILE_SECRET_KEY` 是否配对
- 检查 Turnstile 域名白名单是否包含当前站点

3. 跳转或二维码域名不对
- 检查 `APP_BASE_URL` 是否为当前线上域名
- 改动后重新部署

4. S3 写入失败
- 检查 `AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY`
- 检查 IAM 权限是否包含 `ListBucket/GetObject/PutObject`
- 检查 `S3_BUCKET` 与 `S3_REGION` 是否匹配

## 开源协作

- 贡献指南：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- 许可证：`LICENSE`

## English

- Bilingual UI is available on Home/Login/Dashboard/404 pages.
- Default language is Chinese (`zh`), users can switch to English (`en`).
- Language preference is stored in `localStorage` key: `ilz_lang`.

## License

MIT