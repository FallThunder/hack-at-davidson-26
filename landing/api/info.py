from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        data = {
            "name": "Evident",
            "version": "2.3.0",
            "tagline": "Read news you can trust.",
            "description": (
                "Evident is a browser extension that analyzes news articles in real time — "
                "scoring trust, detecting political bias, and highlighting questionable claims "
                "directly on the page."
            ),
            "features": [
                {
                    "id": "trust_score",
                    "title": "Trust Score",
                    "description": "0–100 composite score weighing publisher credibility, political neutrality, content factuality, and claim quality.",
                },
                {
                    "id": "site_profile",
                    "title": "Site Profile",
                    "description": "Political bias bar and factual reporting rating sourced from Media Bias/Fact Check via live web search.",
                },
                {
                    "id": "highlights",
                    "title": "Inline Highlights",
                    "description": "Color-coded sentence highlights on the article itself — yellow, orange, or red by urgency.",
                },
                {
                    "id": "flags",
                    "title": "Flag Analysis",
                    "description": "Per-claim breakdown with confidence score, reasoning, and source links for every flagged statement.",
                },
                {
                    "id": "a11y",
                    "title": "Accessibility Audit",
                    "description": "Live DOM scan scoring the article page for heading structure, alt text, link quality, and more.",
                },
                {
                    "id": "audio",
                    "title": "Audio Summary",
                    "description": "AI-generated spoken summary of the analysis read aloud via ElevenLabs text-to-speech.",
                },
            ],
            "browsers": ["Chrome", "Firefox"],
            "github": "https://github.com/FallThunder/hack-at-davidson-26",
            "download": {
                "chrome": "https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-chrome.zip",
                "firefox": "https://github.com/FallThunder/hack-at-davidson-26/releases/latest/download/evident-firefox.zip",
            },
            "built_at": "Hack@Davidson 2026",
        }

        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
