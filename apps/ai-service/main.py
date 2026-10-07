"""Production entrypoint. Legacy synthetic/OCR fallbacks are explicit demos only."""

import os
from canonical_app import app

if os.environ.get("ENABLE_LEGACY_CAD_DEMOS") == "true":
    from legacy.app import app as legacy_app

    app.mount("/demo", legacy_app)
