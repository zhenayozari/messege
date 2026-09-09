"""
Дополнение к vk.py для поддержки статуса 'Прочитано' (messages.markAsRead).
"""

# Вставьте эту функцию в ваш существующий файл app/connectors/vk.py:

def mark_vk_message_read(peer_id: int, start_message_id: str | int | None = None) -> bool:
    """
    Отмечает сообщения в диалоге ВКонтакте как прочитанные сообществом.
    Вызывает метод API ВКонтакте 'messages.markAsRead'.
    
    :param peer_id: ID диалога / пользователя ВКонтакте
    :param start_message_id: ID последнего прочитанного сообщения (опционально)
    """
    import asyncio
    from app.connectors.vk import _vk_method

    async def _mark() -> bool:
        params = {
            "peer_id": abs(peer_id),
            "mark_conversation_as_read": 1,
        }
        if start_message_id:
            # Очищаем префикс если был 'vk-message-'
            clean_id = str(start_message_id).replace("vk-message-", "")
            if clean_id.isdigit():
                params["start_message_id"] = int(clean_id)

        try:
            res = await _vk_method("messages.markAsRead", params)
            return bool(res == 1 or res is True or (isinstance(res, dict) and res.get("response") == 1))
        except Exception as exc:
            # Если VK вернул ошибку прав или таймаут, логируем без падения основного процесса
            import logging
            logging.getLogger(__name__).warning("VK messages.markAsRead failed: %s", exc)
            return False

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_mark())

    return False
