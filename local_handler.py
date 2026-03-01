from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from services import database as dbs


def publish_alert(db: Session, subject: str, message: str, priority: str = "NORMAL", alert_type: str = "INFO") -> None:
    try:
        dbs.create_alert(db, subject, message, priority, alert_type)
    except Exception as e:
        print(f"Alert store error: {e}")


def record_action_log(db: Session, action_type: str, details: Dict[str, Any], patient_id: str | None = None, resource_id: str | None = None):
    try:
        dbs.record_action(db, action_type, details, patient_id, resource_id)
    except Exception as e:
        print(f"Action log error: {e}")


def update_patient_status(db: Session, params: Dict[str, Any]):
    patient_id = params.get("patient_id")
    new_severity = (params.get("new_severity") or params.get("severity") or "").lower()
    condition = params.get("condition")
    updated_by = params.get("updated_by")

    if not patient_id:
        return {"statusCode": 400, "body": {"error": "patient_id is required"}}
    if not new_severity:
        return {"statusCode": 400, "body": {"error": "severity is required"}}

    patient = dbs.get_patient(db, patient_id)
    if not patient:
        return {"statusCode": 404, "body": {"error": "Patient not found"}}

    old_severity = patient.triage
    update_payload = {"triage": new_severity, "updated_at": datetime.utcnow()}
    if condition:
        update_payload["condition"] = condition
    dbs.update_patient(db, patient_id, update_payload)

    actions_taken = [f"Updated patient {patient_id} severity to {new_severity}"]

    # Handle ICU  General Ward transfer if condition improves (critical  moderate/low)
    if old_severity == "critical" and new_severity in ["moderate", "low"]:
        current_bed_id = patient.assigned_bed
        if current_bed_id and "icu" in current_bed_id.lower():
            try:
                general_beds = dbs.list_available_beds(db, "hospital_bed")
            except Exception as e:
                general_beds = []
                print(f"General ward scan error: {e}")

            if general_beds:
                new_bed = general_beds[0]
                new_bed_id = new_bed.id
                
                # Free ICU bed
                dbs.update_resource(db, current_bed_id, {"status": "available", "patient_id": None, "freed_at": datetime.utcnow()})
                
                # Assign general bed
                dbs.update_resource(db, new_bed_id, {"status": "occupied", "patient_id": patient_id, "allocated_at": datetime.utcnow()})
                dbs.update_patient(db, patient_id, {"assigned_bed": new_bed_id})

                publish_alert(
                    db,
                    "Patient Condition Improved - Transferred from ICU",
                    (
                        f"Patient {patient_id} condition improved to {new_severity}.\n"
                        f"Automatically transferred from ICU bed {current_bed_id} to general ward bed {new_bed_id}.\n"
                        f"Condition: {condition or 'Improved'}\n"
                        f"Updated by: {updated_by or 'System'}\n"
                        f"Time: {datetime.utcnow().isoformat()}\n"
                    ),
                    priority="NORMAL",
                    alert_type="PATIENT_TRANSFER",
                )
                actions_taken.append(f"Auto-transferred from ICU bed {current_bed_id} to general bed {new_bed_id}")
                record_action_log(db, "AUTO_ICU_TO_GENERAL", {"patient_id": patient_id, "from_bed": current_bed_id, "to_bed": new_bed_id, "severity": new_severity, "condition": condition}, patient_id, new_bed_id)
            else:
                publish_alert(
                    db,
                    "Patient Improved but No General Beds Available",
                    (
                        f"Patient {patient_id} improved to {new_severity} but no general ward beds available.\n"
                        f"Patient remains in ICU bed {current_bed_id}.\n"
                        f"Time: {datetime.utcnow().isoformat()}\n"
                    ),
                    priority="HIGH",
                    alert_type="CAPACITY",
                )
                actions_taken.append("Patient improved but no general beds available - remains in ICU")
                record_action_log(db, "ICU_DISCHARGE_BLOCKED", {"patient_id": patient_id, "severity": new_severity, "reason": "No general beds"}, patient_id)

    # Handle General  ICU transfer if condition worsens (moderate/low  critical)
    if new_severity == "critical" and old_severity != "critical":
        try:
            available_beds = dbs.list_available_beds(db, "icu_bed")
        except Exception as e:
            available_beds = []
            print(f"ICU scan error: {e}")

        if available_beds:
            bed = available_beds[0]
            bed_id = bed.id
            old_bed_id = patient.assigned_bed
            
            # Free old bed
            if old_bed_id and old_bed_id != "None":
                dbs.update_resource(db, old_bed_id, {"status": "available", "patient_id": None, "freed_at": datetime.utcnow()})
            
            # Allocate new ICU bed
            dbs.update_resource(db, bed_id, {"status": "occupied", "patient_id": patient_id, "allocated_at": datetime.utcnow()})
            dbs.update_patient(db, patient_id, {"assigned_bed": bed_id})

            publish_alert(
                db,
                "CRITICAL: ICU Bed Auto-Allocated",
                (
                    f"Patient {patient_id} marked CRITICAL.\n"
                    f"ICU Bed {bed_id} automatically allocated.\n"
                    f"From Bed: {old_bed_id or 'None'}\n"
                    f"Condition: {condition or 'Not specified'}\n"
                    f"Updated by: {updated_by or 'System'}\n"
                    f"Time: {datetime.utcnow().isoformat()}\n"
                ),
                priority="CRITICAL",
                alert_type="CRITICAL_PATIENT",
            )
            actions_taken.append(f"ICU bed {bed_id} allocated and old bed {old_bed_id} freed")
            record_action_log(db, "AUTO_ICU_ALLOCATION", {"patient_id": patient_id, "bed_id": bed_id, "old_bed_id": old_bed_id, "severity": new_severity, "condition": condition}, patient_id, bed_id)
        else:
            publish_alert(
                db,
                "URGENT: No ICU Beds Available - Critical Patient",
                (
                    f"CRITICAL patient {patient_id} needs ICU but NO BEDS AVAILABLE!\n"
                    f"Condition: {condition or 'Not specified'}\n"
                    f"Time: {datetime.utcnow().isoformat()}\n"
                ),
                priority="CRITICAL",
                alert_type="CAPACITY",
            )
            actions_taken.append("No ICU beds available - urgent alert sent")
            record_action_log(db, "ICU_BED_SHORTAGE", {"patient_id": patient_id, "severity": new_severity, "condition": condition}, patient_id)

    return {
        "statusCode": 200,
        "body": {
            "success": True,
            "patient_id": patient_id,
            "old_severity": old_severity,
            "new_severity": new_severity,
            "actions_taken": actions_taken,
        },
    }


def get_available_beds(db: Session, params: Dict[str, Any]):
    department = (params.get("department") or "").upper()
    include_occupied = str(params.get("include_occupied", "false")).lower() == "true"
    bed_type = "icu_bed" if department == "ICU" else "hospital_bed"

    items = dbs.list_beds_by_type(db, bed_type) if include_occupied else dbs.list_available_beds(db, bed_type)
    beds = [{
        "bed_id": it.id,
        "type": it.type,
        "status": it.status,
        "patient_id": it.patient_id,
        "department": department or "GENERAL",
    } for it in items]

    return {"statusCode": 200, "body": {"beds": beds, "count": len(beds), "department": department or "ALL", "include_occupied": include_occupied}}


def get_department_status(db: Session, params: Dict[str, Any]):
    department = (params.get("department") or "").upper()
    if not department:
        return {"statusCode": 400, "body": {"error": "department required"}}
    bed_type = "icu_bed" if department == "ICU" else "hospital_bed"
    beds = dbs.list_beds_by_type(db, bed_type)
    total_beds = len(beds)
    occupied = sum(1 for b in beds if b.status == "occupied")
    available = total_beds - occupied
    occupancy_rate = (occupied / total_beds * 100) if total_beds else 0
    patient_ids = [b.patient_id for b in beds if b.patient_id]
    critical_count = 0
    for pid in patient_ids:
        p = dbs.get_patient(db, pid)
        if p and p.triage == "critical":
            critical_count += 1
    return {
        "statusCode": 200,
        "body": {
            "department": department,
            "total_beds": total_beds,
            "occupied_beds": occupied,
            "available_beds": available,
            "occupancy_rate": round(occupancy_rate, 1),
            "critical_patients_count": critical_count,
            "patient_count": len(patient_ids),
        },
    }


def transfer_patient(db: Session, params: Dict[str, Any]):
    patient_id = params.get("patient_id")
    from_department = (params.get("from_department") or "").upper()
    to_department = (params.get("to_department") or "").upper()
    reason = params.get("reason", "Medical necessity")

    patient = dbs.get_patient(db, patient_id)
    if not patient:
        return {"statusCode": 404, "body": {"error": "Patient not found"}}
    old_bed_id = patient.assigned_bed
    new_bed_type = "icu_bed" if to_department == "ICU" else "hospital_bed"

    available_beds = dbs.list_available_beds(db, new_bed_type)
    if not available_beds:
        return {"statusCode": 409, "body": {"success": False, "error": f"No available beds in {to_department}"}}

    new_bed_id = available_beds[0].id

    if old_bed_id and old_bed_id != "None":
        dbs.update_resource(db, old_bed_id, {"status": "available", "patient_id": None, "allocated_at": None})
    dbs.update_resource(db, new_bed_id, {"status": "occupied", "patient_id": patient_id, "allocated_at": datetime.utcnow()})
    dbs.update_patient(db, patient_id, {"assigned_bed": new_bed_id, "department": to_department, "updated_at": datetime.utcnow()})

    transfer_priority = "HIGH" if to_department == "ICU" else "NORMAL"
    publish_alert(
        db,
        f"Patient Transfer: {patient_id}",
        (
            f"From: {from_department} (Bed: {old_bed_id or 'None'})\n"
            f"To: {to_department} (Bed: {new_bed_id})\n"
            f"Reason: {reason}\n"
            f"Time: {datetime.utcnow().isoformat()}\n"
        ),
        priority=transfer_priority,
        alert_type="TRANSFER",
    )
    record_action_log(db, "PATIENT_TRANSFER", {"patient_id": patient_id, "from_department": from_department, "to_department": to_department, "old_bed": old_bed_id, "new_bed": new_bed_id, "reason": reason}, patient_id, new_bed_id)

    return {"statusCode": 200, "body": {"success": True, "patient_id": patient_id, "to_department": to_department, "to_bed": new_bed_id}}


def discharge_patient(db: Session, params: Dict[str, Any]):
    patient_id = params.get("patient_id")
    discharge_reason = params.get("discharge_reason", "Recovered")
    discharged_by = params.get("discharged_by", "System")
    if not patient_id:
        return {"statusCode": 400, "body": {"error": "patient_id required"}}

    patient = dbs.get_patient(db, patient_id)
    if not patient:
        return {"statusCode": 404, "body": {"error": "Patient not found"}}
    bed_id = patient.assigned_bed
    patient_name = patient.name

    if bed_id and bed_id != "None":
        dbs.update_resource(db, bed_id, {"status": "available", "patient_id": None, "allocated_at": None})
    dbs.update_patient(db, patient_id, {"status": "discharged", "discharged_at": datetime.utcnow(), "discharge_reason": discharge_reason, "assigned_bed": "None"})

    publish_alert(
        db,
        f"Patient Discharged: {patient_id}",
        (
            f"Patient {patient_id} ({patient_name}) discharged.\n"
            f"Bed Released: {bed_id or 'None'}\n"
            f"Reason: {discharge_reason}\n"
            f"Discharged by: {discharged_by}\n"
            f"Time: {datetime.utcnow().isoformat()}\n"
        ),
        priority="NORMAL",
        alert_type="DISCHARGE",
    )
    record_action_log(db, "PATIENT_DISCHARGE", {"patient_id": patient_id, "bed_released": bed_id, "discharge_reason": discharge_reason, "discharged_by": discharged_by}, patient_id, bed_id)

    return {"statusCode": 200, "body": {"success": True, "patient_id": patient_id, "bed_released": bed_id or "None", "message": f"Patient {patient_id} discharged"}}


def admit_patient(db: Session, params: Dict[str, Any]):
    patient_name = params.get("patient_name")
    age = params.get("age")
    condition = params.get("condition")
    severity = params.get("severity", "moderate").lower()
    admitted_by = params.get("admitted_by", "ER Staff")
    if not all([patient_name, condition]):
        return {"statusCode": 400, "body": {"error": "patient_name and condition required"}}

    import random
    if severity == "critical":
        bed_type = "icu_bed"; department = "ICU"; auto_message = "Critical - assigned ICU"
    else:
        bed_type = "hospital_bed"; department = "GENERAL"; auto_message = f"{severity.title()} - assigned General"

    # Do not silently place a patient in an inappropriate unit. Capacity shortfalls
    # are operational events that require a human decision.
    patient_id = f"P{random.randint(10000, 99999)}"
    while dbs.get_patient(db, patient_id):
        patient_id = f"P{random.randint(10000, 99999)}"
    try:
        bed = dbs.allocate_first_available_bed(db, bed_type, patient_id)
    except Exception as e:
        db.rollback()
        print(f"ALLOCATION ERROR: {e}")
        bed = None
    if not bed:
        publish_alert(db, "Capacity escalation required", f"No {department} bed is available for a {severity} admission.", "CRITICAL", "CAPACITY")
        return {"statusCode": 409, "body": {"success": False, "error": f"No {department} beds available; no unsafe fallback was applied"}}

    bed_id = bed.id
    dbs.put_patient(db, {
        "id": patient_id,
        "name": patient_name,
        "age": int(age or 0),
        "condition": condition,
        "triage": severity,
        "assigned_bed": bed_id,
        "department": department,
        "status": "admitted",
        "admitted_at": datetime.utcnow(),
        "admitted_by": admitted_by,
    })
    # The resource reservation was made with a row lock above.
    db.commit()

    publish_alert(
        db,
        f"New Patient Admission: {patient_name}",
        (
            f"Patient ID: {patient_id}\nName: {patient_name}\nSeverity: {severity.upper()}\n"
            f"Department: {department}\nBed: {bed_id}\nTime: {datetime.utcnow().isoformat()}\n{auto_message}\n"
        ),
        priority=("CRITICAL" if severity == "critical" else "HIGH" if severity == "moderate" else "NORMAL"),
        alert_type="ADMISSION",
    )
    record_action_log(db, "PATIENT_ADMISSION", {"patient_id": patient_id, "patient_name": patient_name, "severity": severity, "department": department, "bed_assigned": bed_id}, patient_id, bed_id)

    return {"statusCode": 200, "body": {"success": True, "patient_id": patient_id, "patient_name": patient_name, "department": department, "bed_assigned": bed_id}}


def send_hospital_alert(db: Session, params: Dict[str, Any]):
    alert_type = params.get("alert_type", "INFO")
    message = params.get("message", "")
    priority = params.get("priority", "NORMAL")
    subject = params.get("subject", "Hospital Alert")
    if not message:
        return {"statusCode": 400, "body": {"error": "message is required"}}

    # Capacity enrichment if relevant
    capacity_warning = ""
    if alert_type.lower() in ["capacity", "bed"]:
        icu_available = len(dbs.list_available_beds(db, "icu_bed"))
        gen_available = len(dbs.list_available_beds(db, "hospital_bed"))
        capacity_warning = f"\n\nICU: {icu_available}/20 available\nGeneral: {gen_available}/100 available"
        if icu_available <= 2 and priority != "CRITICAL":
            priority = "HIGH"
        if gen_available <= 10 and priority == "NORMAL":
            priority = "HIGH"

    publish_alert(db, subject, f"{message}{capacity_warning}\nSent: {datetime.utcnow().isoformat()}", priority=priority.upper(), alert_type=alert_type.upper())
    record_action_log(db, "CUSTOM_ALERT", {"alert_type": alert_type, "priority": priority, "subject": subject, "message": message})
    return {"statusCode": 200, "body": {"success": True, "message": "Alert sent"}}


def list_patients(db: Session, params: Dict[str, Any]):
    severity = (params.get("severity") or "").lower()
    department = (params.get("department") or "").upper()
    
    query = db.query(dbs.Patient)
    if severity and severity != "null":
        query = query.filter(dbs.Patient.triage == severity)
    if department and department != "null":
        query = query.filter(dbs.Patient.department == department)
        
    patients = query.all()
    patient_list = [{
        "id": p.id,
        "name": p.name,
        "age": p.age,
        "condition": p.condition,
        "triage": p.triage,
        "department": p.department,
        "assigned_bed": p.assigned_bed,
        "status": p.status
    } for p in patients]
    
    return {
        "statusCode": 200, 
        "body": {
            "patients": patient_list, 
            "count": len(patient_list),
            "filter_severity": severity or "ALL",
            "filter_department": department or "ALL"
        }
    }
