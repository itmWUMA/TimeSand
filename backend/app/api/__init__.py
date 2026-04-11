from .albums import router as albums_router
from .photos import router as photos_router
from .tags import router as tags_router

__all__ = ["photos_router", "albums_router", "tags_router"]
