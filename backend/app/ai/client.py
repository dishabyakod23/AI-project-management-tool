"""Thin wrapper around the Anthropic SDK used by every AI workflow.

Centralizing this here keeps the API key and model selection out of the
route handlers and gives us one place to reason about provider failures.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TypeVar

import anthropic
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

T = TypeVar("T", bound=BaseModel)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        headers = {}
        if settings.anthropic_workspace_id:
            headers["anthropic-workspace-id"] = settings.anthropic_workspace_id
        _client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key,
            default_headers=headers or None,
        )
    return _client


class AIProviderError(Exception):
    """Raised when the Anthropic API call itself fails (network, auth, rate limit, 5xx)."""


class AICallResult:
    def __init__(
        self,
        parsed: BaseModel | None,
        started_at: datetime,
        completed_at: datetime,
        input_tokens: int | None,
        output_tokens: int | None,
    ) -> None:
        self.parsed = parsed
        self.started_at = started_at
        self.completed_at = completed_at
        self.duration_ms = int((completed_at - started_at).total_seconds() * 1000)
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


def call_structured(system_prompt: str, user_prompt: str, output_model: type[T]) -> AICallResult:
    """Call Claude and validate the response against `output_model`.

    Raises AIProviderError on network/API failures (caller decides how to
    surface + log). Raises pydantic.ValidationError if Claude's output does
    not match the schema, even after the SDK's own structured-output parsing
    — callers should catch that separately to log a validation failure
    rather than a provider failure.
    """
    if not settings.anthropic_api_key:
        raise AIProviderError("ANTHROPIC_API_KEY is not configured on the backend")

    started_at = datetime.now(timezone.utc)
    client = _get_client()
    try:
        response = client.messages.parse(
            model=settings.anthropic_model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            output_format=output_model,
        )
    except anthropic.AuthenticationError as exc:
        raise AIProviderError("Anthropic API key was rejected") from exc
    except anthropic.RateLimitError as exc:
        raise AIProviderError("Anthropic API rate limit exceeded, please retry shortly") from exc
    except anthropic.APIConnectionError as exc:
        raise AIProviderError("Could not reach the Anthropic API") from exc
    except anthropic.APIStatusError as exc:
        detail = ""
        try:
            detail = str(exc.body.get("error", {}).get("message", ""))  # type: ignore[union-attr]
        except Exception:
            detail = str(exc)
        if "workspace-id" in detail.lower() or "workspace id" in detail.lower():
            raise AIProviderError(
                "This Anthropic key is not scoped to a workspace. Set ANTHROPIC_WORKSPACE_ID in backend/.env "
                "(Claude Console → Settings → Workspaces) and restart the backend."
            ) from exc
        raise AIProviderError(f"Anthropic API error ({exc.status_code}): {detail or 'request failed'}") from exc

    completed_at = datetime.now(timezone.utc)
    return AICallResult(
        parsed=response.parsed_output,
        started_at=started_at,
        completed_at=completed_at,
        input_tokens=getattr(response.usage, "input_tokens", None),
        output_tokens=getattr(response.usage, "output_tokens", None),
    )
