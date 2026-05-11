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
