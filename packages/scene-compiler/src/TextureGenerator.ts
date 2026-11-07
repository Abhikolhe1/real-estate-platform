import * as THREE from 'three';

// Cache generated textures to avoid recreating canvases
const textureCache = new Map<string, THREE.CanvasTexture>();

export class TextureGenerator {
  /**
   * Generates a high-resolution Italian Carrara marble texture
   */
  static getMarbleTexture(): THREE.CanvasTexture {
    const key = 'marble_carrara';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base subtle off-white marble
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, 512, 512);

    // Soft cloudiness
    const cloudCount = 8;
    for (let i = 0; i < cloudCount; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const rad = 100 + Math.random() * 150;
      const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, rad);
      grd.addColorStop(0, 'rgba(226, 222, 214, 0.4)');
      grd.addColorStop(1, 'rgba(248, 246, 240, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 512, 512);
    }

    // Delicate grey-gold mineral veins
    const drawVein = (startX: number, startY: number, angle: number, len: number, color: string, width: number) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let x = startX;
      let y = startY;
      let a = angle;
      for (let i = 0; i < len; i++) {
        a += (Math.random() - 0.5) * 0.45;
        x += Math.cos(a) * 3;
        y += Math.sin(a) * 3;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    // Primary veins
    for (let i = 0; i < 14; i++) {
      drawVein(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * Math.PI * 2,
        120 + Math.random() * 180,
        'rgba(148, 138, 126, 0.25)',
        1.2 + Math.random() * 1.5
      );
    }

    // Secondary hairline veins
    for (let i = 0; i < 18; i++) {
      drawVein(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * Math.PI * 2,
        80 + Math.random() * 120,
        'rgba(180, 160, 140, 0.3)',
        0.6 + Math.random() * 0.8
      );
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    textureCache.set(key, tex);
    return tex;
  }

  /**
   * Generates a warm oak wood plank / parquet texture
   */
  static getWoodParquetTexture(): THREE.CanvasTexture {
    const key = 'wood_parquet';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base rich honey oak
    ctx.fillStyle = '#b8834c';
    ctx.fillRect(0, 0, 512, 512);

    const plankHeight = 64;
    const plankWidth = 256;

    // Draw planks with subtle variations
    for (let row = 0; row < 8; row++) {
      const y = row * plankHeight;
      const xOffset = (row % 2 === 0) ? 0 : 128;

      for (let col = -1; col < 3; col++) {
        const x = col * plankWidth + xOffset;
        const shadeVariation = (Math.random() - 0.5) * 16;
        const r = Math.min(255, Math.max(0, 184 + Math.round(shadeVariation)));
        const g = Math.min(255, Math.max(0, 131 + Math.round(shadeVariation * 0.8)));
        const b = Math.min(255, Math.max(0, 76 + Math.round(shadeVariation * 0.5)));

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);

        // Plank grain
        ctx.strokeStyle = `rgba(${r - 35}, ${g - 30}, ${b - 20}, 0.25)`;
        for (let gIdx = 0; gIdx < 6; gIdx++) {
          const gy = y + 8 + gIdx * 9;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          for (let gx = x; gx < x + plankWidth; gx += 8) {
            ctx.lineTo(gx, gy + Math.sin(gx * 0.04) * 2);
          }
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Horizontal joint
      ctx.strokeStyle = '#634220';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    textureCache.set(key, tex);
    return tex;
  }

  /**
   * Generates a modern ceramic / porcelain tile texture
   */
  static getTileTexture(tileColor = '#d9e2ec', groutColor = '#829ab1'): THREE.CanvasTexture {
    const key = `tile_${tileColor}_${groutColor}`;
    if (textureCache.has(key)) return textureCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Grout fill
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 128;
    const grout = 4;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * tileSize + grout / 2;
        const y = r * tileSize + grout / 2;
        const sz = tileSize - grout;

        // Base tile
        ctx.fillStyle = tileColor;
        ctx.fillRect(x, y, sz, sz);

        // Subtle specular highlight on edge
        const grd = ctx.createLinearGradient(x, y, x + sz, y + sz);
        grd.addColorStop(0, 'rgba(255,255,255,0.4)');
        grd.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grd.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, sz, sz);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    textureCache.set(key, tex);
    return tex;
  }

  /**
   * Generates outdoor weather-resistant teak balcony decking
   */
  static getBalconyDeckTexture(): THREE.CanvasTexture {
    const key = 'teak_deck';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2b1d14'; // Dark gap
    ctx.fillRect(0, 0, 256, 256);

    const slatHeight = 32;
    const gap = 3;

    for (let i = 0; i < 8; i++) {
      const y = i * slatHeight;
      ctx.fillStyle = '#8f5a34'; // Warm teak slat
      ctx.fillRect(0, y + gap / 2, 256, slatHeight - gap);

      // Slat bevel highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, y + gap / 2, 256, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    textureCache.set(key, tex);
    return tex;
  }

  /**
   * Daylight sky hemisphere texture
   */
  static getSkyDomeTexture(): THREE.CanvasTexture {
    const key = 'sky_dome';
    if (textureCache.has(key)) return textureCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Vertical daylight gradient from zenith to ground
    const grd = ctx.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0.0, '#1a6ec7'); // Zenith rich blue
    grd.addColorStop(0.35, '#52a2f8'); // Mid sky
    grd.addColorStop(0.65, '#9fd2fc'); // Lower sky
    grd.addColorStop(0.85, '#dbeafe'); // Horizon warm haze
    grd.addColorStop(0.92, '#82b185'); // Distant green tree line horizon
    grd.addColorStop(1.0, '#388e3c'); // Ground baseline

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1024, 512);

    // Warm sun disc glow near horizon (south-east)
    const sunX = 720;
    const sunY = 240;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
    sunGlow.addColorStop(0, 'rgba(255, 255, 245, 0.95)');
    sunGlow.addColorStop(0.15, 'rgba(255, 240, 200, 0.6)');
    sunGlow.addColorStop(0.4, 'rgba(255, 225, 170, 0.25)');
    sunGlow.addColorStop(1, 'rgba(255, 225, 170, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, 1024, 512);

    // Soft whispy cirrus clouds
    for (let i = 0; i < 7; i++) {
      const cx = Math.random() * 1024;
      const cy = 80 + Math.random() * 140;
      const cw = 180 + Math.random() * 200;
      const ch = 18 + Math.random() * 25;

      const cloudGrd = ctx.createRadialGradient(cx, cy, 5, cx, cy, cw / 2);
      cloudGrd.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      cloudGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      cloudGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = cloudGrd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    textureCache.set(key, tex);
    return tex;
  }
}
