# iLINKZIP

中文优先的动态二维码、短链接、活网址平台（支持中英双语，默认中文）。

English summary: iLINKZIP is a dynamic QR / short-link / live URL platform with bilingual UI (default Chinese), built on Astro + Hono and S3-only persistence.

## 功能特性（中文）

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

## 环境变量

- `APP_BASE_URL`
- `SESSION_SECRET`
- `MAGIC_LINK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## 部署

### Vercel（Deploy Button）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwintopic%2FiLINKZIP)

说明：
- `vercel.json` 已配置 `/r/*` 与 `/q/*.svg` 重写。
- API 入口：`api/[[route]].ts`。

### Cloudflare Pages（纯 Pages 流程）

1. 打开：`https://dash.cloudflare.com/?to=/:account/pages/new`
2. 导入仓库 `wintopic/iLINKZIP`
3. 构建配置：
   - Build command：`npm run build`
   - Build output directory：`dist`
4. Functions 目录：`functions/`
5. 配置与 Vercel 相同的环境变量

说明：
- `public/_redirects` 已配置 `/r/*` 与 `/q/*` 重写。
- API 入口：`functions/api/[[route]].ts`。

## 质量检查

```bash
npm run check
npm test
npm run build
```

## 开源协作

- 贡献指南：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- 许可证：`LICENSE`

## English

- Bilingual UI is available on Home/Login/Dashboard/404 pages.
- Default language is Chinese (`zh`), and users can switch to English (`en`) with the language toggle.
- Language preference is stored in `localStorage` key: `ilz_lang`.

## License

MIT
