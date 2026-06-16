from __future__ import annotations
from datetime import datetime
from uuid import uuid4
from sqlalchemy import (
    Boolean, Column, Index, String, Float, DateTime, JSON, Enum,
    ForeignKey, func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


def _sid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


class MethodologyVersion(Base):
    __tablename__ = "methodology_versions"

    id = Column(String, primary_key=True, default=lambda: _sid("mtd"))
    version = Column(String, nullable=False, unique=True)  # e.g. "2.0.0"
    pillar_weights = Column(JSON, nullable=False)           # {"transparency": 0.16, ...}
    released_at = Column(DateTime, nullable=False)
    is_current = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=func.now())


class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=lambda: _sid("svc"))
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    service_type = Column(
        Enum("ai_model", "mcp_server", "agent", name="service_type_enum"),
        nullable=False,
    )
    external_id = Column(String, nullable=True, unique=True)
    is_synthetic = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    scores = relationship("Score", back_populates="service", lazy="dynamic")
    model_detail = relationship("ServiceModel", back_populates="service", uselist=False)
    mcp_detail = relationship("ServiceMcpServer", back_populates="service", uselist=False)
    flags = relationship("IdentityMatchFlag", back_populates="service")


class ServiceModel(Base):
    __tablename__ = "service_models"

    service_id = Column(String, ForeignKey("services.id"), primary_key=True)
    engine_provider = Column(String, nullable=False)
    platform_provider = Column(String, nullable=True)  # null = Direct API
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)

    service = relationship("Service", back_populates="model_detail")


class ServiceMcpServer(Base):
    __tablename__ = "service_mcp_servers"

    service_id = Column(String, ForeignKey("services.id"), primary_key=True)
    target_service = Column(String, nullable=False)
    provider_org = Column(String, nullable=False)
    provider_tier = Column(
        Enum("official", "platform_bundled", "third_party", name="provider_tier_enum"),
        nullable=False,
    )
    hosting_type = Column(
        Enum("hosted", "self_hosted", name="hosting_type_enum"),
        nullable=False,
        default="hosted",
    )

    service = relationship("Service", back_populates="mcp_detail")


class Scanner(Base):
    __tablename__ = "scanners"

    id = Column(String, primary_key=True, default=lambda: _sid("scn"))
    name = Column(String, nullable=False)
    org_name = Column(String, nullable=False)
    api_key_hash = Column(String, nullable=False)
    api_key_prefix = Column(String, nullable=False)
    status = Column(
        Enum("active", "revoked", name="scanner_status_enum"),
        nullable=False,
        default="active",
    )
    conformance_status = Column(
        Enum("conformant", "pending", "revoked", name="scanner_conformance_enum"),
        nullable=False,
        default="pending",
    )
    created_at = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)

    scores = relationship("Score", back_populates="scanner")


class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, default=lambda: _sid("scr"))
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    scanner_id = Column(String, ForeignKey("scanners.id"), nullable=False)
    methodology_version_id = Column(String, ForeignKey("methodology_versions.id"), nullable=True)
    transparency_score = Column(Float, nullable=False)
    reliability_score = Column(Float, nullable=False)
    security_score = Column(Float, nullable=False)
    privacy_score = Column(Float, nullable=False)
    safety_societal_score = Column(Float, nullable=False)
    excessive_agency_score = Column(Float, nullable=False)
    composite_score = Column(Float, nullable=False)
    coi_disclosed = Column(Boolean, nullable=False, default=False)
    scored_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())

    service = relationship("Service", back_populates="scores")
    scanner = relationship("Scanner", back_populates="scores")

    __table_args__ = (
        Index("ix_score_service_scanner_created", "service_id", "scanner_id", "created_at"),
    )


class IdentityMatchFlag(Base):
    __tablename__ = "identity_match_flags"

    id = Column(String, primary_key=True, default=lambda: _sid("flg"))
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    scanner_id = Column(String, ForeignKey("scanners.id"), nullable=True)
    incoming_identity = Column(JSON, nullable=False)
    existing_identity = Column(JSON, nullable=True)
    match_tier = Column(String, nullable=False)
    status = Column(
        Enum("pending", "accepted", "rejected", name="flag_status_enum"),
        nullable=False,
        default="pending",
    )
    created_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)

    service = relationship("Service", back_populates="flags")
    scanner = relationship("Scanner")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=lambda: _sid("aud"))
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    actor = Column(String, nullable=True)
    detail = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
