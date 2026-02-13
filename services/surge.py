"""Pure capacity calculations used by the CareFlow Twin API and tests."""
from dataclasses import dataclass, asdict

@dataclass
class Capacity:
    total: int
    occupied: int

    @property
    def available(self):
        return max(self.total - self.occupied, 0)

    @property
    def occupancy_rate(self):
        return round((self.occupied / self.total * 100) if self.total else 0, 1)

def risk_label(capacity: Capacity) -> str:
    if capacity.available <= 0:
        return "exhausted"
    if capacity.available <= max(2, capacity.total * 0.1):
        return "critical"
    if capacity.available <= capacity.total * 0.25:
        return "watch"
    return "stable"

def forecast(icu: Capacity, general: Capacity, hours: int = 24, hourly_critical: float = 0.0,
             hourly_moderate: float = 0.0) -> dict:
    hours = max(1, min(int(hours), 168))
    projected_icu = round(icu.occupied + hourly_critical * hours)
    projected_general = round(general.occupied + hourly_moderate * hours)
    future_icu = Capacity(icu.total, projected_icu)
    future_general = Capacity(general.total, projected_general)
    return {
        "horizon_hours": hours,
        "icu": {**asdict(future_icu), "available": future_icu.available,
                "occupancy_rate": future_icu.occupancy_rate, "risk": risk_label(future_icu)},
        "general": {**asdict(future_general), "available": future_general.available,
                    "occupancy_rate": future_general.occupancy_rate, "risk": risk_label(future_general)},
        "assumptions": {"hourly_critical_arrivals": hourly_critical,
                        "hourly_moderate_arrivals": hourly_moderate,
                        "note": "Planning estimate only; it does not provide clinical advice."},
    }

def simulate(icu: Capacity, general: Capacity, critical: int, moderate: int, low: int, hours: int) -> dict:
    projected_icu = Capacity(icu.total, icu.occupied + max(0, critical))
    projected_general = Capacity(general.total, general.occupied + max(0, moderate) + max(0, low))
    return {
        "horizon_hours": hours,
        "incoming": {"critical": critical, "moderate": moderate, "low": low},
        "icu": {**asdict(projected_icu), "available": projected_icu.available,
                "occupancy_rate": projected_icu.occupancy_rate, "risk": risk_label(projected_icu)},
        "general": {**asdict(projected_general), "available": projected_general.available,
                    "occupancy_rate": projected_general.occupancy_rate, "risk": risk_label(projected_general)},
        "recommendations": [
            "Activate escalation capacity and contact regional partners." if projected_icu.available <= 0 else "Maintain ICU surge roster.",
            "Open a flex ward before general capacity is exhausted." if projected_general.available <= 0 else "Review discharge and transfer readiness every shift.",
        ],
        "disclaimer": "Scenario output supports operational planning and requires human review.",
    }
