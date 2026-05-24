
import google.generativeai as genai
import os

API_KEY = "AIzaSyDh84MdWSnLuQ2niphbZXhNDzwMFm49Qz0"
os.environ["GOOGLE_AI_API_KEY"] = API_KEY

print(f"Testing API Key: {API_KEY}")

try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, are you working?")
    print("Success!")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
