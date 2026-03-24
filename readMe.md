Creating a chat bot that is being intergrated with wolframalpha.

Needs :
Boilerplate
styling
intergration

## Run locally

1. (Optional) Put keys in `api.env`:
   - `APP_ID` (WolframAlpha)
   - `API_KEY` and `SEARCH_ENGINE_ID` (Google Custom Search)
2. Install deps: `.\.venv\Scripts\pip install -r requirement.txt`
3. Start server: `.\.venv\Scripts\python app.py`
4. Open: `http://127.0.0.1:5000/`

If you open `templete/index.html` using VS Code Live Server (or `file://`), the UI will auto-try `http://127.0.0.1:5000/api/chat` (CORS enabled for `/api/*`).
