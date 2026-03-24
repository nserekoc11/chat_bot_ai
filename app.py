import os
import random
import sqlite3
from typing import Optional

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()
load_dotenv("api.env")

DB_PATH = os.getenv("CHAT_DB_PATH", "chat_memory.db")
APP_ID = os.getenv("APP_ID")
API_KEY = os.getenv("API_KEY")
SEARCH_ENGINE_ID = os.getenv("SEARCH_ENGINE_ID")

greetings = ["hi", "hello", "hey"]
greeting_responses = [
    "Hello! How can I assist you today?",
    "Hi there! What can I do for you?",
    "Hey! How may I help you today?",
]


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT UNIQUE,
            answer TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT,
            bot_reply TEXT
        )
        """
    )

    conn.commit()
    conn.close()


def correct_text(text: str) -> str:
    try:
        from textblob import TextBlob

        corrected = TextBlob(text).correct()
        return str(corrected)
    except Exception:
        return text


def google_search(query: str) -> Optional[str]:
    if not API_KEY or not SEARCH_ENGINE_ID:
        return None

    try:
        import requests

        url = "https://www.googleapis.com/customsearch/v1"
        params = {"key": API_KEY, "cx": SEARCH_ENGINE_ID, "q": query}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        items = data.get("items") or []
        if not items:
            return None
        snippet = items[0].get("snippet")
        return snippet if isinstance(snippet, str) else None
    except Exception:
        return None


def wolfram_answer(question: str) -> Optional[str]:
    if not APP_ID:
        return None

    try:
        import wolframalpha

        client = wolframalpha.Client(APP_ID)
        res = client.query(question)
        return next(res.results).text
    except Exception:
        return None


def knowledge_answer(question: str) -> Optional[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT answer FROM knowledge WHERE question=?", (question,))
    row = cursor.fetchone()
    conn.close()

    if row and isinstance(row[0], str):
        return row[0]
    return None


def save_conversation(user: str, bot: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO conversations (user_message, bot_reply) VALUES (?,?)",
        (user, bot),
    )

    conn.commit()
    conn.close()


def get_answer(question: str) -> str:
    q = question.lower().strip()

    if any(word == q or f"{word} " in q for word in greetings):
        return random.choice(greeting_responses)

    if "thank" in q or "thanks" in q:
        return "You're welcome!"

    answer = wolfram_answer(question)
    if answer:
        return answer

    answer = google_search(question)
    if answer:
        return answer

    return "I couldn't find an answer yet."


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templete",
        static_folder="templete/static",
        static_url_path="/static",
    )

    init_db()

    @app.after_request
    def add_dev_cors_headers(response):
        # Allow the HTML to be served from a different local dev server (e.g. file:// or Live Server)
        # while still calling this backend. Keep it scoped to /api/*.
        if request.path.startswith("/api/"):
            response.headers.setdefault("Access-Control-Allow-Origin", "*")
            response.headers.setdefault("Access-Control-Allow-Headers", "Content-Type")
            response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        return response

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.post("/api/chat")
    def chat():
        data = request.get_json(silent=True) or {}
        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            return jsonify({"reply": "Send a non-empty message."}), 400

        corrected = correct_text(message.strip())

        response = knowledge_answer(corrected)
        if not response:
            response = get_answer(corrected)

        save_conversation(corrected, response)
        return jsonify({"reply": response})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=True)
