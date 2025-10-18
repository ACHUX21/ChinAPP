from flask import Blueprint, request, jsonify
from app.services.ai_integration import enhance_flashcard
from app.services.eleven_ai_voice import text_to_speech_

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/enhance_flashcard', methods=['POST'])
def enhance_flashcard_route():
    """Enhance flashcard using AI"""
    data = request.get_json()
    
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    
    result = enhance_flashcard(data)
    print(f"Enhancement result: {result}")
    
    if result["status"] == "success":
        print(f"Flashcard enhanced successfully: {result['message']}")  
        return jsonify(result), 200
    else:
        print(f"Error enhancing flashcard: {result['message']}")
        return jsonify(result), 500
    
@ai_bp.route('/generate_voice', methods=['POST'])
def generate_voice_route():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"status": "error", "message": "No text provided"}), 400
    
    text = data['text']
    try:
        audio_b64 = text_to_speech_(text)
        return jsonify({"status": "success", "audio_base64": audio_b64}), 200
    except Exception as e:
        print(f"Error generating voice: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500