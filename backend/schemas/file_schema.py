from pydantic import BaseModel

class FileBase(BaseModel):
    name: str

class FileCreate(FileBase):
    path: str

class FileResponse(FileBase):
    id: int
    path: str

    class Config:
        from_attributes = True
