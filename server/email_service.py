import smtplib
import os
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"

def load_template(filename: str, **kwargs) -> str:
    """Loads a template file and formats it with provided arguments."""
    template_path = TEMPLATE_DIR / filename
    if not template_path.exists():
        print(f"Template not found: {template_path}")
        return ""
    
    with open(template_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    return content.format(**kwargs)

def get_smtp_transport():
    # Try to get from DB first
    from database import SessionLocal
    from models import SystemSetting
    db = SessionLocal()
    try:
        settings = {s.key: s.value for s in db.query(SystemSetting).all()}
    except Exception as e:
        print(f"Error reading settings: {e}")
        settings = {}
    finally:
        db.close()

    host = settings.get("SMTP_HOST") or os.getenv("SMTP_HOST")
    port = settings.get("SMTP_PORT") or os.getenv("SMTP_PORT")
    user = settings.get("SMTP_USER") or os.getenv("SMTP_USER")
    password = settings.get("SMTP_PASS") or os.getenv("SMTP_PASS")

    if not host or not port or not user or not password:
        print("SMTP settings incomplete")
        return None
    
    return {
        "host": host,
        "port": int(port),
        "user": user,
        "password": password
    }

def send_password_reset_email(to_email: str, username: str, new_password: str):
    transport = get_smtp_transport()
    if not transport:
        print("Skipping email: No SMTP config")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Сброс пароля"
    msg["From"] = f"Messenger <{transport['user']}>"
    msg["To"] = to_email

    # Load templates with context
    context = {"username": username, "new_password": new_password}
    
    # helper to safely load
    try:
        text_content = load_template("password_reset.txt", **context)
        part1 = MIMEText(text_content, "plain")
        msg.attach(part1)
    except Exception as e:
         print(f"Error loading text template: {e}")

    try:
        html_content = load_template("password_reset.html", **context)
        part2 = MIMEText(html_content, "html")
        msg.attach(part2)
    except Exception as e:
         print(f"Error loading html template: {e}")

    try:
        with smtplib.SMTP(transport["host"], transport["port"]) as server:
            server.starttls()
            server.login(transport["user"], transport["password"])
            server.send_message(msg)
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_verification_email(to_email: str, username: str, code: str):
    transport = get_smtp_transport()
    if not transport:
        print("Skipping email: No SMTP config")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Подтверждение смены Email"
    msg["From"] = f"Messenger <{transport['user']}>"
    msg["To"] = to_email

    # Load templates with context
    context = {"username": username, "code": code}

    try:
        text_content = load_template("verification_email.txt", **context)
        part1 = MIMEText(text_content, "plain")
        msg.attach(part1)
    except Exception as e:
        print(f"Error loading text verification template: {e}")
    
    try:
        html_content = load_template("verification_email.html", **context)
        part2 = MIMEText(html_content, "html")
        msg.attach(part2)
    except Exception as e:
        print(f"Error loading html verification template: {e}")

    try:
        with smtplib.SMTP(transport["host"], transport["port"]) as server:
            server.starttls()
            server.login(transport["user"], transport["password"])
            server.send_message(msg)
        print(f"Verification email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return False
