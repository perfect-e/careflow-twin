#!/usr/bin/env python3
"""
Populate PostgreSQL with realistic hospital data for testing autonomous agent features.
"""
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import text

load_dotenv()

from services import database as dbs


# Realistic patient data
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
]

CONDITIONS = {
    "critical": [
        "Myocardial Infarction (Heart Attack)",
        "Severe Pneumonia with Respiratory Failure",
        "Stroke with Neurological Deficits",
        "Multiple Trauma from Motor Vehicle Accident",
        "Septic Shock",
        "Acute Respiratory Distress Syndrome (ARDS)",
        "Cardiac Arrest (Post-Resuscitation)",
        "Massive Gastrointestinal Bleeding",
        "Acute Kidney Injury requiring Dialysis",
        "Status Epilepticus (Prolonged Seizures)"
    ],
    "moderate": [
        "Pneumonia",
        "Chest Pain (Suspected Angina)",
        "Abdominal Pain (Possible Appendicitis)",
        "Asthma Exacerbation",
        "Cellulitis (Skin Infection)",
        "Urinary Tract Infection",
        "Dehydration",
        "Mild Heart Failure",
        "Diabetic Hyperglycemia",
        "Gastroenteritis"
    ],
    "low": [
        "Minor Laceration requiring Sutures",
        "Sprained Ankle",
        "Mild Allergic Reaction",
        "Upper Respiratory Infection (Cold)",
        "Back Pain",
        "Headache (Migraine)",
        "Nausea and Vomiting",
        "Minor Burns",
        "Insect Bite",
        "Dental Pain"
    ]
}

DEPARTMENTS = ["GENERAL", "ICU", "EMERGENCY", "CARDIOLOGY", "NEUROLOGY", "SURGERY"]


def generate_patient_id():
    """Generate unique patient ID."""
    return f"P{random.randint(10000, 99999)}"


def create_beds(db: Session):
    """Create realistic bed inventory across departments."""
    print("Creating bed inventory...")
    beds = []
    
    # ICU beds (20 total)
    for i in range(1, 21):
        bed_id = f"ICU-BED-{i:02d}"
        bed = dbs.Resource(
            id=bed_id,
            type="icu_bed",
            status="available"
        )
        db.add(bed)
        beds.append(bed)
    
    # General beds (100 total)
    for i in range(1, 101):
        bed_id = f"GEN-BED-{i:03d}"
        bed = dbs.Resource(
            id=bed_id,
            type="hospital_bed",
            status="available"
        )
        db.add(bed)
        beds.append(bed)
    
    db.commit()
    print(f"  Created {len(beds)} beds.")
    return beds


def create_patients(db: Session, beds, num_patients=30):
    """Create realistic patient admissions."""
    print(f"\nAdmitting {num_patients} patients...")
    patients = []
    # Re-fetch beds to ensure they are attached to session
    available_beds = db.query(dbs.Resource).filter(dbs.Resource.status == "available").all()
    
    for i in range(num_patients):
        if not available_beds:
            print("  No more beds available!")
            break
        
        # Generate patient data
        patient_id = generate_patient_id()
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        age = random.randint(18, 90)
        severity = random.choices(
            ["critical", "moderate", "low"],
            weights=[0.15, 0.50, 0.35],  # 15% critical, 50% moderate, 35% low
            k=1
        )[0]
        condition = random.choice(CONDITIONS[severity])
        
        # Assign appropriate bed based on severity
        if severity == "critical":
            # Try to get ICU bed
            icu_beds = [b for b in available_beds if b.type == "icu_bed"]
            if icu_beds:
                bed = icu_beds[0]
            else:
                # ICU full, use general bed (realistic scenario)
                bed = available_beds[0]
                print(f"  WARNING: ICU full! Patient {patient_id} assigned to general bed")
        else:
            # Use general bed
            general_beds = [b for b in available_beds if b.type == "hospital_bed"]
            if general_beds:
                bed = general_beds[0]
            else:
                bed = available_beds[0]
        
        # Calculate admission time (stagger over last 7 days)
        admitted_at = (datetime.utcnow() - timedelta(days=random.uniform(0, 7)))
        
        # Create patient record
        patient = dbs.Patient(
            id=patient_id,
            name=name,
            age=age,
            condition=condition,
            triage=severity,
            status="admitted",
            department="ICU" if bed.type == "icu_bed" else "GENERAL",
            assigned_bed=bed.id,
            admitted_by=random.choice(["Dr. Smith", "Dr. Johnson", "Dr. Williams", "Dr. Brown"]),
            admitted_at=admitted_at,
            updated_at=admitted_at
        )
        
        # Write patient to DB
        db.add(patient)
        
        # Update bed status
        bed.status = "occupied"
        bed.patient_id = patient_id
        bed.allocated_at = admitted_at
        
        # Remove from available
        available_beds.remove(bed)
        
        # Log admission action
        dbs.record_action(
            db,
            "PATIENT_ADMISSION",
            {
                "patient_name": name,
                "condition": condition,
                "severity": severity,
                "bed_type": bed.type,
                "department": patient.department
            },
            patient_id=patient_id,
            resource_id=bed.id
        )
        
        patients.append(patient)
        print(f"  Admitted: {patient_id} - {name}, {age}y, {severity.upper()} ({bed.id})")
    
    db.commit()
    return patients


def create_alerts(db: Session, patients):
    """Create sample alerts for critical patients."""
    print("\nGenerating alerts for critical patients...")
    critical_patients = [p for p in patients if p.triage == "critical"]
    
    for patient in critical_patients[:5]:  # Alert for first 5 critical patients
        alert_id = dbs.create_alert(
            db,
            subject=f"CRITICAL: Patient {patient.id} requires immediate attention",
            message=f"{patient.name} (Age: {patient.age}) admitted with {patient.condition}. "
                    f"Assigned to {patient.assigned_bed} in {patient.department}.",
            priority="CRITICAL",
            alert_type="PATIENT_STATUS"
        )
        print(f"  Alert created: {alert_id} for {patient.name}")


def create_users(db: Session):
    """Create default users."""
    import bcrypt
    def get_password_hash(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    print("\nCreating default users...")
    users_data = [
        ("admin", "admin123", "admin"),
        ("doctor", "doctor123", "doctor"),
        ("nurse", "nurse123", "nurse")
    ]
    for username, password, role in users_data:
        if not db.query(dbs.User).filter(dbs.User.username == username).first():
            u = dbs.User(username=username, hashed_password=get_password_hash(password), role=role)
            db.add(u)
    db.commit()
    print("  Created default users (admin, doctor, nurse)")

def clean_db(db: Session):
    print("Cleaning existing data...")
    db.execute(text("TRUNCATE TABLE users, patients, resources, action_logs, alerts RESTART IDENTITY CASCADE"))
    db.commit()

def main():
    print("="*60)
    print("POPULATING HOSPITAL DATABASE WITH REALISTIC DATA (POSTGRES)")
    print("="*60)
    print()
    
    dbs.Base.metadata.create_all(bind=dbs.engine)
    db = dbs.SessionLocal()
    
    try:
        clean_db(db)
        create_users(db)
        beds = create_beds(db)
        patients = create_patients(db, beds, num_patients=30)
        create_alerts(db, patients)
        
        print("\n" + "="*60)
        print("DATABASE POPULATION COMPLETE")
        print("="*60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
