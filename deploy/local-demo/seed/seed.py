"""Local Demo example data, added through the product's own APIs.

Signs in as the demo user (password grant on the demo-only `demo-seeder`
client of the demo realm) and calls the same endpoints the browser calls,
through the edge, so every validation and ownership rule applies. Nothing is
written to a database directly; the one exception, Past Plans, is in
db/seed/past-plans.sql because the product cannot create a Plan in the past.

Runs once per demo volume (a marker in /state); each step also skips what
already exists, so a re-run after a failure does not duplicate data.
Python standard library only.
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

API = os.environ["API_BASE_URL"].rstrip("/")
MARKER = "/state/seeded"

QUARRY_ROCK = "11111111-1111-1111-1111-111111111111"
DOG_MOUNTAIN = "33333333-3333-3333-3333-333333333333"
GARIBALDI_LAKE = "66666666-6666-6666-6666-666666666666"

# Some recommended categories stay Missing, so Gear Readiness has something to show.
GEAR = [
    ("Trail runners", "FOOTWEAR", "Example item from the Local Demo setup."),
    ("20 L daypack", "BACKPACK", "Example item from the Local Demo setup."),
    ("Rain shell", "RAIN_GEAR", "Example item from the Local Demo setup."),
    ("Headlamp", "HEADLAMP", "Example item from the Local Demo setup."),
]


def request(method, path, token=None, body=None, form=None):
    headers = {"Accept": "application/json"}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(form).encode()
    url = path if path.startswith("http") else API + path
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        return response.status, (json.loads(raw) if raw else None)


def wait_for(description, check, seconds=180):
    deadline = time.time() + seconds
    while True:
        try:
            check()
            return
        except (urllib.error.URLError, ConnectionError, OSError) as error:
            if time.time() > deadline:
                sys.exit(f"seed: {description} not reachable: {error}")
            time.sleep(3)


def sign_in():
    _, body = request("POST", os.environ["TOKEN_URL"], form={
        "grant_type": "password",
        "client_id": os.environ["SEEDER_CLIENT_ID"],
        "client_secret": os.environ["SEEDER_CLIENT_SECRET"],
        "username": os.environ["DEMO_USERNAME"],
        "password": os.environ["DEMO_USER_PASSWORD"],
        "scope": "openid profile email",
    })
    return body["access_token"]


def subject_of(token):
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["sub"]


def seed_gear(token):
    _, items = request("GET", "/api/users/me/gear", token)
    owned = {item["name"] for item in items}
    for name, category, description in GEAR:
        if name not in owned:
            request("POST", "/api/users/me/gear", token,
                    {"name": name, "category": category, "description": description})
            print(f"seed: gear '{name}' ({category})")


def seed_upcoming_plan(token, today):
    trip_date = (today + timedelta(days=7)).isoformat()
    status, _ = request("POST", "/api/plans", token, {"trailId": DOG_MOUNTAIN, "tripDate": trip_date})
    print(f"seed: upcoming plan Dog Mountain {trip_date} ({'new' if status == 201 else 'existing'})")


def seed_memories(token, today):
    _, page = request("GET", "/api/memories?page=0&size=50", token)
    titles = {item["title"] for item in page["items"]}
    memories = [
        {
            # Same trail and date as the first Past Plan in past-plans.sql.
            "trailId": QUARRY_ROCK,
            "tripDate": (today - timedelta(days=10)).isoformat(),
            "title": "Morning at Quarry Rock",
            "story": "Example memory added by the Local Demo setup. "
                     "It is public, so it also appears under Community Memories in Discover.",
            "visibility": "PUBLIC",
        },
        {
            "trailId": GARIBALDI_LAKE,
            "tripDate": (today - timedelta(days=40)).isoformat(),
            "title": "Garibaldi Lake weekend",
            "story": "Example private memory added by the Local Demo setup.",
            "visibility": "PRIVATE",
        },
    ]
    for memory in memories:
        if memory["title"] not in titles:
            request("POST", "/api/memories", token, memory)
            print(f"seed: memory '{memory['title']}' ({memory['visibility']})")


def main():
    if os.path.exists(MARKER):
        print("seed: example data already added on this demo volume; nothing to do")
        return

    wait_for("API", lambda: request("GET", "/api/trails"))
    wait_for("Keycloak", sign_in)
    token = sign_in()
    print(f"seed: signed in as {os.environ['DEMO_USERNAME']} (subject {subject_of(token)})")

    today = date.today()
    try:
        seed_gear(token)
        seed_upcoming_plan(token, today)
        seed_memories(token, today)
    except urllib.error.HTTPError as error:
        sys.exit(f"seed: {error.code} from {error.url}: {error.read().decode(errors='replace')[:500]}")

    with open(MARKER, "w") as marker:
        marker.write(today.isoformat() + "\n")
    print("seed: done")


if __name__ == "__main__":
    main()
