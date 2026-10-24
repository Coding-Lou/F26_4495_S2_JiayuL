"""Local Demo stand-in for external providers. Not part of any application image.

recommendation-service talks to this container exactly as it talks to the real
providers; only its environment points here:

  OPENAI_BASE_URL=http://external-mocks:8090/v1   (read by the OpenAI SDK)
      POST /v1/responses   Responses API, structured output for intent
                           extraction. A keyword reader following the rules of
                           IntentPromptBuilder: no model, no network, no key.

  WEATHER_BASE_URL=http://external-mocks:8090     (opt-in, for offline demos)
      GET /v1/forecast     Open-Meteo daily forecast shape with deterministic
                           sample values per place and date. The demo uses the
                           real Open-Meteo unless this is chosen in .env.demo.

Python standard library only.
"""

import hashlib
import json
import re
import time
import uuid
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = 8090

# --------------------------------------------------------------------------
# Intent extraction (IntentExtractionOutput: every key present, null if unknown)
# --------------------------------------------------------------------------

INTENT_KEYS = (
    "difficulty",
    "maxDistanceKm",
    "maxElevationGainM",
    "durationMin",
    "durationMode",
    "preferredScenery",
    "openPreferences",
    "generallyFlexible",
)

NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12,
}
NUM = r"\b(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)"
HOURS = r"(?:hours?|hrs?|h)\b"
MINUTES = r"(?:minutes?|mins?)\b"

DIFFICULTY = (
    ("EASY", r"\b(easy|easier|beginner|gentle|relaxed|leisurely|casual)\b"),
    ("MODERATE", r"\b(moderate|medium|intermediate)\b"),
    ("HARD", r"\b(hard|harder|difficult|challenging|strenuous|tough)\b"),
)

SCENERY = (
    ("LAKE", r"\blakes?\b"),
    ("VIEWPOINT", r"\b(views?|viewpoints?|vista|panoram\w*|lookout|overlook)\b"),
    ("WATERFALL", r"\b(waterfalls?|falls|cascades?)\b"),
    ("FOREST", r"\b(forests?|woods|woodland|trees|rainforest)\b"),
    ("MOUNTAIN", r"\b(mountains?|peaks?|summits?|alpine|ridge)\b"),
    ("OCEAN", r"\b(ocean|sea|beach|coast\w*|seaside)\b"),
)

NO_PREFERENCE = re.compile(
    r"\b(any|anything|no preference|doesn'?t matter|does not matter|whatever|"
    r"i'?m flexible|i am flexible|either is fine|don'?t mind|do not mind|"
    r"don'?t care|surprise me|anything works)\b"
)

DIMENSION_WORDS = (
    ("DIFFICULTY", r"\b(difficulty|difficult|level|hard|easy)\b"),
    ("TRIP_LENGTH", r"\b(length|long|duration|distance|time|hours?|km)\b"),
    ("SCENERY", r"\b(scenery|scenic|views?)\b"),
)

MAXIMUM_BEFORE = re.compile(
    r"(up to|no more than|at most|maximum|max|under|less than|no longer than|within)\s*$"
)
MINIMUM_BEFORE = re.compile(r"(at least|more than|over|minimum|min)\s*$")
MINIMUM_AFTER = re.compile(r"^\s*(or longer|or more|plus|\+)")


def number(token):
    return NUMBER_WORDS.get(token, None) if not token[0].isdigit() else float(token)


def read_duration(text):
    """(minutes, mode) or (None, None), following the prompt's duration rules."""
    rng = re.search(rf"{NUM}\s*(?:-|–|to)\s*{NUM}\s*{HOURS}", text)
    if rng:
        low, high = number(rng.group(1)), number(rng.group(2))
        return round((low + high) / 2 * 60), "APPROXIMATE"

    one = re.search(rf"{NUM}(\s+and\s+a\s+half)?\s*-?\s*({HOURS}|{MINUTES})", text)
    if one:
        value = number(one.group(1))
        minutes = value * 60 if re.match(HOURS, one.group(3)) else value
        if one.group(2):
            minutes += 30
        before, after = text[: one.start()], text[one.end():]
        if MAXIMUM_BEFORE.search(before):
            return round(minutes), "MAXIMUM"
        if MINIMUM_BEFORE.search(before) or MINIMUM_AFTER.search(after):
            return round(minutes), "MINIMUM"
        return round(minutes), "APPROXIMATE"

    for pattern, minutes in (
        (r"\bhalf[- ]?(a[- ])?day\b", 240),
        (r"\b(full[- ]?day|all day|whole day)\b", 450),
        (r"\bcouple of hours\b", 120),
        (r"\bfew hours\b", 180),
    ):
        if re.search(pattern, text):
            return minutes, "APPROXIMATE"
    return None, None


def extract_intent(message, pending):
    text = message.lower()
    out = dict.fromkeys(INTENT_KEYS)

    found = [(m.start(), level) for level, p in DIFFICULTY for m in [re.search(p, text)] if m]
    if found:
        out["difficulty"] = min(found)[1]

    out["durationMin"], out["durationMode"] = read_duration(text)

    distance = re.search(r"(\d+(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?)\b", text)
    if distance:
        out["maxDistanceKm"] = float(distance.group(1))

    elevation = re.search(r"(\d{2,5})\s*(?:m|meters|metres)\b", text)
    if elevation:
        out["maxElevationGainM"] = int(elevation.group(1))

    scenery = sorted((m.start(), kind) for kind, p in SCENERY for m in [re.search(p, text)] if m)
    if scenery:
        out["preferredScenery"] = [kind for _, kind in scenery]

    if NO_PREFERENCE.search(text):
        has_value = {
            "DIFFICULTY": out["difficulty"] is not None,
            "TRIP_LENGTH": any(out[k] is not None for k in ("durationMin", "maxDistanceKm", "maxElevationGainM")),
            "SCENERY": out["preferredScenery"] is not None,
        }
        named = [d for d, p in DIMENSION_WORDS if re.search(p, text) and not has_value[d]]
        if named:
            out["openPreferences"] = named
        elif pending and not has_value[pending] and len(text.split()) <= 6:
            out["openPreferences"] = [pending]
        else:
            out["generallyFlexible"] = True

    return out


def parse_prompt(prompt):
    """The user message inside <user_message> and the pending question, if any."""
    message = re.search(r"<user_message>\s*(.*?)\s*</user_message>", prompt, re.S)
    pending = re.search(r"pending question asked about (DIFFICULTY|TRIP_LENGTH|SCENERY)", prompt)
    return (message.group(1) if message else prompt), (pending.group(1) if pending else None)


def prompt_text(value):
    """Responses API `input`: a string, or a list of message items."""
    if isinstance(value, str):
        return value
    parts = []
    for item in value or []:
        content = item.get("content") if isinstance(item, dict) else None
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            parts.extend(c.get("text", "") for c in content if isinstance(c, dict))
    return "\n".join(parts)


def responses_reply(request):
    message, pending = parse_prompt(prompt_text(request.get("input")))
    intent = extract_intent(message, pending)
    print("responses: pending=%s intent=%s" % (pending, json.dumps(intent)), flush=True)
    return {
        "id": "resp_mock_" + uuid.uuid4().hex,
        "object": "response",
        "created_at": int(time.time()),
        "status": "completed",
        "error": None,
        "incomplete_details": None,
        "instructions": request.get("instructions"),
        "metadata": {},
        "model": request.get("model", "local-mock"),
        "output": [
            {
                "type": "message",
                "id": "msg_mock_" + uuid.uuid4().hex,
                "status": "completed",
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": json.dumps(intent),
                        "annotations": [],
                        "logprobs": [],
                    }
                ],
            }
        ],
        "parallel_tool_calls": True,
        "temperature": 1.0,
        "tool_choice": "auto",
        "tools": [],
        "top_p": 1.0,
        "text": request.get("text", {"format": {"type": "text"}}),
        "usage": {
            "input_tokens": 0,
            "input_tokens_details": {"cached_tokens": 0},
            "output_tokens": 0,
            "output_tokens_details": {"reasoning_tokens": 0},
            "total_tokens": 0,
        },
    }


# --------------------------------------------------------------------------
# Weather (Open-Meteo /v1/forecast, daily fields used by WeatherServiceClient)
# --------------------------------------------------------------------------

def forecast_reply(query):
    latitude = float(query["latitude"][0])
    longitude = float(query["longitude"][0])
    start = date.fromisoformat(query["start_date"][0])
    end = date.fromisoformat(query.get("end_date", query["start_date"])[0])

    daily = {k: [] for k in ("time", "temperature_2m_max", "temperature_2m_min",
                             "precipitation_probability_max", "wind_speed_10m_max")}
    day = start
    while day <= end:
        seed = hashlib.sha256(f"{latitude:.2f},{longitude:.2f},{day}".encode()).digest()
        high = 8 + seed[0] % 17
        daily["time"].append(day.isoformat())
        daily["temperature_2m_max"].append(float(high))
        daily["temperature_2m_min"].append(float(high - 5 - seed[1] % 5))
        daily["precipitation_probability_max"].append(int(seed[2] % 91))
        daily["wind_speed_10m_max"].append(float(5 + seed[3] % 31))
        day += timedelta(days=1)

    return {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": "GMT",
        "daily_units": {
            "time": "iso8601",
            "temperature_2m_max": "°C",
            "temperature_2m_min": "°C",
            "precipitation_probability_max": "%",
            "wind_speed_10m_max": "km/h",
        },
        "daily": daily,
    }


# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def send_json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            self.send_json(200, {"status": "UP"})
        elif url.path == "/v1/forecast":
            try:
                self.send_json(200, forecast_reply(parse_qs(url.query)))
            except (KeyError, ValueError) as error:
                self.send_json(400, {"error": True, "reason": str(error)})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self.send_json(400, {"error": {"message": "invalid JSON", "type": "invalid_request_error"}})
            return
        if urlparse(self.path).path.rstrip("/") == "/v1/responses":
            self.send_json(200, responses_reply(body))
        else:
            self.send_json(404, {"error": {"message": "not mocked", "type": "invalid_request_error"}})

    def log_message(self, fmt, *args):
        print("%s %s" % (self.command, urlparse(self.path).path), flush=True)


if __name__ == "__main__":
    print(f"external-mocks listening on :{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
