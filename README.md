# CareFlow Twin

**AI-assisted hospital surge and capacity simulator.** CareFlow Twin helps operations teams model incoming demand, monitor bed capacity, and review AI-generated operational proposals before any action is taken.

> CareFlow Twin is a software engineering demonstration for operational planning. It is not a medical device, does not diagnose patients, and must never replace clinical judgement or local escalation policy.

## What changed

The original bed-management demo has been redesigned into a hospital surge command centre:

- **Surge Command Twin:** model a 1–168 hour event with critical, moderate, and low-acuity arrivals.
- **Capacity forecast:** see projected ICU and general-ward availability and clear risk states (`stable`, `watch`, `critical`, `exhausted`).
- **Scenario history:** save and compare operational planning runs.
- **Governed AI:** natural-language requests create reviewable proposals. An authorised clinician must approve an action before the API executes it.
- **Operational safety:** no silent cross-unit fallback when the appropriate bed type is unavailable; a capacity escalation is created instead.
- **Role controls:** administrative setup and user management require `admin`; patient-changing and AI approval actions require `admin` or `doctor`.
- **Configurable deployment:** secrets come from environment variables; the API does not block startup to download a model.

## Architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web app | React 18, Tailwind, Framer Motion | Command dashboard and surge-simulation UI |
| API | FastAPI, Pydantic | Authorisation, planning APIs, audit-friendly proposals |
| Data | PostgreSQL, SQLAlchemy | Patients, resources, alerts, action proposals, scenarios |
| AI | Ollama-compatible model endpoint | Routes natural-language requests into structured proposals |
| Deployment | Docker Compose, Nginx | Local multi-service launch |

## Core flows

```text
Natural-language request → AI proposal → clinician review → approve/reject → audited operation
Incoming-demand scenario → capacity model → risk state + planning recommendations
```

## Quick start

1. Copy the environment template and set strong values.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start the stack.

   ```bash
   docker-compose up --build
   ```

3. Seed the system using the configured bootstrap administrator, then open `http://localhost:3001`.

The frontend calls `http://localhost:8001` by default. Set `REACT_APP_API_BASE_URL` at build time to use another API location.

## Main API endpoints

| Endpoint | Purpose | Minimum role |
| --- | --- | --- |
| `POST /surge/forecast` | Project ICU and general capacity | authenticated user |
| `POST /surge/scenarios` | Create a saved surge scenario | doctor/admin |
| `GET /surge/scenarios` | View recent scenarios | authenticated user |
| `POST /agent/propose` | Create an AI operational proposal | doctor/admin |
| `POST /agent/proposals/{id}/decision` | Approve or reject a proposal | doctor/admin |
| `POST /admit_patient` | Admit with the appropriate bed type | doctor/admin |
| `POST /users` | Create a staff user | admin |

## Development checks

```bash
pip install -r requirements-dev.txt
pytest -q
cd frontend && npm run build
```

## Deliberate boundaries

- Forecasts are transparent arithmetic planning estimates, not patient-outcome predictions.
- AI is not allowed to execute actions directly.
- The prototype’s local model may be unavailable; read-only capacity and scenario features still work.
- For production, add Alembic migrations, SSO/MFA, immutable audit storage, monitoring, encrypted backups, event streaming, and a formal clinical safety review.
