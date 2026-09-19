import { Camera } from '../camera/Camera';
import { FireCell } from './FireSystem';

export interface LightningEffect {
  id: string;
  targetX: number;
  targetY: number;
  segments: { x: number; y: number }[];
  branches: { x: number; y: number }[][];
  lifetime: number;
  maxLifetime: number;
}

export interface MeteorEffect {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  altitude: number; // starts at 15-20, drops to 0
  maxAltitude: number;
  speed: number;
  radius: number;
  trail: { x: number; y: number; size: number; alpha: number; color: string }[];
  onImpact: (x: number, y: number) => void;
}

export interface GrenadeEffect {
  id: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  altitude: number;
  vz: number;
  fuseTimer: number;
  maxFuse: number;
  rotation: number;
  isNapalm: boolean;
  onExplode: (x: number, y: number, isNapalm: boolean) => void;
}

export interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  duration: number;
  maxDuration: number;
  color: string;
  ringOnly?: boolean;
}

export interface EarthquakeCrack {
  id: string;
  lines: { x1: number; y1: number; x2: number; y2: number }[];
  lifetime: number;
  maxLifetime: number;
}

export interface RainArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  maxDuration: number;
  drops: { offsetX: number; offsetY: number; length: number; speed: number }[];
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export class VFXSystem {
  public lightnings: LightningEffect[] = [];
  public meteors: MeteorEffect[] = [];
  public grenades: GrenadeEffect[] = [];
  public explosions: ExplosionEffect[] = [];
  public earthquakes: EarthquakeCrack[] = [];
  public rainAreas: RainArea[] = [];
  public floatingTexts: FloatingText[] = [];
  public particles: Particle[] = [];

  private static idCounter = 1;

  public clear(): void {
    this.lightnings = [];
    this.meteors = [];
    this.grenades = [];
    this.explosions = [];
    this.earthquakes = [];
    this.rainAreas = [];
    this.floatingTexts = [];
    this.particles = [];
  }

  /**
   * Spawn a branching lightning strike
   */
  public addLightning(targetX: number, targetY: number): void {
    const segments: { x: number; y: number }[] = [];
    const branches: { x: number; y: number }[][] = [];

    const startX = targetX + (Math.random() * 6 - 3);
    const startY = targetY - 24; // from high above

    segments.push({ x: startX, y: startY });

    const steps = 14;
    let currX = startX;
    let currY = startY;

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const targetInterpX = startX + (targetX - startX) * progress;
      const targetInterpY = startY + (targetY - startY) * progress;

      // Jitter
      currX = targetInterpX + (Math.random() * 1.8 - 0.9) * (1 - progress * 0.4);
      currY = targetInterpY;
      segments.push({ x: currX, y: currY });

      // Spawn branching fork
      if (Math.random() < 0.35 && i < steps - 2) {
        const branch: { x: number; y: number }[] = [{ x: currX, y: currY }];
        let bx = currX;
        let by = currY;
        const branchSteps = 4 + Math.floor(Math.random() * 4);
        const branchAngle = (Math.random() - 0.5) * 1.2 + Math.PI / 2;

        for (let b = 0; b < branchSteps; b++) {
          bx += Math.cos(branchAngle) * (0.8 + Math.random() * 0.6);
          by += Math.sin(branchAngle) * (0.8 + Math.random() * 0.6);
          branch.push({ x: bx, y: by });
        }
        branches.push(branch);
      }
    }

    // Connect last segment exactly to target
    segments[segments.length - 1] = { x: targetX, y: targetY };

    this.lightnings.push({
      id: `l_${VFXSystem.idCounter++}`,
      targetX,
      targetY,
      segments,
      branches,
      lifetime: 0.35,
      maxLifetime: 0.35,
    });

    // Sparks at strike ground point
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 1.5 + Math.random() * 2,
        color: Math.random() < 0.5 ? '#fef08a' : '#67e8f9',
        alpha: 1.0,
        decay: 2.0 + Math.random() * 2.0,
      });
    }
  }

  /**
   * Spawn a falling meteor
   */
  public addMeteor(targetX: number, targetY: number, onImpact: (x: number, y: number) => void): void {
    const altitude = 22;
    const startX = targetX - 14;
    const startY = targetY - 18;

    this.meteors.push({
      id: `met_${VFXSystem.idCounter++}`,
      startX,
      startY,
      targetX,
      targetY,
      altitude,
      maxAltitude: altitude,
      speed: 18,
      radius: 1.4,
      trail: [],
      onImpact,
    });
  }

  /**
   * Spawn a thrown grenade or napalm canister
   */
  public addGrenade(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    isNapalm: boolean,
    onExplode: (x: number, y: number, isNapalm: boolean) => void
  ): void {
    this.grenades.push({
      id: `gr_${VFXSystem.idCounter++}`,
      currentX: fromX,
      currentY: fromY,
      targetX,
      targetY,
      altitude: 0,
      vz: 6.5,
      fuseTimer: 1.1,
      maxFuse: 1.1,
      rotation: 0,
      isNapalm,
      onExplode,
    });
  }

  /**
   * Spawn expanding explosion flash & shockwave
   */
  public addExplosion(x: number, y: number, radius: number, color: string = '#f97316', ringOnly: boolean = false): void {
    this.explosions.push({
      id: `exp_${VFXSystem.idCounter++}`,
      x,
      y,
      radius: 0.2,
      maxRadius: radius,
      duration: 0.45,
      maxDuration: 0.45,
      color,
      ringOnly,
    });

    // Burst particles
    const count = ringOnly ? 15 : 30;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (radius * 1.5);
      const isSmoke = Math.random() < 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 2 + Math.random() * 3,
        color: isSmoke ? '#475569' : Math.random() < 0.5 ? '#fbbf24' : '#ef4444',
        alpha: 1.0,
        decay: 1.2 + Math.random() * 1.5,
      });
    }
  }

  /**
   * Spawn seismic earthquake ground cracks
   */
  public addEarthquake(centerX: number, centerY: number, radius: number = 6): void {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const mainFissureCount = 4 + Math.floor(Math.random() * 3);

    for (let f = 0; f < mainFissureCount; f++) {
      const angle = (f / mainFissureCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      let currX = centerX;
      let currY = centerY;
      const segments = 5 + Math.floor(Math.random() * 4);

      for (let s = 0; s < segments; s++) {
        const segLen = 0.8 + Math.random() * 0.8;
        const segAngle = angle + (Math.random() - 0.5) * 0.7;
        const nextX = currX + Math.cos(segAngle) * segLen;
        const nextY = currY + Math.sin(segAngle) * segLen;
        lines.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
        currX = nextX;
        currY = nextY;

        // Small side branch crack
        if (Math.random() < 0.4) {
          const sideAngle = segAngle + (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.5);
          const sideLen = 0.5 + Math.random() * 0.6;
          lines.push({
            x1: currX,
            y1: currY,
            x2: currX + Math.cos(sideAngle) * sideLen,
            y2: currY + Math.sin(sideAngle) * sideLen,
          });
        }
      }
    }

    this.earthquakes.push({
      id: `eq_${VFXSystem.idCounter++}`,
      lines,
      lifetime: 5.0,
      maxLifetime: 5.0,
    });

    // Dust particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      this.particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 0.8,
        size: 2.5 + Math.random() * 3,
        color: '#94a3b8',
        alpha: 0.7,
        decay: 0.6 + Math.random() * 0.8,
      });
    }
  }

  /**
   * Spawn healing rain cloud area
   */
  public addRainArea(x: number, y: number, radius: number, duration: number = 6.0): void {
    const drops: { offsetX: number; offsetY: number; length: number; speed: number }[] = [];
    const count = Math.floor(radius * radius * 4);

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * radius;
      drops.push({
        offsetX: Math.cos(ang) * d,
        offsetY: Math.sin(ang) * d,
        length: 2 + Math.random() * 3,
        speed: 14 + Math.random() * 8,
      });
    }

    this.rainAreas.push({
      id: `rain_${VFXSystem.idCounter++}`,
      x,
      y,
      radius,
      duration,
      maxDuration: duration,
      drops,
    });
  }

  /**
   * Add floating divine/combat text
   */
  public addFloatingText(text: string, x: number, y: number, color: string = '#fef08a'): void {
    this.floatingTexts.push({
      id: `txt_${VFXSystem.idCounter++}`,
      text,
      x,
      y,
      color,
      lifetime: 1.2,
      maxLifetime: 1.2,
    });
  }

  /**
   * Update all VFX
   */
  public update(dt: number, activeFires?: FireCell[]): void {
    // 1. Lightnings
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].lifetime -= dt;
      if (this.lightnings[i].lifetime <= 0) {
        this.lightnings.splice(i, 1);
      }
    }

    // 2. Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const met = this.meteors[i];
      met.altitude -= met.speed * dt;

      // Interpolate current pos
      const progress = 1 - Math.max(0, met.altitude / met.maxAltitude);
      const currX = met.startX + (met.targetX - met.startX) * progress;
      const currY = met.startY + (met.targetY - met.startY) * progress;

      // Add trail
      met.trail.unshift({
        x: currX,
        y: currY - met.altitude * 0.4,
        size: met.radius * (1 + Math.random() * 0.5),
        alpha: 1.0,
        color: Math.random() < 0.6 ? '#f97316' : '#facc15',
      });
      if (met.trail.length > 25) met.trail.pop();

      // Fade trail
      for (const p of met.trail) {
        p.alpha -= dt * 2.5;
      }

      if (met.altitude <= 0) {
        met.onImpact(met.targetX, met.targetY);
        this.meteors.splice(i, 1);
      }
    }

    // 3. Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      gr.fuseTimer -= dt;
      gr.rotation += dt * 8;

      // Move toward target
      const dx = gr.targetX - gr.currentX;
      const dy = gr.targetY - gr.currentY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.1) {
        const moveSpeed = Math.min(dist, 7 * dt);
        gr.currentX += (dx / dist) * moveSpeed;
        gr.currentY += (dy / dist) * moveSpeed;
      }

      // Parabolic arc z-height
      gr.vz -= 20 * dt;
      gr.altitude += gr.vz * dt;
      if (gr.altitude < 0) {
        gr.altitude = 0;
        gr.vz = -gr.vz * 0.4; // bounce dampening
      }

      // Smoke puff trail
      if (Math.random() < 0.4) {
        this.particles.push({
          x: gr.currentX,
          y: gr.currentY - gr.altitude,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3,
          size: 1.8,
          color: gr.isNapalm ? '#a855f7' : '#94a3b8',
          alpha: 0.8,
          decay: 2.0,
        });
      }

      if (gr.fuseTimer <= 0) {
        gr.onExplode(gr.currentX, gr.currentY, gr.isNapalm);
        this.grenades.splice(i, 1);
      }
    }

    // 4. Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.duration -= dt;
      const p = 1 - Math.max(0, exp.duration / exp.maxDuration);
      exp.radius = exp.maxRadius * p;

      if (exp.duration <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    // 5. Earthquakes
    for (let i = this.earthquakes.length - 1; i >= 0; i--) {
      this.earthquakes[i].lifetime -= dt;
      if (this.earthquakes[i].lifetime <= 0) {
        this.earthquakes.splice(i, 1);
      }
    }

    // 6. Rain areas
    for (let i = this.rainAreas.length - 1; i >= 0; i--) {
      this.rainAreas[i].duration -= dt;
      if (this.rainAreas[i].duration <= 0) {
        this.rainAreas.splice(i, 1);
      }
    }

    // 7. Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.lifetime -= dt;
      txt.y -= 0.6 * dt;
      if (txt.lifetime <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 8. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 9. Active fire particles emission
    if (activeFires && activeFires.length > 0) {
      const sampleLimit = Math.min(activeFires.length, 30);
      for (let i = 0; i < sampleLimit; i++) {
        const fire = activeFires[Math.floor(Math.random() * activeFires.length)];
        if (Math.random() < 0.6) {
          const isNapalm = fire.isNapalm;
          this.particles.push({
            x: fire.x + 0.2 + Math.random() * 0.6,
            y: fire.y + 0.2 + Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.8 - Math.random() * 1.2,
            size: 2 + Math.random() * 2.5,
            color: isNapalm
              ? Math.random() < 0.4
                ? '#c084fc'
                : '#ea580c'
              : Math.random() < 0.5
              ? '#f97316'
              : '#facc15',
            alpha: 0.9,
            decay: 2.2,
          });
        }
      }
    }
  }

  /**
   * Render all effects onto Canvas 2D
   */
  public render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasW: number,
    canvasH: number,
    zoom: number
  ): void {
    ctx.save();

    // 1. Render Earthquake fissures (ground level)
    for (const eq of this.earthquakes) {
      const alpha = Math.min(1.0, eq.lifetime / (eq.maxLifetime * 0.5));
      ctx.strokeStyle = `rgba(30, 20, 15, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(1.5, zoom * 0.12);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (const line of eq.lines) {
        const p1 = camera.worldToScreen(line.x1, line.y1, canvasW, canvasH);
        const p2 = camera.worldToScreen(line.x2, line.y2, canvasW, canvasH);
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
      }
      ctx.stroke();
    }

    // 2. Render Particles
    for (const p of this.particles) {
      const { screenX, screenY } = camera.worldToScreen(p.x, p.y, canvasW, canvasH);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      const s = Math.max(1, p.size * (zoom / 16));
      ctx.fillRect(screenX - s / 2, screenY - s / 2, s, s);
    }
    ctx.globalAlpha = 1.0;

    // 3. Render Rain Areas
    for (const rain of this.rainAreas) {
      const center = camera.worldToScreen(rain.x, rain.y, canvasW, canvasH);
      const rPixels = rain.radius * zoom;

      // Soft storm cloud shadow on ground
      const grad = ctx.createRadialGradient(
        center.screenX,
        center.screenY,
        rPixels * 0.2,
        center.screenX,
        center.screenY,
        rPixels
      );
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.12)');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center.screenX, center.screenY, rPixels, 0, Math.PI * 2);
      ctx.fill();

      // Rain streaks
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.lineWidth = Math.max(1, zoom * 0.06);
      ctx.beginPath();

      const timeOffset = (Date.now() / 60) % 20;
      for (const d of rain.drops) {
        const dropWorldX = rain.x + d.offsetX;
        const dropWorldY = rain.y + d.offsetY;
        const pt = camera.worldToScreen(dropWorldX, dropWorldY, canvasW, canvasH);
        const animY = pt.screenY + (timeOffset * d.speed) % (rPixels * 1.5) - rPixels * 0.75;

        // Check if inside circle
        const distSq = (pt.screenX - center.screenX) ** 2 + (animY - center.screenY) ** 2;
        if (distSq <= rPixels * rPixels) {
          ctx.moveTo(pt.screenX, animY);
          ctx.lineTo(pt.screenX - d.length * 0.4, animY + d.length);
        }
      }
      ctx.stroke();
    }

    // 4. Render Explosions
    for (const exp of this.explosions) {
      const center = camera.worldToScreen(exp.x, exp.y, canvasW, canvasH);
      const rPixels = exp.radius * zoom;
      const alpha = Math.max(0, exp.duration / exp.maxDuration);

      if (!exp.ringOnly) {
        // Core fireball
        ctx.fillStyle = exp.color;
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.arc(center.screenX, center.screenY, rPixels * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright white flash
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(center.screenX, center.screenY, rPixels * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer shockwave ring
      ctx.strokeStyle = exp.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1.5, zoom * 0.15);
      ctx.beginPath();
      ctx.arc(center.screenX, center.screenY, rPixels, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 5. Render Grenades
    for (const gr of this.grenades) {
      const pt = camera.worldToScreen(gr.currentX, gr.currentY, canvasW, canvasH);
      const altPixels = gr.altitude * zoom;
      const cx = pt.screenX;
      const cy = pt.screenY - altPixels;
      const sz = Math.max(4, zoom * 0.4);

      // Drop shadow on ground
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(pt.screenX, pt.screenY, sz * 0.8, sz * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Grenade body
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(gr.rotation);

      ctx.fillStyle = gr.isNapalm ? '#9333ea' : '#15803d'; // purple for napalm, army green for grenade
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);

      // Pin / cap
      ctx.fillStyle = '#475569';
      ctx.fillRect(-sz * 0.2, -sz * 0.7, sz * 0.4, sz * 0.3);

      // Flashing red fuse
      const isFuseFlash = Math.floor(Date.now() / 100) % 2 === 0;
      ctx.fillStyle = isFuseFlash ? '#ef4444' : '#f59e0b';
      ctx.fillRect(-sz * 0.1, -sz * 0.9, sz * 0.2, sz * 0.2);

      ctx.restore();
    }

    // 6. Render Meteors
    for (const met of this.meteors) {
      const progress = 1 - Math.max(0, met.altitude / met.maxAltitude);
      const currX = met.startX + (met.targetX - met.startX) * progress;
      const currY = met.startY + (met.targetY - met.startY) * progress;
      const pt = camera.worldToScreen(currX, currY, canvasW, canvasH);
      const altPixels = met.altitude * zoom * 0.8;
      const cx = pt.screenX;
      const cy = pt.screenY - altPixels;

      // Render fiery trail
      for (const tr of met.trail) {
        const trPt = camera.worldToScreen(tr.x, tr.y, canvasW, canvasH);
        ctx.fillStyle = tr.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, tr.alpha));
        const s = tr.size * zoom;
        ctx.beginPath();
        ctx.arc(trPt.screenX, trPt.screenY, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Ground target crosshair shadow
      const groundPt = camera.worldToScreen(met.targetX, met.targetY, canvasW, canvasH);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(groundPt.screenX, groundPt.screenY, met.radius * zoom * (1 + (1 - progress)), 0, Math.PI * 2);
      ctx.fill();

      // Meteor head (fireball)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cx, cy, met.radius * zoom, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, met.radius * zoom * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Render Lightning Bolts
    for (const l of this.lightnings) {
      const alpha = Math.max(0, l.lifetime / l.maxLifetime);

      // Main trunk
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.lineWidth = Math.max(2.5, zoom * 0.18);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < l.segments.length; i++) {
        const pt = camera.worldToScreen(l.segments[i].x, l.segments[i].y, canvasW, canvasH);
        if (i === 0) ctx.moveTo(pt.screenX, pt.screenY);
        else ctx.lineTo(pt.screenX, pt.screenY);
      }
      ctx.stroke();

      // Cyan core glow
      ctx.strokeStyle = `rgba(103, 232, 249, ${alpha * 0.9})`;
      ctx.lineWidth = Math.max(1, zoom * 0.08);
      ctx.stroke();

      // Branches
      for (const branch of l.branches) {
        ctx.beginPath();
        for (let i = 0; i < branch.length; i++) {
          const pt = camera.worldToScreen(branch[i].x, branch[i].y, canvasW, canvasH);
          if (i === 0) ctx.moveTo(pt.screenX, pt.screenY);
          else ctx.lineTo(pt.screenX, pt.screenY);
        }
        ctx.stroke();
      }
    }

    // 8. Render Floating Combat/Divine Texts
    for (const txt of this.floatingTexts) {
      const pt = camera.worldToScreen(txt.x, txt.y, canvasW, canvasH);
      const alpha = Math.max(0, txt.lifetime / txt.maxLifetime);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';

      // Outline
      ctx.fillStyle = '#0f172a';
      ctx.fillText(txt.text, pt.screenX + 1, pt.screenY + 1);
      ctx.fillText(txt.text, pt.screenX - 1, pt.screenY - 1);

      // Fill
      ctx.fillStyle = txt.color;
      ctx.fillText(txt.text, pt.screenX, pt.screenY);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }
}
