from sqlalchemy import create_engine 
from sqlalchemy.ext.declarative import declarative_base 
from sqlalchemy.orm import sessionmaker  
import os
from .config import settings

# Database connection:
DATABASE_URL = settings.DATABASE_URL


engine = create_engine(
    DATABASE_URL,
    future=True,
    pool_pre_ping=True,            
    pool_size=10,                
    max_overflow=20,            
    #connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)
Base = declarative_base()


# Dependency (used in FastAPI routes)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health-check function for /ready endpoint
def test_db_connection() -> bool:
    """Lightweight DB check for readiness endpoint."""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False