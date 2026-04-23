"""
Управление темами форума и ответами: создание, получение, модерация, email-уведомления.
"""
import json
import os
import smtplib
import psycopg2
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p55563781_forum_crmp_project_2")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def send_email(to: str, subject: str, html: str):
    """Отправляет HTML-письмо через SMTP."""
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")

    if not smtp_host or not smtp_user or not smtp_pass:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"DevForum <{smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to, msg.as_string())


def get_user_by_token(cur, token: str):
    cur.execute(
        f"SELECT u.id, u.display_name, u.avatar_letter, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def format_dt(dt) -> str:
    if dt is None:
        return ""
    now = datetime.now()
    diff = now - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "только что"
    if secs < 3600:
        m = secs // 60
        return f"{m} мин назад"
    if secs < 86400:
        h = secs // 3600
        return f"{h} ч назад"
    d = secs // 86400
    return f"{d} дн назад"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    token = event.get("headers", {}).get("X-Auth-Token", "")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET список тем
        if action == "list" or (method == "GET" and not action):
            category = params.get("category", "")
            status_filter = params.get("status", "")
            limit = min(int(params.get("limit", 50)), 100)
            offset = int(params.get("offset", 0))

            where = []
            args = []
            if category:
                where.append("t.category = %s")
                args.append(category)
            if status_filter:
                where.append("t.status = %s")
                args.append(status_filter)

            where_sql = ("WHERE " + " AND ".join(where)) if where else ""
            args += [limit, offset]

            cur.execute(
                f"""SELECT t.id, t.title, t.content, t.category, t.status, t.views, t.replies_count,
                           t.created_at, u.display_name, u.avatar_letter, u.id as user_id
                    FROM {SCHEMA}.topics t
                    JOIN {SCHEMA}.users u ON u.id = t.user_id
                    {where_sql}
                    ORDER BY t.created_at DESC
                    LIMIT %s OFFSET %s""",
                args
            )
            rows = cur.fetchall()
            topics = [
                {
                    "id": r[0], "title": r[1], "content": r[2], "category": r[3],
                    "status": r[4], "views": r[5], "replies_count": r[6],
                    "date": format_dt(r[7]), "created_at": str(r[7]),
                    "author": r[8], "avatar": r[9], "user_id": r[10]
                }
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"topics": topics})}

        # GET одна тема + ответы
        if action == "get":
            topic_id = int(params.get("id", 0))
            # Инкремент просмотров
            cur.execute(f"UPDATE {SCHEMA}.topics SET views = views + 1 WHERE id = %s", (topic_id,))

            cur.execute(
                f"""SELECT t.id, t.title, t.content, t.category, t.status, t.views, t.replies_count,
                           t.created_at, u.display_name, u.avatar_letter, u.id
                    FROM {SCHEMA}.topics t JOIN {SCHEMA}.users u ON u.id = t.user_id
                    WHERE t.id = %s""",
                (topic_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Тема не найдена"})}

            topic = {
                "id": row[0], "title": row[1], "content": row[2], "category": row[3],
                "status": row[4], "views": row[5] + 1, "replies_count": row[6],
                "date": format_dt(row[7]), "created_at": str(row[7]),
                "author": row[8], "avatar": row[9], "user_id": row[10]
            }

            cur.execute(
                f"""SELECT r.id, r.content, r.created_at, u.display_name, u.avatar_letter, u.id
                    FROM {SCHEMA}.replies r JOIN {SCHEMA}.users u ON u.id = r.user_id
                    WHERE r.topic_id = %s ORDER BY r.created_at ASC""",
                (topic_id,)
            )
            replies = [
                {
                    "id": r[0], "content": r[1], "date": format_dt(r[2]),
                    "author": r[3], "avatar": r[4], "user_id": r[5]
                }
                for r in cur.fetchall()
            ]
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"topic": topic, "replies": replies})}

        # POST создать тему
        if action == "create":
            if not token:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

            title = body.get("title", "").strip()
            content = body.get("content", "").strip()
            category = body.get("category", "").strip()

            if not title or not content or not category:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}
            if len(title) < 5:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заголовок слишком короткий"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.topics (user_id, title, content, category) VALUES (%s, %s, %s, %s) RETURNING id, status, created_at",
                (user[0], title, content, category)
            )
            row = cur.fetchone()
            cur.execute(f"UPDATE {SCHEMA}.users SET posts_count = posts_count + 1 WHERE id = %s", (user[0],))
            conn.commit()

            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "topic": {
                        "id": row[0], "title": title, "content": content, "category": category,
                        "status": row[1], "views": 0, "replies_count": 0,
                        "date": "только что", "created_at": str(row[2]),
                        "author": user[1], "avatar": user[2], "user_id": user[0]
                    }
                })
            }

        # POST ответить на тему
        if action == "reply":
            if not token:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

            topic_id = int(body.get("topic_id", 0))
            content = body.get("content", "").strip()

            if not content:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Ответ не может быть пустым"})}
            if len(content) < 3:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Ответ слишком короткий"})}

            cur.execute(f"SELECT id, status FROM {SCHEMA}.topics WHERE id = %s", (topic_id,))
            topic = cur.fetchone()
            if not topic:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Тема не найдена"})}
            if topic[1] != "approved":
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Тема на модерации"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.replies (topic_id, user_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
                (topic_id, user[0], content)
            )
            row = cur.fetchone()
            cur.execute(f"UPDATE {SCHEMA}.topics SET replies_count = replies_count + 1, updated_at = NOW() WHERE id = %s", (topic_id,))
            conn.commit()

            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "reply": {
                        "id": row[0], "content": content, "date": "только что",
                        "author": user[1], "avatar": user[2], "user_id": user[0]
                    }
                })
            }

        # PUT изменить статус темы (модерация)
        if action == "set-status":
            if not token:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
            user = get_user_by_token(cur, token)
            if not user or user[3] not in ("admin", "moderator"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет прав"})}

            topic_id = int(body.get("topic_id", 0))
            new_status = body.get("status", "")
            if new_status not in ("pending", "approved", "rejected"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный статус"})}

            # Получаем данные темы и автора для письма
            cur.execute(
                f"""SELECT t.title, t.category, u.email, u.display_name
                    FROM {SCHEMA}.topics t JOIN {SCHEMA}.users u ON u.id = t.user_id
                    WHERE t.id = %s""",
                (topic_id,)
            )
            topic_row = cur.fetchone()

            cur.execute(f"UPDATE {SCHEMA}.topics SET status = %s WHERE id = %s", (new_status, topic_id))
            conn.commit()

            # Отправляем письмо автору при одобрении или отклонении
            if topic_row and new_status in ("approved", "rejected"):
                title, category, author_email, author_name = topic_row
                if new_status == "approved":
                    subject = f"✅ Ваша тема одобрена — DevForum"
                    html = f"""
                    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d0f1a;color:#e0e0e0;border-radius:16px;overflow:hidden;">
                      <div style="background:linear-gradient(135deg,#00ff9d20,#a855f720);padding:32px 32px 24px;border-bottom:1px solid #00ff9d30;">
                        <div style="font-size:28px;font-weight:700;color:#00ff9d;letter-spacing:2px;">⚡ DEVFORUM</div>
                      </div>
                      <div style="padding:32px;">
                        <h2 style="margin:0 0 12px;color:#fff;font-size:20px;">Привет, {author_name}!</h2>
                        <p style="color:#9ca3af;margin:0 0 20px;">Твоя тема прошла модерацию и теперь видна всем участникам форума.</p>
                        <div style="background:#00ff9d15;border:1px solid #00ff9d30;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                          <div style="font-size:12px;color:#00ff9d;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">✅ Одобрена</div>
                          <div style="color:#fff;font-size:16px;font-weight:600;">{title}</div>
                          <div style="color:#6b7280;font-size:13px;margin-top:4px;">Категория: {category}</div>
                        </div>
                        <p style="color:#9ca3af;font-size:14px;">Участники уже могут читать и отвечать на твою тему. Следи за ответами в личном кабинете.</p>
                      </div>
                      <div style="padding:16px 32px;background:#ffffff08;text-align:center;">
                        <p style="color:#4b5563;font-size:12px;margin:0;">DevForum — сообщество разработчиков</p>
                      </div>
                    </div>
                    """
                else:
                    subject = f"❌ Тема не прошла модерацию — DevForum"
                    html = f"""
                    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d0f1a;color:#e0e0e0;border-radius:16px;overflow:hidden;">
                      <div style="background:linear-gradient(135deg,#ff2d7820,#a855f720);padding:32px 32px 24px;border-bottom:1px solid #ff2d7830;">
                        <div style="font-size:28px;font-weight:700;color:#ff2d78;letter-spacing:2px;">⚡ DEVFORUM</div>
                      </div>
                      <div style="padding:32px;">
                        <h2 style="margin:0 0 12px;color:#fff;font-size:20px;">Привет, {author_name}!</h2>
                        <p style="color:#9ca3af;margin:0 0 20px;">К сожалению, твоя тема не прошла модерацию и не будет опубликована.</p>
                        <div style="background:#ff2d7815;border:1px solid #ff2d7830;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                          <div style="font-size:12px;color:#ff2d78;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">❌ Отклонена</div>
                          <div style="color:#fff;font-size:16px;font-weight:600;">{title}</div>
                        </div>
                        <p style="color:#9ca3af;font-size:14px;">Проверь, соответствует ли тема правилам форума, и попробуй создать новую.</p>
                      </div>
                      <div style="padding:16px 32px;background:#ffffff08;text-align:center;">
                        <p style="color:#4b5563;font-size:12px;margin:0;">DevForum — сообщество разработчиков</p>
                      </div>
                    </div>
                    """
                try:
                    send_email(author_email, subject, html)
                except Exception:
                    pass  # Не ломаем API если письмо не дошло

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()