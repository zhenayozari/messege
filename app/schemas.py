from __future__ import annotations

from typing import Any
from pydantic import BaseModel
from app.models import ChannelType


class TestInboundRequest(BaseModel):
    contact_name: str
    text: str | None = None
    media_type: str | None = None
    media_url: str | None = None
    file_id: str | None = None
    caption: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    duration_sec: int | None = None
    attachments: list[dict[str, Any]] = []
    external_chat_id: str
    external_contact_id: str | None = None
    external_message_id: str | None = None
    channel: ChannelType = ChannelType.telegram
    phone: str | None = None
    city: str | None = None
