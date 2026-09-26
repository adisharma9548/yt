import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .config import HOST, PORT, CORS_ORIGINS, TEMP_DIR
from .api.routes import router
from .websocket.connection_manager import ws_manager
from .downloader.queue_manager import queue_manager
from .utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing YouTube Downloader backend...")
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    loop = asyncio.get_running_loop()
    ws_manager.set_event_loop(loop)
    queue_manager.broadcast_callback = ws_manager.broadcast_sync
    yield
    # Shutdown
    logger.info("Shutting down YouTube Downloader backend...")
    queue_manager.save_state()


app = FastAPI(
    title="YouTube Downloader API",
    description="Local Windows Web Application backend for downloading YouTube videos and playlists",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time progress streaming WebSocket endpoint."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client can send pings or action commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client closed with exception: {e}")
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    logger.info(f"Starting server at http://{HOST}:{PORT}")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False)
