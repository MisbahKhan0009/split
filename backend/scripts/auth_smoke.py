import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")

import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
User.objects.filter(username="auth_smoke").delete()
client = APIClient()
register = client.post(
    "/api/v1/auth/register/",
    {
        "username": "auth_smoke",
        "password": "safe-password-123",
        "password_confirm": "safe-password-123",
        "first_name": "Rafi",
        "last_name": "Ahmed",
        "email": "rafi@example.com",
    },
    format="json",
)
print("register_status", register.status_code)
print("register_body", register.data)
login = client.post(
    "/api/v1/auth/token/",
    {"username": "auth_smoke", "password": "safe-password-123"},
    format="json",
)
print("login_status", login.status_code)
print(
    "has_access_token",
    bool(login.data.get("access")) if hasattr(login, "data") else False,
)
if login.status_code == 200:
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    me = client.get("/api/v1/auth/me/")
    print("me_status", me.status_code)
    print("me_display_name", me.data.get("display_name"))
assert register.status_code == 201, register.data
assert login.status_code == 200, login.data
assert me.status_code == 200, me.data
print("RESULT: signup, signin, and current-user flow passed")
