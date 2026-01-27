import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/hosp_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # admin, doctor, nurse

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    age = Column(Integer)
    condition = Column(String)
    triage = Column(String) # critical, moderate, low
    assigned_bed = Column(String, nullable=True)
    department = Column(String)
    status = Column(String) # admitted, discharged
    admitted_at = Column(DateTime, default=datetime.utcnow)
    admitted_by = Column(String)
    discharged_at = Column(DateTime, nullable=True)
    discharge_reason = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Resource(Base):
    __tablename__ = "resources"
    id = Column(String, primary_key=True, index=True)
    type = Column(String) # icu_bed, hospital_bed
    status = Column(String) # available, occupied
    patient_id = Column(String, nullable=True)
    allocated_at = Column(DateTime, nullable=True)
    freed_at = Column(DateTime, nullable=True)

class ActionLog(Base):
    __tablename__ = "action_logs"
    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String, unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action_type = Column(String)
    details = Column(JSON)
    patient_id = Column(String)
    resource_id = Column(String)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    subject = Column(String)
    message = Column(String)
    priority = Column(String)
    alert_type = Column(String)

class ActionProposal(Base):
    """A proposed operational action awaiting an authorised human decision."""
    __tablename__ = "action_proposals"
    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, nullable=False)
    function = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)
    rationale = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected, expired
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String, nullable=True)

class SurgeScenario(Base):
    __tablename__ = "surge_scenarios"
    id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, nullable=False)
    name = Column(String, nullable=False)
    horizon_hours = Column(Integer, nullable=False)
    incoming_critical = Column(Integer, default=0)
    incoming_moderate = Column(Integer, default=0)
    incoming_low = Column(Integer, default=0)
    result = Column(JSON, nullable=False)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions to mimic firebase_db interface
def get_patient(db: Session, patient_id: str):
    return db.query(Patient).filter(Patient.id == patient_id).first()

def put_patient(db: Session, patient_data: dict):
    # If exists, update, else create
    patient = db.query(Patient).filter(Patient.id == patient_data["id"]).first()
    if patient:
        for key, value in patient_data.items():
            if hasattr(patient, key):
                if isinstance(value, str) and "T" in value and "-" in value: # simplistic ISO date check
                    try:
                        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except: pass
                setattr(patient, key, value)
    else:
        # Convert ISO strings to datetime
        for key in ["admitted_at", "discharged_at", "updated_at"]:
            if key in patient_data and isinstance(patient_data[key], str):
                try:
                    patient_data[key] = datetime.fromisoformat(patient_data[key].replace("Z", "+00:00"))
                except: pass
        patient = Patient(**patient_data)
        db.add(patient)
    db.commit()

def update_patient(db: Session, patient_id: str, data: dict):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        for key, value in data.items():
            if hasattr(patient, key):
                if isinstance(value, str) and "T" in value and "-" in value:
                    try:
                        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except: pass
                setattr(patient, key, value)
        db.commit()

def list_available_beds(db: Session, bed_type: str):
    return db.query(Resource).filter(Resource.type == bed_type, Resource.status == "available").all()

def allocate_first_available_bed(db: Session, bed_type: str, patient_id: str):
    """Reserve one resource using a row lock when the database supports it.

    This prevents two concurrent requests from selecting the same available bed.
    """
    bed = (db.query(Resource).filter(Resource.type == bed_type, Resource.status == "available")
           .with_for_update(skip_locked=True).first())
    if not bed:
        return None
    bed.status = "occupied"
    bed.patient_id = patient_id
    bed.allocated_at = datetime.utcnow()
    return bed

def list_beds_by_type(db: Session, bed_type: str):
    return db.query(Resource).filter(Resource.type == bed_type).all()

def get_resource(db: Session, resource_id: str):
    return db.query(Resource).filter(Resource.id == resource_id).first()

def update_resource(db: Session, resource_id: str, data: dict):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if resource:
        for key, value in data.items():
            if hasattr(resource, key):
                if isinstance(value, str) and value and "T" in value and "-" in value:
                    try:
                        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except: pass
                setattr(resource, key, value)
        db.commit()

def record_action(db: Session, action_type: str, details: dict, patient_id: str = None, resource_id: str = None):
    import time
    action_id = f"action-{time.time()}"
    log = ActionLog(
        action_id=action_id,
        action_type=action_type,
        details=details,
        patient_id=patient_id or "N/A",
        resource_id=resource_id or "N/A"
    )
    db.add(log)
    db.commit()

def create_alert(db: Session, subject: str, message: str, priority: str = "NORMAL", alert_type: str = "INFO"):
    import time
    alert_id = f"alert-{time.time()}"
    alert = Alert(
        alert_id=alert_id,
        subject=subject,
        message=message,
        priority=priority,
        alert_type=alert_type
    )
    db.add(alert)
    db.commit()
    return alert_id
