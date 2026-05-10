# TimeSand

TimeSand 是一个自托管的智能照片墙与音乐盒，用抽卡、幻灯片和背景音乐重新组织私人照片记忆。项目面向家庭相册、个人照片归档和本地化媒体收藏场景，默认不接入外部云服务，照片、音乐和数据库都保存在本机或 Docker 卷中。

## 项目功能

- **照片管理**：批量上传照片，生成缩略图，保存文件大小、尺寸、拍摄时间、位置和 MIME 类型等元数据。
- **相册与标签**：创建相册，设置描述和封面，将照片加入相册，并用标签组织照片。
- **回忆抽卡**：从全部照片或指定相册中随机抽取照片卡片，支持排除已抽卡片、洗牌、撤销、散开查看和手机滑动手势。
- **时间弱权重抽取**：可按“多年以前的今天”或邻近日期轻微提高抽中概率，权重强度和日期范围可在设置页调整。
- **音乐与播放列表**：上传本地音乐文件，管理播放列表，调整曲目顺序，并将播放列表关联到相册。
- **沉浸式播放**：提供幻灯片播放、过渡动画、迷你播放器和背景音乐控制。
- **设置与数据管理**：查看照片、音乐、缩略图和总存储占用；导出 zip 备份；从备份恢复数据库和媒体文件。
- **多语言界面**：内置中文和英文界面切换。
- **演示数据**：默认可在首次启动时写入示例照片和音乐，便于快速体验。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3、TypeScript、Vite、Pinia、Vue Router、Vue I18n |
| UI 与动效 | TailwindCSS、Radix Vue、GSAP、Howler |
| 后端 | FastAPI、SQLModel、Alembic、Pillow、Mutagen、Structlog |
| 数据库 | SQLite |
| 包管理 | Bun、uv |
| 测试 | Vitest、@vue/test-utils、pytest、Ruff、ESLint |
| 部署 | Docker 单容器，后端同时服务 API 与前端静态文件 |

## 快速部署

### 使用预构建镜像

```bash
docker compose up -d
```

默认服务地址：

- Web 应用：`http://127.0.0.1:8080`
- 健康检查：`http://127.0.0.1:8080/api/health`

`docker-compose.yml` 会使用 `ghcr.io/itmwuma/timesand:latest`，并把本地 `./data` 挂载到容器的 `/data`。SQLite 数据库、原图、缩略图和音乐文件都会保存在这个目录中。

### 本地构建镜像

```bash
docker compose -f docker-compose.build.yml up -d --build
```

这个方式会先构建前端静态资源，再构建 FastAPI 运行镜像，适合本地修改代码后自测部署。

### 数据目录

运行后数据目录结构如下：

```text
data/
├── timesand.db
├── photos/
│   ├── originals/
│   └── thumbnails/
└── music/
    └── files/
```

请定期在设置页导出备份，或备份整个 `data/` 目录。

## 本地开发

### 一键启动

Windows PowerShell：

```powershell
.\quick-start.ps1
```

Linux/macOS：

```bash
./quick-start.sh
```

默认端口：

- 前端开发服务器：`http://127.0.0.1:5173`
- 后端 API：`http://127.0.0.1:8000`
- 后端健康检查：`http://127.0.0.1:8000/api/health`

脚本会检查 `bun` 和 `uv`，安装依赖，创建 Python 3.12 虚拟环境，并同时启动前后端。

### 手动启动前端

```bash
cd frontend
bun install
bun run dev
```

常用命令：

```bash
bun run build
bun run lint
bun run lint:fix
bun run type-check
bun run test
```

### 手动启动后端

```bash
cd backend
uv venv -p 3.12
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

常用命令：

```bash
uv run ruff check .
uv run pytest
```

## 配置项

后端通过环境变量配置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATA_DIR` | `../data` | 数据库和媒体文件根目录；Docker 中默认为 `/data` |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | 开发环境允许的前端来源 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `LOG_FORMAT` | `json` | 日志格式 |
| `ENABLE_DEMO_SEED` | `true` | 是否在启动时写入演示数据 |

前端 API 默认使用同源 `/api`，生产环境由 FastAPI 同时托管静态前端和 API。

## 项目架构

```text
timesand/
├── frontend/                 # Vue 3 单页应用
│   ├── src/
│   │   ├── components/       # UI、播放器、上传器、抽卡组件
│   │   ├── composables/      # 抽卡、音乐、幻灯片、动效、提示等组合逻辑
│   │   ├── i18n/             # 多语言配置
│   │   ├── layouts/          # 页面布局
│   │   ├── pages/            # 路由页面
│   │   ├── router/           # Vue Router
│   │   ├── services/         # Axios API 客户端
│   │   ├── stores/           # Pinia 状态
│   │   └── types/            # TypeScript 类型
│   └── package.json
├── backend/                  # FastAPI 应用
│   ├── app/
│   │   ├── api/              # REST 路由
│   │   ├── core/             # 配置、数据库、日志、异常处理
│   │   ├── demo_data/        # 演示媒体
│   │   ├── models/           # SQLModel 数据模型
│   │   ├── services/         # 业务逻辑
│   │   └── main.py           # 应用入口
│   ├── alembic/              # 数据库迁移
│   ├── tests/                # 后端测试
│   └── pyproject.toml
├── data/                     # 本地运行数据，Docker 部署时作为卷挂载
├── docs/                     # 迭代计划和规格文档
├── Dockerfile                # 多阶段单容器构建
├── docker-compose.yml        # 使用预构建镜像运行
└── docker-compose.build.yml  # 本地构建镜像运行
```

### 运行时流程

1. 前端通过 Vue Router 提供抽卡、相册、上传、音乐、幻灯片和设置页面。
2. 前端服务层使用 Axios 请求同源 `/api`。
3. FastAPI 处理 REST API，并在生产容器中托管前端 `dist` 静态文件。
4. SQLModel 读写 SQLite，Alembic 在应用启动时执行迁移。
5. 照片原图、缩略图、音乐文件保存在 `DATA_DIR` 下的本地文件系统。
6. 备份导出会打包 `timesand.db`、`photos/originals/` 和 `music/files/`；恢复后会重建缩略图。

## API 概览

主要 API 前缀：

- `GET /api/health`：健康检查
- `/api/photos`：照片上传、列表、详情、删除、原图和缩略图访问
- `/api/albums`：相册 CRUD、相册照片、相册播放列表关联
- `/api/tags` 与 `/api/photos/{photo_id}/tags`：标签管理
- `/api/draw`：抽卡和重置抽卡池
- `/api/music`：音乐上传、列表、详情、删除、文件访问
- `/api/playlists`：播放列表 CRUD、添加/移除/排序曲目
- `/api/slideshow`：幻灯片照片列表
- `/api/settings/storage`：存储统计
- `/api/backup/export` 与 `/api/backup/import`：备份导出和恢复
- `/api/demo`：演示数据清理

## 测试与质量检查

前端：

```bash
cd frontend
bun run lint
bun run type-check
bun run test
```

后端：

```bash
cd backend
uv run ruff check .
uv run pytest
```

如果改动了 `frontend/package.json`、`frontend/bun.lock`、`backend/pyproject.toml` 或 `backend/uv.toml`，建议重新安装依赖后再运行测试。

## 国内镜像

仓库已配置常用国内镜像以加速安装：

- 前端 `.npmrc`：`https://registry.npmmirror.com`
- 后端 `uv.toml`：`https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`
- Dockerfile 默认使用 `docker.m.daocloud.io/` 作为基础镜像前缀，可通过 `IMAGE_REGISTRY` build arg 覆盖。

## 当前限制

- MVP 阶段没有内置用户认证和权限系统，建议只部署在可信局域网或反向代理认证之后。
- 默认使用 SQLite 和本地文件系统，适合个人与家庭规模使用。
- 抽卡会话状态主要保存在前端，后端通过 `exclude_ids` 避免重复抽取。
