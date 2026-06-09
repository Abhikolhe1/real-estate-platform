import os
import math
from typing import List, Dict, Any

# ─── Lazy imports ─────────────────────────────────────────────────────────────
_PADDLE_AVAILABLE = False
_paddle_ocr_instance = None

def _get_paddle():
    """Lazy-load PaddleOCR on first use so FastAPI boots instantly."""
    global _PADDLE_AVAILABLE, _paddle_ocr_instance
    if _paddle_ocr_instance is not None:
        return _paddle_ocr_instance
    try:
        from paddleocr import PaddleOCR
        # use_angle_cls: handles rotated floor plan text labels
        # lang='en': English (also detects numbers and symbols correctly)
        # use_gpu=False: CPU-only – works on any machine without CUDA
        # show_log=False: suppresses verbose PaddlePaddle init logs
        _paddle_ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=False,
            show_log=False
        )
        _PADDLE_AVAILABLE = True
        print("PaddleOCR engine initialized successfully (CPU mode).")
    except ImportError:
        print("PaddleOCR not installed. Falling back to alternative engines.")
    except Exception as e:
        print(f"PaddleOCR initialization failed: {e}")
    return _paddle_ocr_instance


class OCREngine:
    """
    Three-tier OCR pipeline:
      1. pypdf  – fastest for digital/vector PDFs (has embedded text)
      2. PaddleOCR – open-source, local, runs on CPU; handles raster images and
                     scanned PDFs by detecting text regions with deep learning
      3. Template fallback – returns curated label sets for known blueprint names
    """

    # ─── Tier 1: Digital PDF ──────────────────────────────────────────────────
    def _run_pypdf(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text labels from a searchable (vector) PDF using pypdf.
        Uses the visitor_text callback to capture each text string together
        with its transformation matrix so we get real (x, y) coordinates.
        """
        from pypdf import PdfReader

        labels: List[Dict[str, Any]] = []
        try:
            reader = PdfReader(file_path)
            if not reader.pages:
                return labels

            page = reader.pages[0]

            def visitor(text, cm, tm, font_dict, font_size):
                txt = text.strip()
                if len(txt) < 2:          # skip single chars / whitespace
                    return
                # tm = [a, b, c, d, tx, ty]  – tx/ty are page coordinates
                labels.append({
                    "text": txt,
                    "x": round(tm[4], 2),
                    "z": round(tm[5], 2),
                    "confidence": 1.0,
                    "source": "pypdf"
                })

            page.extract_text(visitor_text=visitor)
        except Exception as e:
            print(f"pypdf extraction error: {e}")

        return labels

    # ─── Tier 2: PaddleOCR ────────────────────────────────────────────────────
    def _run_paddle(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Runs PaddleOCR on an image or raster-PDF file.
        Extracts bounding-box centroids and maps them to layout metre coordinates.

        PaddleOCR result format (per page):
            [ [ bbox, (text, confidence) ], ... ]
        bbox = [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]  (4 corners, pixels)
        """
        ocr = _get_paddle()
        if ocr is None:
            return []

        labels: List[Dict[str, Any]] = []
        try:
            # result is a list of pages; each page is a list of detections
            result = ocr.ocr(file_path, cls=True)
            if not result:
                return labels

            # Collect all pixel centroids to determine canvas bounds
            raw: List[Dict[str, Any]] = []
            for page_lines in result:
                if not page_lines:
                    continue
                for line in page_lines:
                    bbox, (text, conf) = line
                    text = text.strip()
                    if not text or conf < 0.5:
                        continue
                    # Centroid of the four-corner bounding box
                    xs = [pt[0] for pt in bbox]
                    ys = [pt[1] for pt in bbox]
                    cx_px = sum(xs) / 4
                    cy_px = sum(ys) / 4
                    raw.append({
                        "text": text,
                        "px": cx_px,
                        "py": cy_px,
                        "confidence": round(conf, 2)
                    })

            if not raw:
                return labels

            # Normalise pixel positions → layout metre coordinates [-30, 30]
            all_px = [r["px"] for r in raw]
            all_py = [r["py"] for r in raw]
            min_px, max_px = min(all_px), max(all_px)
            min_py, max_py = min(all_py), max(all_py)
            span_px = max(max_px - min_px, 1)
            span_py = max(max_py - min_py, 1)
            LAYOUT_SPAN = 60.0  # metres across the whole plan

            for r in raw:
                rx = round(((r["px"] - min_px) / span_px - 0.5) * LAYOUT_SPAN, 2)
                # Invert Y: pixel Y grows downward, layout Z grows upward
                rz = round((0.5 - (r["py"] - min_py) / span_py) * LAYOUT_SPAN, 2)
                labels.append({
                    "text": r["text"],
                    "x": rx,
                    "z": rz,
                    "confidence": r["confidence"],
                    "source": "paddleocr"
                })

        except Exception as e:
            print(f"PaddleOCR run error: {e}")

        return labels

    # ─── Tier 3: Template fallback ────────────────────────────────────────────
    def _get_template_labels(self, filename: str) -> List[Dict[str, Any]]:
        """
        Returns a curated label set for known standard blueprint filenames.
        Used when no OCR engine is available or when parsing a DXF that already
        has labels handled by the ezdxf parser (so OCR is not called at all).
        """
        fn = filename.lower()
        print(f"Using template fallback labels for: {filename}")

        if "building_layout" in fn:
            return [
                {"text": "CENTRAL LOBBY",             "x":  0.0,  "z":  0.0,  "confidence": 1.0, "source": "template"},
                {"text": "COMMON CORRIDOR (2m WIDE)", "x":  0.0,  "z":  1.5,  "confidence": 1.0, "source": "template"},
                {"text": "LIVING ROOM",               "x": -9.8,  "z":  8.0,  "confidence": 1.0, "source": "template"},
                {"text": "LIVING ROOM",               "x": -9.8,  "z": -8.0,  "confidence": 1.0, "source": "template"},
                {"text": "DINING AREA",               "x": 10.8,  "z":  9.0,  "confidence": 1.0, "source": "template"},
                {"text": "DINING AREA",               "x": 10.8,  "z": -9.0,  "confidence": 1.0, "source": "template"},
            ]

        # Generic 2BHK symmetrical fallback
        return [
            {"text": "Lobby Corridor",  "x":  0.0, "z":  5.0, "confidence": 1.0, "source": "template"},
            {"text": "Living Room A",   "x": -4.0, "z":  1.5, "confidence": 1.0, "source": "template"},
            {"text": "Kitchen A",       "x": -6.0, "z": -3.0, "confidence": 1.0, "source": "template"},
            {"text": "Bedroom A",       "x": -2.0, "z": -3.5, "confidence": 1.0, "source": "template"},
            {"text": "Living Room B",   "x":  4.0, "z":  1.5, "confidence": 1.0, "source": "template"},
            {"text": "Kitchen B",       "x":  2.0, "z": -3.0, "confidence": 1.0, "source": "template"},
            {"text": "Bedroom B",       "x":  6.0, "z": -3.5, "confidence": 1.0, "source": "template"},
        ]

    # ─── Public API ───────────────────────────────────────────────────────────
    def extract_labels(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Main entry point. Routes the file to the correct OCR tier.

        Priority:
          PDF  → pypdf (digital text, fast, exact)
                 └→ PaddleOCR (raster/scanned PDF fallback)
          Image → PaddleOCR
          other → template fallback
        """
        ext = os.path.splitext(file_path)[1].lower()
        filename = os.path.basename(file_path)

        # ── Tier 1: digital PDF ──
        if ext == ".pdf":
            labels = self._run_pypdf(file_path)
            if labels:
                print(f"pypdf extracted {len(labels)} labels from {filename}")
                return labels
            # Digital text not found → try PaddleOCR (scanned/raster PDF)
            print(f"No digital text found in PDF; trying PaddleOCR on {filename}")
            labels = self._run_paddle(file_path)
            if labels:
                print(f"PaddleOCR extracted {len(labels)} labels from {filename}")
                return labels

        # ── Tier 2: image ──
        elif ext in (".png", ".jpg", ".jpeg", ".bmp", ".tiff"):
            labels = self._run_paddle(file_path)
            if labels:
                print(f"PaddleOCR extracted {len(labels)} labels from {filename}")
                return labels

        # ── Tier 3: template fallback ──
        return self._get_template_labels(filename)
