import os
import sys
from uuid import uuid4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")

import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
username = f"local_{uuid4().hex[:10]}"
client = APIClient()
origin = "http://localhost:5173"

preflight = client.options(
    "/api/v1/auth/register/",
    HTTP_ORIGIN=origin,
    HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
    HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
)
print(
    f"preflight status={preflight.status_code} allow_origin={preflight.headers.get('Access-Control-Allow-Origin')} allow_credentials={preflight.headers.get('Access-Control-Allow-Credentials')}"
)
if preflight.status_code not in (200, 204):
    raise AssertionError(f"preflight status={preflight.status_code}")
assert preflight.headers.get("Access-Control-Allow-Origin") == origin, preflight.headers
assert (
    preflight.headers.get("Access-Control-Allow-Credentials") == "true"
), preflight.headers

signup = client.post(
    "/api/v1/auth/register/",
    {
        "username": username,
        "password": "LocalPass123!",
        "password_confirm": "LocalPass123!",
        "first_name": "Rafi",
        "last_name": "Demo",
        "email": f"{username}@example.test",
    },
    format="json",
    HTTP_ORIGIN=origin,
)
print(f"signup status={signup.status_code}")
if signup.status_code != 201:
    raise AssertionError(
        f"signup status={signup.status_code} body={signup.json() if signup.headers.get('Content-Type','').startswith('application/json') else signup.reason_phrase}"
    )
assert signup.json().get("access"), signup.content
assert signup.json().get("user", {}).get("username") == username, signup.content

signin = client.post(
    "/api/v1/auth/token/",
    {"username": username, "password": "LocalPass123!"},
    format="json",
    HTTP_ORIGIN=origin,
)
print(f"signin status={signin.status_code}")
if signin.status_code != 200:
    raise AssertionError(
        f"signin status={signin.status_code} body={signin.json() if signin.headers.get('Content-Type','').startswith('application/json') else signin.reason_phrase}"
    )
assert signin.json().get("access"), signin.content

client.credentials(HTTP_AUTHORIZATION=f"Bearer {signin.json()['access']}")
me = client.get("/api/v1/auth/me/", HTTP_ORIGIN=origin)
print(f"me status={me.status_code}")
if me.status_code != 200:
    raise AssertionError(
        f"me status={me.status_code} body={me.json() if me.headers.get('Content-Type','').startswith('application/json') else me.reason_phrase}"
    )
assert me.json().get("username") == username, me.content

User.objects.filter(username=username).delete()
print(
    "RESULT: local auth route, CORS preflight, signup, signin, and current-user flow passed"
)
