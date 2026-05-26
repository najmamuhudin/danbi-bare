# CrimeWatch.AI - Crime Detection System

CrimeWatch.AI waa web application loogu talagalay in lagu falanqeeyo qoraal, URL, file, ama batch text si loo ogaado content crime-related ah. System-ku wuxuu isku xiraa React frontend, Express backend, Flask AI model API, MongoDB storage, Socket.io live notifications, iyo emergency alert integrations.

## Features

- Text, URL, file, iyo batch crime analysis
- Somali iyo English text support
- Trained ML model API that only returns predictions from the loaded model artifacts
- User authentication iyo role-based access control
- Admin Panel:
  - Manage users
  - Delete reports
  - View analytics
  - Export reports as PDF, CSV, Excel
  - Monitor system logs
- Dashboard analytics iyo prediction history
- Live notifications using Socket.io
- Emergency Alert System:
  - Bomb threat
  - Terror keywords
  - Kidnapping emergency
  - Suicide threat
  - Sends live notification
  - Sends SMS through Twilio if configured
  - Sends email through Nodemailer/SMTP if configured
  - Highlights red emergency alerts in the UI
- Dark/Light mode
- Responsive modern UI

## Tech Stack

Frontend:
- React
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- Socket.io Client
- jsPDF
- xlsx
- Framer Motion
- Lucide React icons

Backend:
- Node.js
- Express
- MongoDB/Mongoose
- JWT authentication
- Socket.io
- Twilio
- Nodemailer
- Multer
- Helmet, CORS, Morgan

AI Model API:
- Python
- Flask
- scikit-learn
- TF-IDF vectorizer
- Logistic Regression classifier
- Crime probability threshold, default 70%, to reduce low-confidence false positives
- BeautifulSoup URL scraping
- Joblib model artifacts

## Project Structure

```text
crime-detection-system/
  ai-model/
    app.py
    train_model.py
    model.pkl
    vectorizer.pkl
    requirements.txt
  backend/
    index.js
    routes/
    models/
    services/
    middleware/
    config/
    .env.example
  frontend/
    src/
    package.json
  model/
    model sax.ipynb
    lastdata.csv
```

## Requirements

- Node.js and npm
- Python 3.10 or newer
- MongoDB connection string
- Optional: Twilio account for SMS alerts
- Optional: SMTP account for email alerts

## Environment Setup

Create `backend/.env` from `backend/.env.example`.

```powershell
cd backend
Copy-Item .env.example .env
```

Then update the values inside `backend/.env`.

Required:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=4000
PYTHON_API_URL=http://localhost:5000
```

Emergency Alert System, optional but recommended:

```env
EMERGENCY_ALERTS_ENABLED=true
EMERGENCY_ALERT_SMS_ENABLED=true
EMERGENCY_ALERT_EMAIL_ENABLED=true
EMERGENCY_ALERT_PHONES=+15551234567,+15557654321
EMERGENCY_ALERT_EMAILS=security@example.com,admin@example.com
```

Twilio SMS:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+15550001111
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_STATUS_CALLBACK_URL=https://your-domain.example.com/api/twilio/status
TWILIO_VALIDATE_WEBHOOKS=true
# TWILIO_WEBHOOK_BASE_URL=https://your-domain.example.com
```

For local delivery tracking, expose the backend with a public HTTPS tunnel, for example `ngrok http 4000`, then set `TWILIO_STATUS_CALLBACK_URL` to the tunnel URL plus `/api/twilio/status`. If the app is behind a tunnel, proxy, or load balancer, set `TWILIO_WEBHOOK_BASE_URL` to that same public origin so Twilio webhook signature validation uses the correct URL.

Nodemailer SMTP:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp_user
SMTP_PASS=smtp_password
SMTP_FROM="CrimeWatch Alerts <alerts@example.com>"
```

Important: do not commit real `.env` secrets to source control.

## Installation

Install backend dependencies:

```powershell
cd backend
npm install
```

Install frontend dependencies:

```powershell
cd frontend
npm install
```

Install AI model dependencies:

```powershell
cd ai-model
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Running The System

Run the AI model API:

```powershell
cd ai-model
python app.py
```

Default URL:

```text
http://localhost:5000
```

Run the backend API:

```powershell
cd backend
npm start
```

Default URL:

```text
http://localhost:4000
```

Run the frontend:

```powershell
cd frontend
npm run dev
```

Default URL:

```text
http://localhost:5173
```

## Training The Model

The training notebook is:

```text
model/model sax.ipynb
```

The backend also includes a training script command:

```powershell
cd backend
npm run train:model
```

Model artifacts are expected in:

```text
ai-model/model.pkl
ai-model/vectorizer.pkl
```

The training script reads the cleaned dataset from:

```text
model/lastdata.csv
```

If artifacts are missing or incompatible, the Flask API returns a model-unavailable error instead of making a rule-based prediction.

## Main API Endpoints

Backend health:

```http
GET /health
```

Auth:

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/roles
GET  /api/auth/users
PATCH /api/auth/users/:id/role
DELETE /api/auth/users/:id
```

Analysis:

```http
POST /api/analyze/text
POST /api/analyze/url
POST /api/analyze/file
POST /api/analyze/batch
GET  /api/analyze/history
GET  /api/analyze/stats
GET  /api/analyze/model/info
GET  /api/analyze/:id
```

Admin reports and logs:

```http
GET    /api/analyze/crime-reports
GET    /api/analyze/crime-reports/export
DELETE /api/analyze/crime-reports/:id
GET    /api/analyze/logs
```

Twilio delivery tracking:

```http
POST /api/twilio/status
```

Twilio posts message status transitions such as `queued`, `sent`, `delivered`, `undelivered`, and `failed` to this endpoint. The backend validates Twilio signatures by default and stores each delivery update in system logs under `twilio.message.status`.

AI model API:

```http
GET  /health
GET  /api/model/info
POST /api/classify/text
POST /api/classify/url
POST /api/classify/file
POST /api/classify/batch
```

## Roles

The system supports role-based access. Typical roles include:

- Admin
- Analyst
- Police/Investigator
- Normal User

Admin users can manage users, delete reports, export reports, view analytics, and monitor logs.

## Emergency Alert Workflow

When a prediction contains emergency keywords, the backend:

1. Detects emergency categories from input text, processed text, scraped content, or file/batch segments.
2. Stores emergency metadata with the prediction and crime report.
3. Emits a Socket.io `emergency_alert` notification to dashboard roles.
4. Sends SMS using Twilio if phone recipients and Twilio credentials are configured.
5. Sends email using Nodemailer if SMTP settings are configured.
6. Writes an `emergency_alert.detected` system log.
7. Shows red emergency UI highlights in analysis results, history, dashboard, and admin reports.

If SMS or email credentials are missing, the system skips that channel safely and still keeps live notifications and logs working.

## Testing And Verification

Frontend lint:

```powershell
cd frontend
npm run lint
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend syntax check example:

```powershell
cd backend
node --check services/emergencyAlerts.js
```

Emergency detection smoke test:

```powershell
cd backend
node -e "const { detectPredictionEmergency } = require('./services/emergencyAlerts'); const alert = detectPredictionEmergency({ inputText: 'Urgent bomb threat reported near the station.' }); console.log(alert.detected, alert.matchedKeywords);"
```

## Troubleshooting

Backend cannot connect to model API:
- Make sure `ai-model/app.py` is running on `http://localhost:5000`.
- Check `PYTHON_API_URL` in `backend/.env`.

MongoDB errors:
- Verify `MONGODB_URI`.
- Check network access and database user permissions.

No live notifications:
- Make sure backend is running.
- Make sure frontend `VITE_API_URL` points to the backend if you changed ports.
- Login is required because Socket.io uses the auth token.

SMS alerts not sending:
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and sender settings.
- Verify recipient phone numbers are E.164 format, for example `+15551234567`.
- For production SMS in some regions, Twilio compliance registration may be required.

Email alerts not sending:
- Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- Check whether your SMTP provider requires app passwords or verified senders.

Large frontend build warning:
- The frontend may warn about large chunks because `jsPDF` and `xlsx` are heavy export libraries.
- The build can still succeed. Code splitting can be added later if needed.

## Security Notes

- Keep real secrets only in `.env`.
- Do not commit `backend/.env`.
- Use strong JWT secrets in production if a separate JWT secret setting is added.
- Restrict MongoDB access by IP and credentials.
- Emergency alert recipients should be controlled by trusted administrators.
- SMS and email alerts should be tested with safe test messages before production use.

## License

This project is currently marked as ISC in `backend/package.json`. Update the license section if the project owner chooses a different license.
