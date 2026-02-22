import os
import json
import requests
from flask import Flask, request, Response, jsonify

app = Flask(__name__)

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
VOICE_ID = os.environ.get('VOICE_ID', '21m00Tcm4TlvDq8ikWAM')  # Rachel

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

SYSTEM_PROMPT = """You are Evident, an AI-powered media analysis tool. Your output will be read aloud directly to the user via text-to-speech — no screen, no UI, just audio.

Write a natural, conversational spoken summary — like a knowledgeable friend giving a quick briefing. Keep it to 4-6 sentences. Use plain prose with no markdown, bullet points, dashes, asterisks, or special characters. No meta-commentary, preamble, or acknowledgements (do not say things like "Sure", "Here is your summary", "I've analyzed", or "OK"). Begin speaking immediately with the substance of the briefing.

Cover in order: what article was analyzed and who published it, the trust score and what it means, any notable flags by name (briefly), and a closing recommendation. Be warm, clear, and concise."""


def generate_summary(data):
    url = (
        f'https://generativelanguage.googleapis.com/v1beta/models/'
        f'gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}'
    )
    payload = {
        'systemInstruction': {'parts': [{'text': SYSTEM_PROMPT}]},
        'contents': [{
            'parts': [{'text': f'Generate a spoken summary for this analysis:\n\n{json.dumps(data, indent=2)}'}]
        }],
        'generationConfig': {
            'maxOutputTokens': 2048,
            'temperature': 0.7,
            'thinkingConfig': {'thinkingBudget': 0},
        },
    }
    res = requests.post(url, json=payload, timeout=30)
    res.raise_for_status()
    return res.json()['candidates'][0]['content']['parts'][0]['text'].strip()


@app.route('/tts', methods=['POST', 'OPTIONS'])
def tts():
    if request.method == 'OPTIONS':
        return Response(status=204, headers=CORS_HEADERS)

    if not ELEVENLABS_API_KEY:
        return jsonify({'error': 'ELEVENLABS_API_KEY not set'}), 500
    if not GEMINI_API_KEY:
        return jsonify({'error': 'GEMINI_API_KEY not set'}), 500

    data = request.get_json(silent=True, force=True) or {}

    analysis = {k: data[k] for k in ('headline', 'trustScore', 'flags', 'siteProfile') if k in data}
    if not analysis:
        return jsonify({'error': 'Provide analysis data: headline, trustScore, flags, siteProfile'}), 400

    text = generate_summary(analysis)

    if len(text) > 4500:
        text = text[:4500]

    response = requests.post(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
        headers={
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
        },
        json={
            'text': text,
            'model_id': 'eleven_turbo_v2_5',
            'voice_settings': {
                'stability': 0.5,
                'similarity_boost': 0.75,
            },
        },
        timeout=30,
    )

    if not response.ok:
        return jsonify({'error': 'ElevenLabs API error', 'status': response.status_code, 'detail': response.text}), 502

    return Response(
        response.content,
        content_type='audio/mpeg',
        headers=CORS_HEADERS,
    )


@app.route('/health')
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
