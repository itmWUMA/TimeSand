from __future__ import annotations

import json
import logging
from io import StringIO

from app.core.logging import get_logger, setup_logging


def flush_handlers() -> None:
    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        handler.flush()


def test_setup_logging_json_output_contains_expected_fields() -> None:
    output = StringIO()

    setup_logging(log_level="INFO", log_format="json", stream=output)
    get_logger("tests.logging").info("test_event", feature="structured_logging")
    flush_handlers()

    line = output.getvalue().strip()
    payload = json.loads(line)

    assert payload["event"] == "test_event"
    assert payload["level"] == "info"
    assert payload["feature"] == "structured_logging"
    assert "timestamp" in payload


def test_setup_logging_console_output_renders_event_text() -> None:
    output = StringIO()

    setup_logging(log_level="INFO", log_format="console", stream=output)
    get_logger("tests.logging").info("console_event", mode="dev")
    flush_handlers()

    line = output.getvalue().strip()

    assert "console_event" in line
    assert "dev" in line

