from typing import Generator
from sqlmodel import Session, create_engine
from app.core.config import settings

engine = create_engine(
    settings.sqlite_db_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
