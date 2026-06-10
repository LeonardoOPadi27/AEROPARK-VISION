# Backend local setup (reproducible)

This project uses pinned dependencies in `requirements.txt` so all developers run the same versions.

## 1) Create and activate virtual environment

On Windows (PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
```

## 2) Install dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3) Run API

```powershell
uvicorn app.main:app --reload
```

For mobile development on the same Wi-Fi network, run the API listening on all
interfaces:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then use your computer LAN IP from the mobile app, for example:

```txt
http://192.168.1.50:8000
```

Do not use `127.0.0.1` from a phone, because that points to the phone itself.

## 4) If bcrypt/passlib error appears

Run this once inside the activated venv:

```powershell
pip uninstall -y bcrypt py-bcrypt
pip install --upgrade --force-reinstall bcrypt==4.0.1 passlib==1.7.4 cffi==1.17.1
```

## 5) Team workflow recommendation

- Do not install backend packages globally.
- Always use the project `.venv`.
- If dependencies change, update `requirements.txt` and commit it in the same PR.
- Before pushing, verify backend boots with:

```powershell
uvicorn app.main:app --reload
```

## 6) Useful endpoints for mobile

```txt
GET /health
POST /auth/login
POST /images/upload
GET /images
GET /images/latest
GET /analysis
GET /analysis/latest
GET /analysis/yolo-status
GET /parking-spaces/latest
GET /vehicle-colors/latest
GET /vehicle-colors/summary
```

Image URLs returned as `/uploads/...` should be rendered by prefixing the API
base URL, for example:

```txt
http://192.168.1.50:8000/uploads/image.jpg
```
