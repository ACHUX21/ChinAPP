from google import genai
import dotenv
import json
import re
import time
from typing import Dict, Any, Optional

# Load environment variables
dotenv.load_dotenv()
GEMINI_API_KEY = dotenv.get_key(dotenv.find_dotenv(), "GEMINI_API_KEY")

PRE_PROMPT = """
You are an assistant that helps create flashcards by suggesting content for empty fields.
You will receive input in JSON format representing a flashcard, with some fields possibly empty.
Provide suggestions only for the empty fields, and return your suggestions in JSON format.
If all fields are filled, respond with "No suggestions".

RULES:
1. Only suggest content for fields that are empty.
2. If a field is already filled, do not change it.
3. If all fields are filled, respond with "No suggestions".
4. Ensure the JSON format is maintained in your response.
5. For the "part_of_speech" field, suggest one of the following: noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection.
6. For the "measure_word" field, suggest a common Chinese measure word if applicable, otherwise leave it empty.
7. For the "example_sentence" field, provide a simple sentence using the "hanzi", "pinyin", and "english" fields split appropriately for clarity.
8. For the "notes" field, provide any relevant additional information about the word or phrase, such as etymology or usage tips. in this form "nǐ (you) + hǎo (good)".
9. Ensure the response is valid JSON.
10. ALWAYS return valid JSON format, even if it's just an empty object {}.
11. Your response MUST be ONLY JSON, no additional text before or after.
12. For example_sentence, You have to create a sentence that commonly uses in Chinese, not a random sentence.

EXAMPLE INPUT:
{
    "hanzi": "",
    "pinyin": "",
    "english": "Hello",
    "traditional": "",
    "part_of_speech": "",
    "measure_word": "",
    "example_sentence": "",
    "notes": ""
}
EXAMPLE OUTPUT:
{
    "hanzi": "你好",
    "pinyin": "nǐ hǎo",
    "english": "Hello",
    "traditional": "你好",
    "part_of_speech": "interjection",
    "measure_word": "个",
    "example_sentence": "你好，你吃了吗？ (Nǐ hǎo, nǐ chī le ma?) - Hello, have you eaten?",
    "notes": "Common greeting\nnǐ (you) + hǎo (good)"
}
"""

def clean_json_response(text: str) -> str:
    """
    Clean and extract JSON from AI response text.
    Handles various formats the AI might return.
    """
    # Remove markdown code blocks
    cleaned = re.sub(r'```json\n?', '', text)
    cleaned = re.sub(r'```\n?', '', cleaned)
    cleaned = cleaned.strip()
    
    # Try to find JSON object pattern
    json_match = re.search(r'\{[^{}]*\{.*\}[^{}]*\}|\{.*\}', cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group()
    
    # Remove any non-JSON text before and after
    lines = cleaned.split('\n')
    json_lines = []
    in_json = False
    
    for line in lines:
        line = line.strip()
        if line.startswith('{') or in_json:
            in_json = True
            json_lines.append(line)
        if line.endswith('}'):
            break
    
    if json_lines:
        cleaned = '\n'.join(json_lines)
    
    return cleaned

def parse_json_safely(text: str, max_attempts: int = 3) -> Optional[Dict[str, Any]]:
    """
    Safely parse JSON with multiple attempts and error recovery.
    """
    for attempt in range(max_attempts):
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            if attempt < max_attempts - 1:
                # Try to fix common JSON issues
                # Remove trailing commas
                text = re.sub(r',\s*}', '}', text)
                text = re.sub(r',\s*]', ']', text)
                # Fix missing quotes
                text = re.sub(r'(\w+):', r'"\1":', text)
            else:
                raise e
    return None

def enhance_flashcard(flashcard_data: Dict[str, Any], 
                     api_key: str = None, 
                     model: str = "gemini-2.5-flash",
                     max_retries: int = 2) -> Dict[str, Any]:
    """
    Enhance a flashcard by generating suggestions for empty fields using Gemini AI.
    
    Args:
        flashcard_data: Dictionary with flashcard fields. Only "english" is required.
        api_key: Gemini API key (uses environment variable if not provided)
        model: Gemini model to use
        max_retries: Number of retry attempts for API calls
    
    Returns:
        Dictionary with:
        - status: "success", "no_suggestions", or "error"
        - suggestions: dict with only the suggested fields (only for fields originally sent)
        - enhanced_data: flashcard with original fields + suggestions (only fields originally sent)
        - message: optional error or info message
    
    Example:
        >>> flashcard = {"english": "Hey", "hanzi": ""}
        >>> result = enhance_flashcard(flashcard)
        >>> print(result["suggestions"])  # Only contains "hanzi" suggestion
    """
    
    # Use provided API key or environment variable
    if api_key is None:
        api_key = GEMINI_API_KEY
    
    if not api_key:
        return {
            "status": "error",
            "message": "API key not provided and GEMINI_API_KEY not found in environment variables"
        }
    
    # Define all possible fields (only english is required)
    all_fields = ["hanzi", "pinyin", "english", "traditional", 
                  "part_of_speech", "measure_word", "example_sentence", "notes"]
    
    # Validate input structure
    if not isinstance(flashcard_data, dict):
        return {
            "status": "error", 
            "message": "Input must be a dictionary"
        }
    
    # Check if english field is provided (only required field)
    if "english" not in flashcard_data or not flashcard_data["english"]:
        return {
            "status": "error",
            "message": "The 'english' field is required"
        }
    
    # Track which fields were originally sent by the user
    original_fields = list(flashcard_data.keys())
    
    # Initialize missing fields with empty strings if not provided
    for field in all_fields:
        if field not in flashcard_data:
            flashcard_data[field] = ""
    
    # Check if all original fields are already filled (non-empty)
    # Only check the fields that were originally provided
    all_original_filled = all(flashcard_data.get(field) for field in original_fields)
    if all_original_filled:
        return {
            "status": "no_suggestions",
            "message": "All provided fields are already filled",
            "suggestions": {},
            "enhanced_data": {field: flashcard_data[field] for field in original_fields}
        }
    
    # Retry logic for API calls
    for retry in range(max_retries + 1):
        try:
            # Initialize client and make API call
            client = genai.Client(api_key=api_key)
            
            input_text = json.dumps(flashcard_data, ensure_ascii=False, indent=2)
            
            response = client.models.generate_content(
                model=model,
                contents=PRE_PROMPT + "\nINPUT:\n" + input_text
            )
            
            # Clean and parse the response
            cleaned_text = response.text.strip()
            
            # Handle "No suggestions" response
            if cleaned_text.lower() in ["no suggestions", '"no suggestions"']:
                return {
                    "status": "no_suggestions",
                    "message": "No suggestions provided by AI",
                    "suggestions": {},
                    "enhanced_data": {field: flashcard_data[field] for field in original_fields}
                }
            
            # Clean the JSON response
            cleaned_text = clean_json_response(cleaned_text)
            
            # Parse JSON safely with error recovery
            suggestions = parse_json_safely(cleaned_text)
            
            if suggestions is None:
                raise json.JSONDecodeError("Failed to parse JSON after cleaning", cleaned_text, 0)
            
            # Validate that suggestions is a dictionary
            if not isinstance(suggestions, dict):
                raise ValueError(f"Expected dictionary but got {type(suggestions)}")
            
            # Filter to only include suggestions for originally empty fields THAT WERE ORIGINALLY SENT
            filtered_suggestions = {}
            for field in original_fields:
                if field in suggestions and (not flashcard_data.get(field)):
                    # Ensure the suggestion is not empty
                    if suggestions[field]:
                        filtered_suggestions[field] = suggestions[field]
            
            # Create enhanced flashcard data - ONLY with originally sent fields
            enhanced_data = {field: flashcard_data[field] for field in original_fields}
            enhanced_data.update(filtered_suggestions)
            
            return {
                "status": "success",
                "suggestions": filtered_suggestions,
                "enhanced_data": enhanced_data,
                "message": f"Generated suggestions for {len(filtered_suggestions)} fields"
            }
            
        except json.JSONDecodeError as e:
            if retry < max_retries:
                print(f"JSON parse error, retrying... (attempt {retry + 1}/{max_retries})")
                time.sleep(1)  # Brief delay before retry
                continue
            else:
                return {
                    "status": "error",
                    "message": f"Failed to parse AI response as JSON after {max_retries + 1} attempts: {e}",
                    "raw_response": response.text if 'response' in locals() else None
                }
        except Exception as e:
            if retry < max_retries:
                print(f"API error, retrying... (attempt {retry + 1}/{max_retries}) Error: {e}")
                time.sleep(1)  # Brief delay before retry
                continue
            else:
                return {
                    "status": "error",
                    "message": f"Error calling AI API after {max_retries + 1} attempts: {e}"
                }

# Example usage with better testing
if __name__ == "__main__":
    test_cases = [
        {"english": "Hey", "hanzi": ""},
        {"english": "Hello", "pinyin": "", "hanzi": ""},
        {"english": "Thank you", "notes": ""},
        {"english": "Water"} 
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n🧪 Test Case {i + 1}: {test_case}")
        print("=" * 50)
        
        result = enhance_flashcard(test_case)
        
        if result["status"] == "success":
            print("✅ Success! Generated suggestions:")
            for field, suggestion in result["suggestions"].items():
                print(f"   {field}: {suggestion}")
                
            print("\n🎯 Enhanced flashcard:")
            for field, value in result["enhanced_data"].items():
                print(f"   {field}: {value}")
                
        elif result["status"] == "no_suggestions":
            print("ℹ️", result["message"])
        else:
            print("❌ Error:", result["message"])
            if "raw_response" in result and result["raw_response"]:
                print("Raw AI response:", result["raw_response"][:200] + "...")