from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app, create_app


def test_health_check() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert settings.database_path.exists()


def _create_dist(tmp_path: Path) -> Path:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)

    (dist_dir / "index.html").write_text("<html><body>timesand</body></html>", encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('timesand');", encoding="utf-8")
    return dist_dir


def test_spa_fallback_serves_index_for_non_api_path(tmp_path: Path) -> None:
    dist_dir = _create_dist(tmp_path)

    with TestClient(create_app(frontend_dist=dist_dir)) as client:
        response = client.get("/draw/session")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "timesand" in response.text


def test_spa_fallback_does_not_capture_api_root(tmp_path: Path) -> None:
    dist_dir = _create_dist(tmp_path)

    with TestClient(create_app(frontend_dist=dist_dir)) as client:
        response = client.get("/api")

    assert response.status_code == 404


def test_spa_serves_existing_static_file(tmp_path: Path) -> None:
    dist_dir = _create_dist(tmp_path)

    with TestClient(create_app(frontend_dist=dist_dir)) as client:
        response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == "console.log('timesand');"
