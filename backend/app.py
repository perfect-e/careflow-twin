import os
from typing import Optional, List, Literal
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt
import threading

from services import database as dbs
from services.ai_client import ensure_model_available
from orchestration.graph import propose_route
import local_handler
from services.surge import Capacity, forecast, simulate
import uuid

# Constants for JWT
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="CareFlow Twin API", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    # Never download a multi-GB model while starting a production API.
    if os.getenv("PULL_MODEL_ON_STARTUP", "false").lower() == "true":
        ensure_model_available()
    # A first administrator is created only from an explicit environment secret.
    # This keeps a fresh local deployment usable without shipping credentials.
    bootstrap_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
    if bootstrap_password:
        db = dbs.SessionLocal()
        try:
            if not db.query(dbs.User).first():
                db.add(dbs.User(username="admin", hashed_password=get_password_hash(bootstrap_password), role="admin"))
                db.commit()
        finally:
            db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserCreate(BaseModel):
    username: str
    password: str = Field(min_length=12)
    role: Literal["admin", "doctor", "nurse"] = "nurse"

class AdmitRequest(BaseModel):
    patient_name: str
    age: Optional[int] = None
    condition: str
    severity: Literal["low", "moderate", "critical"] = "moderate"
    admitted_by: Optional[str] = None

class UpdateStatusRequest(BaseModel):
    patient_id: str
    severity: Optional[Literal["low", "moderate", "critical"]] = None
    new_severity: Optional[Literal["low", "moderate", "critical"]] = None
    condition: Optional[str] = None
    updated_by: Optional[str] = None

class TransferRequest(BaseModel):
    patient_id: str
    from_department: str
    to_department: str
    reason: Optional[str] = None

class DischargeRequest(BaseModel):
    patient_id: str
    discharge_reason: Optional[str] = None
    discharged_by: Optional[str] = None

class BedsRequest(BaseModel):
    department: Optional[str] = None
    include_occupied: Optional[bool] = False

class DepartmentStatusRequest(BaseModel):
    department: Literal["ICU", "GENERAL"]

class AlertRequest(BaseModel):
    subject: str
    message: str
    priority: Literal["NORMAL", "HIGH", "CRITICAL"] = "NORMAL"
    alert_type: Optional[str] = "INFO"

class AgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

class ProposalDecision(BaseModel):
    approve: bool

class ForecastRequest(BaseModel):
    horizon_hours: int = Field(default=24, ge=1, le=168)
    hourly_critical_arrivals: float = Field(default=0, ge=0, le=100)
    hourly_moderate_arrivals: float = Field(default=0, ge=0, le=100)

class ScenarioRequest(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    horizon_hours: int = Field(default=24, ge=1, le=168)
    incoming_critical: int = Field(default=0, ge=0, le=1000)
    incoming_moderate: int = Field(default=0, ge=0, le=1000)
    incoming_low: int = Field(default=0, ge=0, le=1000)

# Auth Helpers
def verify_password(plain_password, hashed_password):
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(dbs.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(dbs.User).filter(dbs.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_roles(*roles):
    def checker(user: dbs.User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Your role is not authorised for this operation")
        return user
    return checker

# API Key check (optional for some endpoints)
API_KEY = os.getenv("API_KEY", "local-dev-key")
def require_key(x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
         # For simplicity in local dev, if no API key is provided but it matches secret, allow
         pass # raise HTTPException(status_code=401, detail="Invalid API key")

# Endpoints
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(dbs.get_db)):
    user = db.query(dbs.User).filter(dbs.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.post("/users")
async def register(user: UserCreate, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin"))):
    db_user = db.query(dbs.User).filter(dbs.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = dbs.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/init_db")
async def init_db(db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin"))):
    # Seed resources if empty
    if db.query(dbs.Resource).count() == 0:
        # 20 ICU beds
        for i in range(1, 21):
            db.add(dbs.Resource(id=f"ICU-BED-{i:02d}", type="icu_bed", status="available"))
        # 100 General beds
        for i in range(1, 101):
            db.add(dbs.Resource(id=f"GEN-BED-{i:03d}", type="hospital_bed", status="available"))
        
        db.commit()
        return {"message": "Database initialized with care-capacity resources"}
    return {"message": "Database already initialized"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "careflow-twin", "ai_execution": "human-approval-required"}

@app.post("/admit_patient")
def api_admit(req: AdmitRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    return local_handler.admit_patient(db, req.dict())

@app.post("/update_patient_status")
def api_update_status(req: UpdateStatusRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    return local_handler.update_patient_status(db, req.dict())

@app.post("/transfer_patient")
def api_transfer(req: TransferRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    return local_handler.transfer_patient(db, req.dict())

@app.post("/discharge_patient")
def api_discharge(req: DischargeRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    return local_handler.discharge_patient(db, req.dict())

@app.post("/get_available_beds")
def api_beds(req: BedsRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    payload = {"department": (req.department or ""), "include_occupied": str(bool(req.include_occupied)).lower()}
    return local_handler.get_available_beds(db, payload)

@app.post("/get_department_status")
def api_dept_status(req: DepartmentStatusRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    return local_handler.get_department_status(db, req.dict())

@app.post("/send_hospital_alert")
def api_alert(req: AlertRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor", "nurse"))):
    return local_handler.send_hospital_alert(db, req.dict())

@app.post("/agent/propose")
def api_agent_propose(req: AgentRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    route = propose_route(req.message)
    if "function" not in route:
        return {"message": route.get("message", "No action proposed"), "data": route.get("data", {}), "requires_approval": False}
    read_handlers = {"get_available_beds": local_handler.get_available_beds,
                     "get_department_status": local_handler.get_department_status,
                     "list_patients": local_handler.list_patients}
    if route["function"] in read_handlers:
        result = read_handlers[route["function"]](db, route.get("parameters", {}))
        return {"message": "Read-only operational result", "data": result.get("body", result), "requires_approval": False}
    proposal = dbs.ActionProposal(id=str(uuid.uuid4()), created_by=current_user.username,
                                  function=route["function"], parameters=route.get("parameters", {}),
                                  rationale="AI-generated operational proposal; clinician review required.")
    db.add(proposal); db.commit()
    return {"message": "Action proposed. Review and approve before it is executed.", "proposal_id": proposal.id,
            "function": proposal.function, "parameters": proposal.parameters, "rationale": proposal.rationale,
            "requires_approval": True}

@app.post("/agent/proposals/{proposal_id}/decision")
def decide_proposal(proposal_id: str, decision: ProposalDecision, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    proposal = db.query(dbs.ActionProposal).filter(dbs.ActionProposal.id == proposal_id).first()
    if not proposal or proposal.status != "pending":
        raise HTTPException(status_code=404, detail="Pending proposal not found")
    proposal.decided_by, proposal.decided_at = current_user.username, datetime.utcnow()
    if not decision.approve:
        proposal.status = "rejected"; db.commit()
        return {"message": "Proposal rejected"}
    handlers = {"admit_patient": local_handler.admit_patient, "update_patient_status": local_handler.update_patient_status,
                "transfer_patient": local_handler.transfer_patient, "discharge_patient": local_handler.discharge_patient,
                "send_hospital_alert": local_handler.send_hospital_alert}
    handler = handlers.get(proposal.function)
    if not handler:
        proposal.status = "rejected"; db.commit()
        return {"message": "Read-only request; no execution required", "data": proposal.parameters}
    result = handler(db, proposal.parameters)
    proposal.status = "approved"; db.commit()
    return {"message": "Approved action executed", "data": result.get("body", result)}

def _capacity(db: Session, resource_type: str) -> Capacity:
    beds = dbs.list_beds_by_type(db, resource_type)
    return Capacity(total=len(beds), occupied=sum(b.status == "occupied" for b in beds))

@app.post("/surge/forecast")
def surge_forecast(req: ForecastRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    return forecast(_capacity(db, "icu_bed"), _capacity(db, "hospital_bed"), req.horizon_hours,
                    req.hourly_critical_arrivals, req.hourly_moderate_arrivals)

@app.post("/surge/scenarios")
def create_scenario(req: ScenarioRequest, db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(require_roles("admin", "doctor"))):
    result = simulate(_capacity(db, "icu_bed"), _capacity(db, "hospital_bed"), req.incoming_critical,
                      req.incoming_moderate, req.incoming_low, req.horizon_hours)
    item = dbs.SurgeScenario(id=str(uuid.uuid4()), created_by=current_user.username, name=req.name,
                             horizon_hours=req.horizon_hours, incoming_critical=req.incoming_critical,
                             incoming_moderate=req.incoming_moderate, incoming_low=req.incoming_low, result=result)
    db.add(item); db.commit()
    return {"id": item.id, "name": item.name, "result": result}

@app.get("/surge/scenarios")
def list_scenarios(db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    items = db.query(dbs.SurgeScenario).order_by(dbs.SurgeScenario.created_at.desc()).limit(20).all()
    return [{"id": x.id, "name": x.name, "created_at": x.created_at, "result": x.result} for x in items]

@app.get("/patients")
def list_patients(db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    patients = db.query(dbs.Patient).all()
    return patients

@app.get("/alerts")
def list_alerts(db: Session = Depends(dbs.get_db), current_user: dbs.User = Depends(get_current_user)):
    alerts = db.query(dbs.Alert).order_by(dbs.Alert.timestamp.desc()).limit(50).all()
    return alerts
