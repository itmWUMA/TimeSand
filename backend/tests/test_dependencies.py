from __future__ import annotations

import re
import tomllib
from pathlib import Path


def test_project_dependencies_are_declared_once() -> None:
    pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"
    pyproject = tomllib.loads(pyproject_path.read_text(encoding="utf-8"))
    dependency_names = [
        re.split(r"[\[<>=!~; ]", dependency, maxsplit=1)[0].lower()
        for dependency in pyproject["project"]["dependencies"]
    ]

    duplicates = {
        name
        for name in dependency_names
        if dependency_names.count(name) > 1
    }

    assert duplicates == set()
