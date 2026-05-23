# TimeSand 前端重构交接文档 (HANDOFF)

> 把这套 HTML 原型迁移成 Vue 3 + Tailwind 真实应用的完整简报。
> 本文件已按 TimeSand 当前 MVP 契约补齐项目相关决策；其他迁移规则可以照搬。

---

## 0. 一句话

把当前文件夹里的 10 个 HTML 原型，按这份文档迁成 Vue 3 + Vite + Tailwind 应用，对接已有后端 API，视觉与交互严格以原型为准。

---

## 1. 技术栈

| 维度 | 选型 |
|---|---|
| 框架 | **Vue 3**（Composition API，`<script setup>`） |
| 构建 | **Vite 5+** |
| 样式 | **Tailwind CSS 3+**，配合 `tailwind.config.js` 自定义 token |
| 路由 | **Vue Router 4** |
| 状态 | **Pinia** |
| 网络 | **axios**（`frontend/src/services/api.ts` 统一实例） |
| i18n | **vue-i18n 9+** |
| 图标 | 原型里是 inline SVG，迁移建议 **lucide-vue-next** |
| 动画 | CSS transitions 为主；Ken Burns / 抽卡转场可用 `@vueuse/motion` 或纯 CSS |
| 测试 | **Vitest + @vue/test-utils**；页面视觉验证使用 Chrome DevTools MCP |
| Lint | ESLint + Prettier + Stylelint |
| 部署目标 | **Self-hosted Web**，FastAPI/Docker 单容器提供 API 与前端静态文件 |
| 浏览器范围 | **Chrome 110+、iOS Safari 16+** |

---

## 2. 源物料（本文件夹）

```
.od/projects/f8d67f66-.../
├── index.html              ← 总览/启动器
├── landing.html            ← 着陆页
├── draw.html               ← 抽卡主舞台
├── albums.html             ← 相册列表
├── album-detail.html       ← 相册详情
├── upload.html             ← 上传
├── music.html              ← 音乐 / 播放列表
├── slideshow.html          ← 幻灯片
├── settings.html           ← 设置
├── mobile-draw.html        ← 移动端抽卡（手势版）
├── styles.css              ← 共享设计系统（Warm Walnut）
├── shell.js                ← 共享左栏 + 底部播放器注入
└── mphr6vpr-README.md      ← 产品 README
```

**视觉/交互以这套原型为准。** 照片、文案、数字都是 demo 数据，迁移时替换为真实接口数据；结构、间距、配色、动效要照搬。

---

## 3. 设计系统迁移

`styles.css` 里的 CSS 变量（`:root` 段）应迁到 `tailwind.config.js` 的 `theme.extend` 里。建议结构：

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1a120c',          // 深胡桃木
        surface: '#231811',
        fg:      '#f3e7d3',
        muted:   '#a08673',
        border:  '#3a2a1f',
        accent:  '#e3a45c',          // 暖琥珀（单点强调）
        danger:  '#c8553d',
      },
      fontFamily: {
        display: ['"Iowan Old Style"', 'Charter', 'Georgia', 'serif'],
        body:    ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // 间距、圆角、阴影等也照 styles.css 同步
    }
  }
}
```

**关键规则（强制）：**
- 强调色 `accent` 一屏最多用两处（主 CTA + 当前激活态）。
- 衬线只用在 display；正文用 sans；数字、kbd、metadata 用 mono。
- 不要新增配色；扩展场景请用 Tailwind 的 `color-mix` 或 opacity。

---

## 4. 路由与页面映射

```
/                       → Landing.vue          (未登录) / 重定向到 /draw (已登录)
/draw                   → Draw.vue             (核心)
/albums                 → AlbumsList.vue
/albums/:id             → AlbumDetail.vue
/upload                 → Upload.vue
/music                  → Music.vue
/slideshow/:albumId     → Slideshow.vue
/settings               → Settings.vue
```

移动端抽卡（`mobile-draw.html`）**不是独立路由**，是 `/draw` 在小屏的响应式形态。

应用壳 `AppShell.vue`：左侧导航 + 底部全局播放器 + `<RouterView/>`，对应原型的 `shell.js`。Landing 与 Slideshow 走全屏路由（不套 shell）。

---

## 5. 数据模型（与后端契约）

下面是迁移所需的最小字段集，已按当前真实接口字段名补齐。

### Photo
```ts
interface Photo {
  id: string
  url: string                  // 原图
  thumbnailUrl: string         // 缩略图（列表/网格用）
  takenAt: string              // ISO；用于"多年的今天"权重
  uploadedAt: string
  location?: string            // 反向地理编码后的可读地名
  caption?: string             // 用户写的一句话
  tags?: string[]
  albumIds: string[]
  width: number
  height: number
  format: 'jpg' | 'png' | 'heic' | 'webp'
  sizeBytes: number
}
```

### Album
```ts
interface Album {
  id: string
  name: string
  description?: string
  coverPhotoIds: string[]      // 三联拼贴用前 3 张
  photoCount: number
  createdAt: string
  updatedAt: string
}
```

### Playlist
```ts
interface Playlist {
  id: string
  name: string
  trackIds: string[]
  boundAlbumIds?: string[]     // 与相册的绑定关系
}

interface Track {
  id: string
  title: string
  artist?: string
  durationMs: number
  url: string
  coverUrl?: string
}
```

### Settings
```ts
interface UserSettings {
  language: 'zh-CN' | 'en'
  slideshowIntervalMs: number
  drawTimeWeight: number       // 0–1，弱权重抽取的强度
  storage: {
    used: number
    total: number
    breakdown: { type: string; bytes: number }[]
  }
}
```

### API 端点（请用真实 URL 替换）

| 用途 | 方法 | 路径示例 |
|---|---|---|
| 列出相册 | GET | `/api/albums` |
| 相册详情 | GET | `/api/albums/:id` |
| 创建/更新相册 | POST/PATCH | `/api/albums`、`/api/albums/:id` |
| 列出照片（分页） | GET | `/api/photos?page=&page_size=&album_id=` |
| 上传照片 | POST | `/api/photos` (multipart) |
| 抽卡（带权重） | POST | `/api/draw` body: `{ album_id?, exclude_ids[], weight_mode?, nearby_days? }` |
| 列出歌单 / 曲目 | GET | `/api/playlists`、`/api/music` |
| 设置读/写 | GET/PATCH | 设置默认值在 MVP 由前端 localStorage 持久化；存储用量见下行 |
| 存储用量 | GET | `/api/settings/storage` |
| 备份导出 | POST | `/api/backup/export` |
| 备份恢复 | POST | `/api/backup/import` (multipart) |

鉴权方式：MVP 无鉴权。错误响应：FastAPI 标准 `detail` 字段，前端统一在服务层/页面转成 i18n 文案。分页约定：当前 REST 列表使用 `page` / `page_size`，响应包含 `items` 与 `total`。

---

## 6. 核心算法：时间弱权重抽卡

这是产品差异点，**必须服务端实现**（客户端只发请求、展示结果）。简化公式（可作起点，最终以 README 为准）：

```
权重(photo) = base
            + boost_anniversary(now, takenAt)   // 多年前的今天
            + boost_recent_low(uploadedAt)      // 近期上传略低概率（避免审美疲劳）
            - penalty_recently_drawn(drawHistory)
```

- "多年前的今天"：`|now.month - takenAt.month| <= 0 && |now.day - takenAt.day| <= 3` 加大权重。
- 去重窗口：最近 N 次抽过的不再出（N 可配置）。
- 调试：服务端返回每张抽中卡片的 `weightBreakdown`，前端可在 dev 模式展示。

---

## 7. 交互规格（HTML 里看不出来的）

| 场景 | 时长 / 缓动 | 备注 |
|---|---|---|
| 抽卡翻牌 | 480ms `cubic-bezier(.2,.7,.2,1)` | 翻牌 + 微缩放 |
| 散开/收回 | 520ms 同上 | stagger 35ms |
| 路由切换 | 220ms fade | Slideshow 进入用 fade + 微 zoom |
| Ken Burns | 8s linear，scale 1.0→1.08 + 微 translate | 自动切换默认 5s（可设置） |
| 上传进度 | 实时；失败显 retry 按钮 | multipart 上传带进度/取消；本迭代不分片 |
| HEIC 处理 | 后端转换 | 前端通过 multipart 原样上传 |
| 抽卡键盘 | `Space` 抽下一张、`←/→` 翻历史、`Esc` 散开 | 移动端不显示 kbd 提示 |

---

## 8. i18n 策略

- 当前原型有中英混排（demo 数据残留）。正式版必须 **UI 文案全部走 i18n**，**用户内容（相册名、照片说明）不翻译**。
- 默认语言：`zh-CN`；切换入口：左下角语言开关（已在原型中）。
- 文案 key 命名：`page.draw.title`、`action.uploadPhotos`、`empty.noPhotos`。
- 复数、日期、相对时间走 `Intl.RelativeTimeFormat` / `vue-i18n` 的 `n()`。

---

## 9. 响应式

原型里 `styles.css` 已有四档断点：1100 / 860 / 720 / 420。迁移到 Tailwind 时映射：

| 原型断点 | Tailwind 默认 | 用途 |
|---|---|---|
| 1100px | `lg` (1024px) ± | 左栏图标列 |
| 860px | `md` (768px) ± | 隐藏播放器附属控件 |
| 720px | `sm` (640px) ± | 底栏改 fixed、`.canvas` 留底 padding |
| 420px | (custom `xs`) | 字号再压一档 |

建议在 `tailwind.config.js` 自定义 `screens` 精确对齐，**不要**继续用默认断点近似映射，否则布局会偏。

iOS 安全区：所有 fixed 底栏用 `env(safe-area-inset-bottom)` + Tailwind 的 `pb-safe` 自定义工具类。

---

## 10. 验收标准

### 必须通过
- 10 个路由全部跑通，视觉与原型一致（允许 ±2px）。
- 抽卡：从空相册到 1000+ 张照片，抽卡响应 < 400ms（不含网络）。
- 上传：单张 20MB JPG 不卡 UI，支持取消。
- 幻灯片：连续放映 10 张无内存泄漏。
- 移动端 360 / 390 / 414 三档不出现横向滚动。
- Lighthouse Performance ≥ 85 / Accessibility ≥ 95。

### 浏览器/设备覆盖
Chrome 110+ / iOS Safari 16+。

---

## 11. 里程碑建议

| M | 范围 | 交付 |
|---|---|---|
| M1 | 工程脚手架 + Tailwind token + AppShell + 路由 | 空壳可跑，左栏/播放器结构到位 |
| M2 | 上传 + 相册列表 + 相册详情（接真实 API） | 用户能把照片传进来、看相册 |
| M3 | 抽卡（含权重）+ 移动端手势 | 核心场景闭环 |
| M4 | 音乐 + 幻灯片 | 沉浸场景 |
| M5 | 设置 + i18n + 备份恢复 | 完整交付 |
| M6 | 性能打磨 + E2E 测试 + 部署 | 上线 |

每个里程碑结束让 AI 自检一遍并截图回放。

---

## 12. 给 AI 的最终指令模板

> 你是一名资深 Vue/前端工程师。请把 `D:\...\f8d67f66-...` 这套 HTML 原型迁成 Vue 3 + Vite + Tailwind 应用。
>
> - 严格以 `HANDOFF.md` 为准；视觉/交互参考同目录 HTML。
> - 后端 API 见第 5 节，鉴权方式：MVP 无鉴权。
> - 第一步交付 M1：脚手架 + AppShell + 路由 + Tailwind token，**不写任何业务逻辑**。请先把工程结构、`tailwind.config.js`、`AppShell.vue`、空白 10 个路由页给我看，我确认后再做 M2。
> - 遇到原型里没说清的（动画时长、错误态、空态），列成清单一次性问我，**不要自己猜**。

---

## 13. 已补全的项目决策

- §1 网络库、部署目标、浏览器范围：已确定为 axios、自托管 Web、Chrome 110+ / iOS Safari 16+。
- §5 API 端点 + 鉴权 + 错误结构 + 分页约定：已按现有 FastAPI REST 契约填写；MVP 无鉴权。
- §7 HEIC 处理位置、上传分片大小：HEIC 后端转换；上传使用 multipart 进度/取消，本迭代不做分片。
- §10 浏览器覆盖范围：Chrome 110+ / iOS Safari 16+。

填完这 4 块，HANDOFF 就能直接发给 AI 开工。
