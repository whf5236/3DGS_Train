from sqlalchemy.orm import Session
from ..models import file_model
import shutil, os

def create_file_record(db: Session, filename: str, path: str, owner_id: int):
    file = file_model.File(name=filename, path=path, owner_id=owner_id)
    db.add(file)
    db.commit()
    db.refresh(file)
    return file

def delete_file(db: Session, file_id: int):
    file = db.query(file_model.File).filter_by(id=file_id).first()
    if not file:
        return None
    os.remove(file.path)
    db.delete(file)
    db.commit()
    return file
