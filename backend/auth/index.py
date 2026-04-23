"""
Регистрация, вход и выход пользователей форума.
"""
import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p55563781_forum_crmp_project_2")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # POST /register
    if path.endswith("/register") or action == "register":
        username = body.get("username", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        display_name = body.get("display_name", username).strip()

        if not username or not email or not password:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}
        if len(password) < 6:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль минимум 6 символов"})}

        avatar_letter = (display_name or username)[0].upper()
        pw_hash = hash_password(password)

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (username, email, password_hash, display_name, avatar_letter) VALUES (%s, %s, %s, %s, %s) RETURNING id, username, display_name, role, avatar_letter, bio, posts_count, created_at",
                (username, email, pw_hash, display_name, avatar_letter)
            )
            user = cur.fetchone()
            token = make_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user[0], token, expires)
            )
            conn.commit()
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "token": token,
                    "user": {
                        "id": user[0], "username": user[1], "display_name": user[2],
                        "role": user[3], "avatar_letter": user[4], "bio": user[5],
                        "posts_count": user[6], "created_at": str(user[7])
                    }
                })
            }
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Имя пользователя или email уже заняты"})}
        finally:
            cur.close()
            conn.close()

    # POST /login
    if path.endswith("/login") or action == "login":
        login = body.get("login", "").strip().lower()
        password = body.get("password", "")

        if not login or not password:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        pw_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"SELECT id, username, display_name, role, avatar_letter, bio, posts_count, created_at FROM {SCHEMA}.users WHERE (lower(username)=%s OR lower(email)=%s) AND password_hash=%s",
                (login, login, pw_hash)
            )
            user = cur.fetchone()
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный логин или пароль"})}
            if user[3] == "banned":
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Аккаунт заблокирован"})}

            token = make_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user[0], token, expires)
            )
            conn.commit()
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "token": token,
                    "user": {
                        "id": user[0], "username": user[1], "display_name": user[2],
                        "role": user[3], "avatar_letter": user[4], "bio": user[5],
                        "posts_count": user[6], "created_at": str(user[7])
                    }
                })
            }
        finally:
            cur.close()
            conn.close()

    # GET /me  — получить текущего пользователя по токену
    if path.endswith("/me") or action == "me":
        token = event.get("headers", {}).get("X-Auth-Token", "")
        if not token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"SELECT u.id, u.username, u.display_name, u.role, u.avatar_letter, u.bio, u.posts_count, u.created_at FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token=%s AND s.expires_at > NOW()",
                (token,)
            )
            user = cur.fetchone()
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "user": {
                        "id": user[0], "username": user[1], "display_name": user[2],
                        "role": user[3], "avatar_letter": user[4], "bio": user[5],
                        "posts_count": user[6], "created_at": str(user[7])
                    }
                })
            }
        finally:
            cur.close()
            conn.close()

    # POST /update-profile
    if path.endswith("/update-profile") or action == "update-profile":
        token = event.get("headers", {}).get("X-Auth-Token", "")
        if not token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        display_name = body.get("display_name", "").strip()
        bio = body.get("bio", "").strip()

        if not display_name:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Имя не может быть пустым"})}

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

            user_id = row[0]
            avatar_letter = display_name[0].upper()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET display_name=%s, bio=%s, avatar_letter=%s, updated_at=NOW() WHERE id=%s RETURNING id, username, display_name, role, avatar_letter, bio, posts_count, created_at",
                (display_name, bio, avatar_letter, user_id)
            )
            user = cur.fetchone()
            conn.commit()
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "user": {
                        "id": user[0], "username": user[1], "display_name": user[2],
                        "role": user[3], "avatar_letter": user[4], "bio": user[5],
                        "posts_count": user[6], "created_at": str(user[7])
                    }
                })
            }
        finally:
            cur.close()
            conn.close()

    # POST /logout
    if path.endswith("/logout") or action == "logout":
        token = event.get("headers", {}).get("X-Auth-Token", "")
        if token:
            conn = get_conn()
            cur = conn.cursor()
            try:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
                conn.commit()
            finally:
                cur.close()
                conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}