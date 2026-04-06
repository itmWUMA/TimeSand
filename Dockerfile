FROM docker.m.daocloud.io/oven/bun:1 AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock frontend/.npmrc ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
RUN bun run build

FROM docker.m.daocloud.io/library/python:3.12-slim AS production
WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data

RUN pip install --no-cache-dir -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple uv

COPY backend/pyproject.toml backend/uv.lock backend/uv.toml ./
RUN uv sync --no-dev --frozen

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/static

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /data/photos/originals /data/photos/thumbnails /data/music/files \
    && chown -R appuser:appuser /app /data

USER appuser

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
