
import os
import base64
from dotenv import load_dotenv
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from app.services.ai_integration import enhance_flashcard
load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
elevenlabs = ElevenLabs(
    api_key=ELEVENLABS_API_KEY,
)

def text_to_speech_(text: str) -> str:
    try:
        chinese_text = enhance_flashcard({"english": text, "hanzi": ""})
        # Enhanced text for TTS: {'status': 'success', 'suggestions': {'hanzi': '你好'}, 'enhanced_data': {'english': 'Hello', 'hanzi': '你好'}, 'message': 'Generated suggestions for 1 fields'}
        if chinese_text["status"] == "success" and "hanzi" in chinese_text["suggestions"]:
            chinese_text = chinese_text["suggestions"]["hanzi"]
        else:
            chinese_text = text
        response = elevenlabs.text_to_speech.convert(
            voice_id="fQj4gJSexpu8RDE2Ii5m",
            output_format="mp3_22050_32",
            text=chinese_text,
            model_id="eleven_turbo_v2_5",
            voice_settings=VoiceSettings(
                stability=0.0,
                similarity_boost=1.0,
                style=0.0,
                use_speaker_boost=True,
                speed=0.8,
            ),
        )
        
        audio_data = b""
        for chunk in response:
            audio_data += chunk
        
        print(f"Generated audio content of length: {len(audio_data)} bytes")
        return base64.b64encode(audio_data).decode("utf-8")
        
    except Exception as e:
        print(f"Error in text_to_speech_: {str(e)}")
        raise Exception(f"Failed to generate audio: {str(e)}")