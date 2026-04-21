# MongoDB FastAPI Workshop

This project contains:

- A FastAPI backend (`app.py`) connected to MongoDB Atlas
- A React frontend (`frontend/`) for managing student records

## 1) Backend setup (FastAPI + Atlas)

Create and activate a virtual environment, then install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your Atlas connection string:

```bash
MONGO_URL=mongodb+srv://<username>:<password>@<cluster-url>/<db>?retryWrites=true&w=majority
```

Run the API:

```bash
uvicorn app:app --reload
```

Open API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## 2) Frontend setup (React + Vite)

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173) and calls the backend at `VITE_API_BASE_URL`.

## 3) Quick testing

With backend running:

```bash
pytest test_api.py
```
