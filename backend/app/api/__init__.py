from .albums import router as albums_router
from .auth import router as auth_router
from .demo import router as demo_router
from .music import router as music_router
from .playlists import router as playlists_router
from .photos import router as photos_router
from .tags import router as tags_router
from .users import router as users_router

__all__ = [
    "photos_router",
    "auth_router",
    "users_router",
    "albums_router",
    "tags_router",
    "music_router",
    "playlists_router",
    "demo_router",
]
