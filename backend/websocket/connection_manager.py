import json
import asyncio
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket
from ..utils.logger import logger


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_json_async(self, data: Dict[str, Any]):
        """Broadcasts JSON payload to all active connections asynchronously."""
        if not self.active_connections:
            return

        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

    def broadcast_sync(self, data: Dict[str, Any]):
        """Thread-safe synchronous broadcast from worker thread to async event loop."""
        if not self.active_connections or not self.loop:
            return

        try:
            if self.loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast_json_async(data), self.loop)
        except Exception as e:
            logger.error(f"Error in broadcast_sync: {e}")


ws_manager = ConnectionManager()
