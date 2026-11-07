#!/usr/bin/env bash
# Deduplicate static media and 3D binary assets across apps into a shared root assets/ directory
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED_ASSETS="$ROOT_DIR/assets"

echo "Creating shared assets directory at: $SHARED_ASSETS"
mkdir -p "$SHARED_ASSETS/images" "$SHARED_ASSETS/videos" "$SHARED_ASSETS/models"

# Move authoritative copies from apps/web/public to shared assets if not present
if [ -d "$ROOT_DIR/apps/web/public/images" ]; then
  cp -rn "$ROOT_DIR/apps/web/public/images/"* "$SHARED_ASSETS/images/" 2>/dev/null || true
fi

if [ -f "$ROOT_DIR/apps/web/public/videos/walkthrough.mp4" ]; then
  cp -n "$ROOT_DIR/apps/web/public/videos/walkthrough.mp4" "$SHARED_ASSETS/videos/" 2>/dev/null || true
fi

if [ -f "$ROOT_DIR/apps/web/public/building.glb" ]; then
  cp -n "$ROOT_DIR/apps/web/public/building.glb" "$SHARED_ASSETS/models/" 2>/dev/null || true
fi

if [ -f "$ROOT_DIR/apps/web/public/floor_walkthrough.glb" ]; then
  cp -n "$ROOT_DIR/apps/web/public/floor_walkthrough.glb" "$SHARED_ASSETS/models/" 2>/dev/null || true
fi

echo "Shared assets populated:"
ls -la "$SHARED_ASSETS"

# Link to each app
for APP in "apps/web" "apps/builder" "apps/admin"; do
  APP_DIR="$ROOT_DIR/$APP/public"
  echo "Syncing symlinks for $APP_DIR..."
  mkdir -p "$APP_DIR/images" "$APP_DIR/videos"
  
  # Link models
  ln -sf "$SHARED_ASSETS/models/building.glb" "$APP_DIR/building.glb" 2>/dev/null || true
  ln -sf "$SHARED_ASSETS/models/floor_walkthrough.glb" "$APP_DIR/floor_walkthrough.glb" 2>/dev/null || true
  
  # Link video
  ln -sf "$SHARED_ASSETS/videos/walkthrough.mp4" "$APP_DIR/videos/walkthrough.mp4" 2>/dev/null || true
done

echo "Asset deduplication complete."

