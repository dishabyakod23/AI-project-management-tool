from datetime import datetime

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default="now()")

    project_memberships = relationship(
        "ProjectMember", back_populates="user", cascade="all, delete-orphan"
    )
    owned_tasks = relationship("Task", back_populates="owner", foreign_keys="Task.owner_id")
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
