# routers/__init__.py
from .auth import router as auth
from .getfiles import router as files
from .upload import router as upload

__all__ = ['auth', 'files', 'upload']
