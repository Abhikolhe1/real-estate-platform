import os
import urllib.request
import numpy as np
import cv2
from PIL import Image
from typing import Dict, Any, List

class StyleIntelligence:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    def download_image(self, url: str) -> np.ndarray:
        """
        Downloads an image from a URL or reads it locally, returning an OpenCV BGR image.
        """
        if os.path.exists(url):
            # Read local file
            return cv2.imread(url)
        
        try:
            # Handle remote URL
            headers = {'User-Agent': 'Mozilla/5.0'}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                image_data = response.read()
                arr = np.asarray(bytearray(image_data), dtype="uint8")
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                return img
        except Exception as e:
            print(f"Error downloading image from {url}: {e}")
            return None

    def bgr_to_hex(self, color) -> str:
        """
        Converts BGR color tuple to hex string #RRGGBB
        """
        b, g, r = int(color[0]), int(color[1]), int(color[2])
        return f"#{r:02x}{g:02x}{b:02x}"

    def analyze_local_style(self, img: np.ndarray) -> Dict[str, Any]:
        """
        Analyzes the image locally using OpenCV color clustering and HSV profiling.
        """
        # Resize to 150x150 to run K-Means extremely fast
        img_resized = cv2.resize(img, (150, 150), interpolation=cv2.INTER_AREA)
        
        # Reshape to list of pixels
        pixels = img_resized.reshape((-1, 3)).astype(np.float32)
        
        # Run K-Means with K=4 to find dominant colors
        k = 4
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        flags = cv2.KMEANS_RANDOM_CENTERS
        compactness, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, flags)
        
        centers = np.uint8(centers)
        hex_colors = [self.bgr_to_hex(c) for c in centers]

        # Convert centers to HSV to perform structural style heuristic profiling
        centers_hsv = cv2.cvtColor(np.expand_dims(centers, axis=0), cv2.COLOR_BGR2HSV)[0]

        # Classification counts / votes
        is_minimalist = 0
        is_commercial = 0
        is_premium = 0
        is_luxury = 0
        is_modern = 0

        detected_materials = set()

        for idx, hsv in enumerate(centers_hsv):
            h, s, v = hsv[0], hsv[1], hsv[2]
            
            # 1. Minimalist indicator: Very high brightness, low saturation (whites/light grays)
            if v > 180 and s < 40:
                is_minimalist += 2
                detected_materials.add("concrete")
                detected_materials.add("paint")
            
            # 2. Commercial indicator: Saturated blue/cyan tones (glass curtain wall facade)
            elif 90 <= h <= 130 and s > 60:
                is_commercial += 2
                detected_materials.add("glass")
                detected_materials.add("steel")

            # 3. Premium indicator: Orange/brown wood tones
            elif 10 <= h <= 25 and 30 <= s <= 160 and 60 <= v <= 180:
                is_premium += 2
                detected_materials.add("wood")
                detected_materials.add("tiles")

            # 4. Luxury indicator: Black/dark marble (very low brightness) or rich gold highlights
            elif v < 50:
                is_luxury += 1
                detected_materials.add("marble")
                detected_materials.add("steel")
            elif 15 <= h <= 35 and s > 120 and v > 120:
                is_luxury += 2
                detected_materials.add("bronze")
                detected_materials.add("marble")

            # 5. Default Modern: Slate gray, charcoal, steel posts
            else:
                is_modern += 1
                detected_materials.add("concrete")
                detected_materials.add("glass")

        # Compile votes
        votes = {
            "Minimalist": is_minimalist,
            "Commercial": is_commercial,
            "Premium": is_premium,
            "Luxury": is_luxury,
            "Modern": is_modern
        }
        
        predicted_style = max(votes, key=votes.get)
        # Default materials fallback if empty
        if not detected_materials:
            detected_materials = {"concrete", "glass"}
            
        return {
            "style": predicted_style,
            "materials": list(detected_materials),
            "colors": hex_colors,
            "confidence": 0.85,
            "local": True
        }

    def analyze_api_style(self, url: str) -> Dict[str, Any]:
        """
        Attempts to analyze the image using external Cloud Vision APIs (Gemini/OpenAI) if keys are provided.
        """
        # If Gemini key is set, try using Google Generative AI
        if self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                
                # Fetch image data
                headers = {'User-Agent': 'Mozilla/5.0'}
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as response:
                    img_data = response.read()
                
                # Load with PIL
                import io
                image = Image.open(io.BytesIO(img_data))
                
                # Prompt for style assessment
                prompt = (
                    "Analyze this architectural building facade. "
                    "Which style does it best fit: Modern, Luxury, Commercial, Minimalist, or Premium? "
                    "Also, list the primary materials (concrete, wood, glass, marble, steel, etc.) "
                    "and guess the top 3 dominant colors. "
                    "Respond ONLY with a JSON object format: "
                    '{"style": "Modern|Luxury|Commercial|Minimalist|Premium", "materials": ["mat1", "mat2"], "colors": ["#hex1", "#hex2"], "confidence": 0.95}'
                )
                
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content([prompt, image])
                
                # Parse JSON response
                import json
                clean_text = response.text.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()
                
                res = json.loads(clean_text)
                res["local"] = False
                return res
            except Exception as e:
                print(f"Failed to use Gemini Vision API: {e}. Falling back to local analysis.")

        return None

    def detect_style(self, image_url: str) -> Dict[str, Any]:
        """
        Main interface entry point. Resolves style prediction.
        """
        # Try API style detection first if keys exist
        if self.gemini_key or self.openai_key:
            api_res = self.analyze_api_style(image_url)
            if api_res:
                return api_res

        # Fallback to local high-performance OpenCV classifier
        img = self.download_image(image_url)
        if img is None:
            # Absolute fallback if image fails to download/read
            return {
                "style": "Modern",
                "materials": ["concrete", "glass"],
                "colors": ["#1e293b", "#00f5d4", "#e2e8f0"],
                "confidence": 0.50,
                "local": True
            }
        
        return self.analyze_local_style(img)
