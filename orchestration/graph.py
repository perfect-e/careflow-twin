from typing import Dict
from sqlalchemy.orm import Session
from services.ai_client import generate_text
from local_handler import (
    admit_patient,
    update_patient_status,
    transfer_patient,
    discharge_patient,
    get_available_beds,
    get_department_status,
    send_hospital_alert,
    list_patients,
)


SYSTEM_PROMPT = """You are a Technical Hospital Operations Controller.

Your goal is to manage hospital resources and data with clinical precision. 

OUTPUT RULES:
1. ALWAYS return a JSON object.
2. If performing an ACTION, use the 'function' and 'parameters' keys.
3. If providing a RESPONSE or ANSWER, use the 'message' key for the human-readable part and the 'data' key for structured technical info.
4. Maintain a formal, operational tone. Avoid conversational filler.

AVAILABLE TOOLS:
- get_available_beds: {"department": "ICU" or null}
- get_department_status: {"department": "ICU"}
- admit_patient: {"patient_name": str, "age": int, "condition": str, "severity": "low/moderate/critical"}
- update_patient_status: {"patient_id": str, "severity": str, "condition": str}
- transfer_patient: {"patient_id": str, "from_department": str, "to_department": str}
- discharge_patient: {"patient_id": str}
- list_patients: {"severity": "low/moderate/critical" or null, "department": "ICU/GENERAL" or null}
- send_hospital_alert: {"subject": str, "message": str}

EXAMPLES:
User: "Hi"
{"message": "System operational. Awaiting operational parameters.", "data": {"status": "READY", "uptime": "NOMINAL"}}

User: "List all critical patients"
{"function": "list_patients", "parameters": {"severity": "critical"}}

User: "Tell me a joke"
{"message": "Operational protocol prioritizes clinical efficiency. However: Why did the skeleton go to the dance? To have some-body to talk to.", "data": {"type": "humor_override", "status": "executed"}}
"""


def _route(message: str) -> Dict:
    prompt = f"{SYSTEM_PROMPT}\nUser: {message}\nJSON:"
    try:
        out = generate_text(prompt, temperature=0.1) # Lower temperature for technical precision
        cleaned_out = out.strip()
        if "```json" in cleaned_out:
            cleaned_out = cleaned_out.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned_out:
             cleaned_out = cleaned_out.split("```")[1].split("```")[0].strip()
        
        import json
        try:
            return json.loads(cleaned_out)
        except json.JSONDecodeError:
            # Handle concatenated JSON objects (take the first one)
            if "}\n{" in cleaned_out:
                cleaned_out = cleaned_out.split("}\n{")[0] + "}"
                return json.loads(cleaned_out)
            if "}{" in cleaned_out:
                cleaned_out = cleaned_out.split("}{")[0] + "}"
                return json.loads(cleaned_out)
            raise
    except Exception as e:
        return {"message": "Protocol Error: Invalid command structure.", "data": {"error": str(e), "raw_output": out}}

def propose_route(message: str) -> Dict:
    """Classify a request only. Execution is deliberately handled after human approval."""
    return _route(message)


def run_agent(db: Session, message: str) -> str:
    route = _route(message)
    import json
    
    if "function" not in route:
        return json.dumps(route)

    fn = (route.get("function") or "").strip()
    params = route.get("parameters") or {}

    dispatch = {
        "admit_patient": admit_patient,
        "update_patient_status": update_patient_status,
        "transfer_patient": transfer_patient,
        "discharge_patient": discharge_patient,
        "get_available_beds": get_available_beds,
        "get_department_status": get_department_status,
        "send_hospital_alert": send_hospital_alert,
        "list_patients": list_patients,
    }
    
    handler = dispatch.get(fn)
    if not handler:
        return json.dumps({"message": f"Handler Error: Tool '{fn}' not found.", "data": params})

    result = handler(db, params)
    body = result.get("body", result)
    return json.dumps(body)
