function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 23);
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
}

export function renderOrbitalEarthCanvas(
  canvas: HTMLCanvasElement,
  variant: 'left-limb' | 'horizon-bottom' = 'left-limb'
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(320, Math.floor(canvas.clientHeight * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Deep orbital space backdrop
  const spaceGrad = ctx.createLinearGradient(0, 0, width, height);
  spaceGrad.addColorStop(0, '#040a13');
  spaceGrad.addColorStop(0.55, '#071221');
  spaceGrad.addColorStop(1, '#09182b');
  ctx.fillStyle = spaceGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Crisp pin-point background starfield (no blurry glow)
  for (let i = 0; i < 110; i++) {
    const sx = hash2(i, 13, 7) * width;
    const sy = hash2(i, 41, 19) * height * 0.78;
    const alpha = 0.14 + hash2(i, 73, 3) * 0.45;
    const radius = hash2(i, 91, 11) > 0.85 ? 1.15 * dpr : 0.7 * dpr;
    ctx.fillStyle = `rgba(216, 232, 250, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Configure Earth sphere geometry
  const earthRadius =
    variant === 'left-limb'
      ? Math.max(width, height) * 0.84
      : Math.max(width, height) * 1.15;
  const cx = variant === 'left-limb' ? -earthRadius * 0.34 : width * 0.5;
  const cy = variant === 'left-limb' ? height * 1.12 : height + earthRadius * 0.76;

  // 4. Subtle Rayleigh scattering outer atmospheric limb
  const atmoGrad = ctx.createRadialGradient(
    cx,
    cy,
    earthRadius * 0.96,
    cx,
    cy,
    earthRadius * 1.07
  );
  atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
  atmoGrad.addColorStop(0.45, 'rgba(14, 165, 233, 0.16)');
  atmoGrad.addColorStop(1, 'rgba(7, 16, 28, 0)');
  ctx.fillStyle = atmoGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, earthRadius * 1.07, 0, Math.PI * 2);
  ctx.fill();

  // 5. Render planetary surface + clouds at medium buffer resolution and composite smoothly
  const bufScale = 0.42;
  const bw = Math.max(180, Math.floor(width * bufScale));
  const bh = Math.max(180, Math.floor(height * bufScale));
  const offscreen = document.createElement('canvas');
  offscreen.width = bw;
  offscreen.height = bh;
  const octx = offscreen.getContext('2d');
  if (!octx) return;

  const img = octx.createImageData(bw, bh);
  const data = img.data;
  const bcx = cx * bufScale;
  const bcy = cy * bufScale;
  const br = earthRadius * bufScale;

  // Sun illumination vector from upper-left horizon
  const sunX = -0.45;
  const sunY = -0.62;
  const sunZ = 0.64;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const dx = px - bcx;
      const dy = py - bcy;
      const distSq = dx * dx + dy * dy;
      if (distSq > br * br) continue;

      const nx = dx / br;
      const ny = dy / br;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      // Spherical texture coordinates
      const u = Math.atan2(nx, nz) * 2.2;
      const v = Math.asin(Math.max(-1, Math.min(1, ny))) * 2.2;

      const continent = fbm(u * 1.6 + 2.4, v * 1.6 + 1.1, 14, 5);
      const ridge = fbm(u * 4.2, v * 4.2, 31, 4);
      const isLand = continent > 0.53;

      let r = 13;
      let g = 46;
      let b = 86;

      if (isLand) {
        const veg = Math.max(0, Math.min(1, (ridge - 0.35) * 1.8));
        r = Math.round(32 + (1 - veg) * 58);
        g = Math.round(68 + veg * 24 + (1 - veg) * 36);
        b = Math.round(46 + (1 - veg) * 26);
      } else {
        // Bathymetric coastal shelf
        const shelf = Math.max(0, (continent - 0.44) * 9);
        r = Math.round(11 + shelf * 14);
        g = Math.round(42 + shelf * 44);
        b = Math.round(82 + shelf * 52);
      }

      // Layered cyclone & trade-wind cloud formations
      const swirl = fbm(u * 2.4 + 0.5, v * 2.4 - 0.3, 77, 4);
      const cloudField = fbm(u * 3.8 + swirl * 0.9, v * 3.8 - swirl * 0.7, 93, 5);
      const cirrus = fbm(u * 7.5, v * 5.2, 121, 3);
      const cloudAlpha = Math.max(
        0,
        Math.min(0.95, (cloudField - 0.44) * 2.35 + Math.max(0, cirrus - 0.56) * 0.65)
      );

      r = Math.round(r * (1 - cloudAlpha) + 236 * cloudAlpha);
      g = Math.round(g * (1 - cloudAlpha) + 243 * cloudAlpha);
      b = Math.round(b * (1 - cloudAlpha) + 250 * cloudAlpha);

      // Day/terminator Lambertian lighting + limb scattering
      const ndotl = Math.max(0.08, nx * sunX + ny * sunY + nz * sunZ);
      const fresnel = Math.pow(1 - nz, 2.8);

      const litR = Math.min(255, Math.round(r * ndotl + fresnel * 48));
      const litG = Math.min(255, Math.round(g * ndotl + fresnel * 138));
      const litB = Math.min(255, Math.round(b * ndotl + fresnel * 215));

      // Smooth anti-aliased edge at planetary horizon
      const dist = Math.sqrt(distSq);
      const edgeAlpha = Math.max(0, Math.min(1, (br - dist) * 1.5));

      const idx = (py * bw + px) * 4;
      data[idx] = litR;
      data[idx + 1] = litG;
      data[idx + 2] = litB;
      data[idx + 3] = Math.round(edgeAlpha * 255);
    }
  }

  octx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(offscreen, 0, 0, width, height);
  ctx.restore();

  // 6. Crisp bright horizon rim line + dark vignette scrim so text stays >= 7:1 contrast
  ctx.save();
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.38)';
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
  ctx.stroke();

  const scrim = ctx.createLinearGradient(0, 0, width, height);
  if (variant === 'left-limb') {
    scrim.addColorStop(0, 'rgba(6, 14, 25, 0.58)');
    scrim.addColorStop(0.55, 'rgba(6, 14, 25, 0.28)');
    scrim.addColorStop(1, 'rgba(6, 14, 25, 0.72)');
  } else {
    scrim.addColorStop(0, 'rgba(6, 14, 25, 0.78)');
    scrim.addColorStop(0.6, 'rgba(6, 14, 25, 0.55)');
    scrim.addColorStop(1, 'rgba(6, 14, 25, 0.82)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
