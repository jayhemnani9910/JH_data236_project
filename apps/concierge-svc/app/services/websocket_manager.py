"""Simple WebSocket connection manager for broadcasting events."""

from __future__ import annotations

import asyncio
from typing import Dict, List

from fastapi import WebSocket


class WebSocketManager:
    """Tracks active websocket connections and emits notifications."""

    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: str | None = None) -> None:
        await websocket.accept()
        key = user_id or "anon"
        async with self._lock:
            self._connections.setdefault(key, []).append(websocket)

    async def disconnect(self, websocket: WebSocket, user_id: str | None = None) -> None:
        key = user_id or "anon"
        async with self._lock:
            sockets = self._connections.get(key, [])
            if websocket in sockets:
                sockets.remove(websocket)
            if not sockets and key in self._connections:
                del self._connections[key]

    async def broadcast(self, payload: dict, user_id: str | None = None) -> None:
        key = user_id or "anon"
        async with self._lock:
            if user_id is None:
                targets = [socket for sockets in self._connections.values() for socket in sockets]
            else:
                targets = list(self._connections.get(key, []))

        for socket in targets:
            await socket.send_json(payload)
