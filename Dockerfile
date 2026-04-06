# syntax=docker/dockerfile:1

FROM oven/bun:1 AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json ./package.json
COPY frontend/bun.lock ./bun.lock
COPY frontend/.npmrc ./.npmrc
RUN bun install --frozen-lockfile
COPY frontend .
RUN bun run build

FROM python:3.12-slim
WORKDIR /app

COPY backend/pyproject.toml ./backend/pyproject.toml
COPY backend/uv.toml ./backend/uv.toml
RUN pip install --no-cache-dir -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple uv
RUN cd backend && uv sync --no-dev

COPY backend ./backend
COPY --from=frontend-builder /frontend/dist ./frontend_dist

ENV PYTHONPATH=/app/backend
ENV DATA_DIR=/data

EXPOSE 8080
CMD ["uv", "run", "--directory", "backend", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
