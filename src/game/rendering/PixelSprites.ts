import { ResourceType, ResourceNode } from '../types';
import { Human } from '../entities/Human';
import { Building } from '../buildings/Building';

/**
 * Procedural Pixel Art Renderers for Canvas 2D
 */
export class PixelSprites {
  /**
   * Draw a stylized pixel-art tree
   */
  public static drawTree(
    ctx: CanvasRenderingContext2D,
    res: ResourceNode,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const scale = zoom / 16;
    const cx = screenX + zoom / 2;
    const cy = screenY + zoom / 2;

    ctx.save();

    // 1. Tree base ground shadow
    ctx.fillStyle = 'rgba(20, 45, 15, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    const trunkWidth = Math.max(1, Math.round(2.5 * scale));
    const trunkHeight = Math.max(2, Math.round(5 * scale));
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(cx - trunkWidth / 2, cy + 5 * scale - trunkHeight, trunkWidth, trunkHeight);

    // Trunk shadow edge
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(cx, cy + 5 * scale - trunkHeight, trunkWidth / 2, trunkHeight);

    // Foliage canopy depending on variant
    const variant = res.variant % 4;

    if (variant === 0) {
      // Oak Tree - Multi-layered round clusters
      const r = 7 * scale;
      const topY = cy - 2 * scale;

      ctx.fillStyle = '#22551c';
      ctx.beginPath();
      ctx.arc(cx, topY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#367a28';
      ctx.beginPath();
      ctx.arc(cx - 1 * scale, topY - 1 * scale, r * 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#569e38';
      ctx.beginPath();
      ctx.arc(cx - 2.5 * scale, topY - 2.5 * scale, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7ac248';
      ctx.fillRect(cx - 3 * scale, topY - 4 * scale, Math.max(1, 2 * scale), Math.max(1, 2 * scale));
    } else if (variant === 1) {
      // Pine / Fir Tree - Triangular tiered layers
      const baseY = cy + 2 * scale;

      // Bottom tier
      ctx.fillStyle = '#1b432a';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 7 * scale);
      ctx.lineTo(cx - 7 * scale, baseY);
      ctx.lineTo(cx + 7 * scale, baseY);
      ctx.closePath();
      ctx.fill();

      // Middle tier
      ctx.fillStyle = '#265c3b';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 12 * scale);
      ctx.lineTo(cx - 5.5 * scale, baseY - 4.5 * scale);
      ctx.lineTo(cx + 5.5 * scale, baseY - 4.5 * scale);
      ctx.closePath();
      ctx.fill();

      // Top tier
      ctx.fillStyle = '#38784f';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 16 * scale);
      ctx.lineTo(cx - 4 * scale, baseY - 9 * scale);
      ctx.lineTo(cx + 4 * scale, baseY - 9 * scale);
      ctx.closePath();
      ctx.fill();

      // Tip highlight
      ctx.fillStyle = '#529d6d';
      ctx.fillRect(cx - 0.7 * scale, baseY - 16 * scale, Math.max(1, 1.5 * scale), Math.max(1, 2 * scale));
    } else if (variant === 2) {
      // Birch / Bushy Tree
      const r = 6 * scale;
      const topY = cy - 3 * scale;

      ctx.fillStyle = '#2e632b';
      ctx.beginPath();
      ctx.arc(cx - 2 * scale, topY, r * 0.8, 0, Math.PI * 2);
      ctx.arc(cx + 2 * scale, topY - 1 * scale, r * 0.8, 0, Math.PI * 2);
      ctx.arc(cx, topY - 3 * scale, r * 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#498c44';
      ctx.beginPath();
      ctx.arc(cx - 1 * scale, topY - 2 * scale, r * 0.7, 0, Math.PI * 2);
      ctx.arc(cx + 1 * scale, topY - 3 * scale, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7ec477';
      ctx.fillRect(cx - 1 * scale, topY - 6 * scale, Math.max(1, 2 * scale), Math.max(1, 2 * scale));
    } else {
      // Autumn / Golden Tree
      const r = 6.5 * scale;
      const topY = cy - 2.5 * scale;

      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.arc(cx, topY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.arc(cx - 1.5 * scale, topY - 1.5 * scale, r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cx - 2 * scale, topY - 2.5 * scale, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 2 * scale, topY - 4 * scale, Math.max(1, 1.5 * scale), Math.max(1, 1.5 * scale));
    }

    ctx.restore();
  }

  /**
   * Draw a stylized pixel-art stone rock boulder
   */
  public static drawStone(
    ctx: CanvasRenderingContext2D,
    res: ResourceNode,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const scale = zoom / 16;
    const cx = screenX + zoom / 2;
    const cy = screenY + zoom / 2;

    ctx.save();

    // 1. Drop shadow
    ctx.fillStyle = 'rgba(25, 30, 35, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 6.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const variant = res.variant % 3;

    if (variant === 0) {
      // Large angular granite boulder
      const w = 11 * scale;
      const h = 8 * scale;
      const ox = cx - w / 2;
      const oy = cy - h / 2 + 1 * scale;

      ctx.fillStyle = '#374151';
      ctx.fillRect(ox + 1 * scale, oy + 2 * scale, w, h - 2 * scale);

      ctx.fillStyle = '#4b5563';
      ctx.fillRect(ox, oy, w - 1 * scale, h - 1 * scale);

      ctx.fillStyle = '#6b7280';
      ctx.fillRect(ox + 1 * scale, oy + 1 * scale, w - 3 * scale, h - 3 * scale);

      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(ox + 1.5 * scale, oy + 1.5 * scale, 4 * scale, 2.5 * scale);
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(ox + 2 * scale, oy + 2 * scale, Math.max(1, 1.5 * scale), Math.max(1, 1.5 * scale));
    } else if (variant === 1) {
      // Cluster of 2 smooth rocks
      const r1 = 4.5 * scale;
      const x1 = cx - 2 * scale;
      const y1 = cy + 1 * scale;

      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(x1 + 1, y1 + 1, r1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x1, y1, r1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(x1 - 1 * scale, y1 - 1 * scale, r1 * 0.6, 0, Math.PI * 2);
      ctx.fill();

      const r2 = 3 * scale;
      const x2 = cx + 3.5 * scale;
      const y2 = cy + 2 * scale;

      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(x2 + 0.8, y2 + 0.8, r2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x2, y2, r2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x2 - 1 * scale, y2 - 1 * scale, Math.max(1, 1.2 * scale), Math.max(1, 1.2 * scale));
    } else {
      // Sharp crystal/mineral rock
      const w = 9 * scale;
      const h = 9 * scale;
      const ox = cx - w / 2;
      const oy = cy - h / 2;

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(ox + 2 * scale, oy + 2 * scale, w - 2 * scale, h - 2 * scale);

      ctx.fillStyle = '#4b5563';
      ctx.fillRect(ox, oy + 1 * scale, w - 1 * scale, h - 2 * scale);

      ctx.fillStyle = '#6b7280';
      ctx.fillRect(ox, oy, w - 1.5 * scale, h - 1.5 * scale);

      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(ox, oy, w - 3 * scale, Math.max(1, 2 * scale));
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(ox + 1 * scale, oy, Math.max(1, 2 * scale), Math.max(1, 1 * scale));
    }

    ctx.restore();
  }

  /**
   * Draw a pixel-art Building (HOUSE, STORAGE, TOWN_HALL)
   */
  public static drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: Building,
    screenX: number,
    screenY: number,
    zoom: number,
    isSelected: boolean,
    kingdomColor?: string
  ): void {
    const scale = zoom / 16;
    const w = building.width * zoom;
    const h = building.height * zoom;
    const cx = screenX + w / 2;
    const cy = screenY + h / 2;

    ctx.save();

    // 1. Drop shadow under building
    ctx.fillStyle = 'rgba(15, 25, 20, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, screenY + h - 2 * scale, (w / 2) + 2 * scale, (h / 3) * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Selection outline
    if (isSelected) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = Math.max(2, 2.5 * scale);
      ctx.strokeRect(screenX - 2 * scale, screenY - 2 * scale, w + 4 * scale, h + 4 * scale);
    }

    if (!building.isCompleted) {
      // IN-CONSTRUCTION SCAFFOLDING
      const p = building.constructionProgress;

      // Foundation outline
      ctx.fillStyle = '#78350f';
      ctx.fillRect(screenX + 2 * scale, screenY + h - 6 * scale, w - 4 * scale, 5 * scale);

      // Scaffolding poles
      ctx.fillStyle = '#b45309';
      ctx.fillRect(screenX + 4 * scale, screenY + 4 * scale, 2 * scale, h - 8 * scale);
      ctx.fillRect(screenX + w - 6 * scale, screenY + 4 * scale, 2 * scale, h - 8 * scale);
      ctx.fillRect(screenX + w / 2 - 1 * scale, screenY + 2 * scale, 2 * scale, h - 6 * scale);

      // Horizontal beams
      ctx.fillStyle = '#92400e';
      ctx.fillRect(screenX + 3 * scale, screenY + h / 2, w - 6 * scale, 2 * scale);
      ctx.fillRect(screenX + 4 * scale, screenY + 8 * scale, w - 8 * scale, 2 * scale);

      // Progress bar over construction site
      const barW = Math.max(20, w * 0.7);
      const barH = 4 * scale;
      const barX = cx - barW / 2;
      const barY = screenY - 6 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(barX, barY, barW * p, barH);

      ctx.restore();
      return;
    }

    // COMPLETED BUILDINGS:
    if (building.type === 'HOUSE') {
      // 2x2 Cottage
      const bx = screenX + 2 * scale;
      const by = screenY + 4 * scale;
      const bw = w - 4 * scale;
      const bh = h - 6 * scale;

      // Stone foundation
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by + bh - 4 * scale, bw, 4 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx + 4 * scale, by + bh - 3 * scale, 6 * scale, 2 * scale);

      // Timber / plaster walls
      ctx.fillStyle = '#fde68a'; // warm plaster
      ctx.fillRect(bx + 1 * scale, by + 8 * scale, bw - 2 * scale, bh - 11 * scale);

      // Wooden corner posts
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx, by + 8 * scale, 2.5 * scale, bh - 11 * scale);
      ctx.fillRect(bx + bw - 2.5 * scale, by + 8 * scale, 2.5 * scale, bh - 11 * scale);

      // Thatched / tiled roof
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.lineTo(bx - 2 * scale, by + 9 * scale);
      ctx.lineTo(bx + bw + 2 * scale, by + 9 * scale);
      ctx.closePath();
      ctx.fill();

      // Roof ridge & texture
      ctx.fillStyle = '#d97706';
      ctx.fillRect(bx + 2 * scale, by + 4 * scale, bw - 4 * scale, 2 * scale);

      // Wooden Door
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 2.5 * scale, by + bh - 6 * scale, 5 * scale, 6 * scale);
      ctx.fillStyle = '#facc15'; // handle
      ctx.fillRect(cx + 1 * scale, by + bh - 3 * scale, 1 * scale, 1 * scale);

      // Window with warm lantern light
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + 3 * scale, by + 10 * scale, 3.5 * scale, 3.5 * scale);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 3.5 * scale, by + 10.5 * scale, 2.5 * scale, 2.5 * scale);

      // Chimney & smoke
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx + bw - 5 * scale, by - 2 * scale, 3 * scale, 6 * scale);
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      ctx.beginPath();
      ctx.arc(bx + bw - 3.5 * scale, by - 5 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (building.type === 'STORAGE') {
      // 2x2 Storehouse
      const bx = screenX + 2 * scale;
      const by = screenY + 4 * scale;
      const bw = w - 4 * scale;
      const bh = h - 6 * scale;

      // Heavy timber walls
      ctx.fillStyle = '#92400e';
      ctx.fillRect(bx, by + 6 * scale, bw, bh - 6 * scale);

      // Horizontal wood planks
      ctx.fillStyle = '#78350f';
      for (let py = by + 9 * scale; py < by + bh - 2 * scale; py += 3.5 * scale) {
        ctx.fillRect(bx, py, bw, 1 * scale);
      }

      // Slate / wood tile roof
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(cx, by + 1 * scale);
      ctx.lineTo(bx - 2 * scale, by + 7 * scale);
      ctx.lineTo(bx + bw + 2 * scale, by + 7 * scale);
      ctx.closePath();
      ctx.fill();

      // Double barn doors with iron hinges
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 4 * scale, by + bh - 8 * scale, 8 * scale, 8 * scale);
      ctx.fillStyle = '#0f172a'; // iron hinges
      ctx.fillRect(cx - 3.5 * scale, by + bh - 6 * scale, 7 * scale, 1 * scale);
      ctx.fillRect(cx - 3.5 * scale, by + bh - 3 * scale, 7 * scale, 1 * scale);

      // Barrels and Crates outside porch
      ctx.fillStyle = '#b45309'; // crate
      ctx.fillRect(bx + 1 * scale, by + bh - 4 * scale, 3 * scale, 3 * scale);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx + 1.5 * scale, by + bh - 3.5 * scale, 2 * scale, 2 * scale);
    } else {
      // 3x3 TOWN HALL
      const bx = screenX + 4 * scale;
      const by = screenY + 6 * scale;
      const bw = w - 8 * scale;
      const bh = h - 8 * scale;

      // Stone masonry base
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx, by + 10 * scale, bw, bh - 10 * scale);

      // Stone block detail lines
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by + 16 * scale, bw, 1 * scale);
      ctx.fillRect(bx, by + 22 * scale, bw, 1 * scale);

      // Royal Grand Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(cx, by + 3 * scale);
      ctx.lineTo(bx - 3 * scale, by + 11 * scale);
      ctx.lineTo(bx + bw + 3 * scale, by + 11 * scale);
      ctx.closePath();
      ctx.fill();

      // Bell / Clock Tower in center
      const tw = 8 * scale;
      const th = 12 * scale;
      const tx = cx - tw / 2;
      const ty = by - 7 * scale;

      ctx.fillStyle = '#64748b';
      ctx.fillRect(tx, ty, tw, th);

      // Tower roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx, ty - 6 * scale);
      ctx.lineTo(tx - 1 * scale, ty);
      ctx.lineTo(tx + tw + 1 * scale, ty);
      ctx.closePath();
      ctx.fill();

      // Clock / Crest Face
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, ty + 5 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Flying Kingdom Banner / Flag from tower spire!
      const flagColor = kingdomColor || '#ef4444';
      ctx.fillStyle = '#78350f'; // flagpole
      ctx.fillRect(cx - 0.5 * scale, ty - 12 * scale, 1 * scale, 7 * scale);

      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(cx + 0.5 * scale, ty - 12 * scale);
      ctx.lineTo(cx + 7 * scale, ty - 10 * scale);
      ctx.lineTo(cx + 0.5 * scale, ty - 8 * scale);
      ctx.closePath();
      ctx.fill();

      // Grand Arched Double Doors
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(cx, by + bh - 9 * scale, 4 * scale, Math.PI, 0);
      ctx.rect(cx - 4 * scale, by + bh - 9 * scale, 8 * scale, 9 * scale);
      ctx.fill();

      // Golden door handles & crest
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 1 * scale, by + bh - 4 * scale, 2 * scale, 1.5 * scale);
    }

    ctx.restore();
  }

  /**
   * Draw a pixel-art Human character with life stages, professions, and combat animations
   */
  public static drawHuman(
    ctx: CanvasRenderingContext2D,
    human: Human,
    screenX: number,
    screenY: number,
    zoom: number,
    isSelected: boolean,
    kingdomColor?: string
  ): void {
    // Scaling based on life stage
    let lifeScale = 1.0;
    if (human.lifeStage === 'CHILD') lifeScale = 0.65;
    else if (human.lifeStage === 'TEEN') lifeScale = 0.85;
    else if (human.lifeStage === 'ELDER') lifeScale = 0.95;

    const scale = Math.max(0.4, (zoom / 16) * lifeScale);
    const cx = screenX;
    const cy = screenY;

    ctx.save();

    // 1. Selection indicator
    if (isSelected) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4 * scale, 9 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Little yellow marker arrow above head
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16 * scale);
      ctx.lineTo(cx - 3 * scale, cy - 20 * scale);
      ctx.lineTo(cx + 3 * scale, cy - 20 * scale);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Drop shadow
    ctx.fillStyle = 'rgba(15, 30, 15, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, 4.5 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walking bob & swing
    const isMoving =
      human.state === 'WANDERING' ||
      human.state === 'MOVING_TO_RESOURCE' ||
      human.state === 'PATROLLING' ||
      human.state === 'FLEEING' ||
      human.state === 'DELIVERING_RESOURCES';

    const bob = isMoving ? Math.sin(human.walkFrame * 4) * (1 * scale) : 0;
    const legSwing = isMoving ? Math.sin(human.walkFrame * 5) * (2 * scale) : 0;
    const bodyY = cy - 2 * scale + bob;

    // Damage flash override color
    const isFlashing = human.hitFlashTimer > 0;

    // 3. Pants / Legs
    const legWidth = Math.max(1, Math.round(1.6 * scale));
    const legHeight = Math.max(2, Math.round(3.5 * scale));
    ctx.fillStyle = isFlashing ? '#ef4444' : human.colorTheme.pants;

    // Left leg
    ctx.fillRect(cx - 2.2 * scale, bodyY + 3.5 * scale, legWidth, legHeight + (isMoving ? legSwing : 0));
    // Right leg
    ctx.fillRect(cx + 0.6 * scale, bodyY + 3.5 * scale, legWidth, legHeight - (isMoving ? legSwing : 0));

    // 4. Shirt / Torso (Tabard if soldier with kingdom color)
    const torsoW = Math.max(3, Math.round(4.8 * scale));
    const torsoH = Math.max(3, Math.round(4.5 * scale));

    if (isFlashing) {
      ctx.fillStyle = '#fee2e2';
    } else if (human.profession === 'SOLDIER' && kingdomColor) {
      ctx.fillStyle = kingdomColor;
    } else {
      ctx.fillStyle = human.colorTheme.shirt;
    }
    ctx.fillRect(cx - torsoW / 2, bodyY - 1 * scale, torsoW, torsoH);

    // Soldier armor vest
    if (human.profession === 'SOLDIER' && !isFlashing) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - torsoW / 2, bodyY - 0.5 * scale, torsoW, 2 * scale);
    }

    // 5. Head & Skin
    const headW = Math.max(3, Math.round(4.2 * scale));
    const headH = Math.max(3, Math.round(4.0 * scale));
    const headY = bodyY - 5 * scale;
    ctx.fillStyle = isFlashing ? '#fecaca' : human.colorTheme.skin;
    ctx.fillRect(cx - headW / 2, headY, headW, headH);

    // Eyes
    ctx.fillStyle = '#0f172a';
    const eyeSize = Math.max(1, Math.round(1 * scale));
    if (human.facing === 'right') {
      ctx.fillRect(cx + 0.8 * scale, headY + 1.5 * scale, eyeSize, eyeSize);
    } else {
      ctx.fillRect(cx - 1.8 * scale, headY + 1.5 * scale, eyeSize, eyeSize);
    }

    // 6. Hair or Helmet
    if (human.profession === 'SOLDIER') {
      // Iron helmet with nosepiece
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - headW / 2 - 0.5, headY - 1.5 * scale, headW + 1, 2.5 * scale);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 0.5 * scale, headY - 1.5 * scale, 1 * scale, 4 * scale); // nose guard
    } else if (human.profession === 'MINER') {
      // Miner hardhat with lantern
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - headW / 2 - 0.5, headY - 1.5 * scale, headW + 1, 2 * scale);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(human.facing === 'right' ? cx + 1 * scale : cx - 2 * scale, headY - 2 * scale, 2 * scale, 2 * scale);
    } else {
      // Normal hair
      ctx.fillStyle = human.colorTheme.hair;
      ctx.fillRect(cx - headW / 2, headY - 1 * scale, headW, Math.max(1, 1.8 * scale));
      if (human.facing === 'left') {
        ctx.fillRect(cx + headW / 2 - 1 * scale, headY, Math.max(1, 1 * scale), 2 * scale);
      } else {
        ctx.fillRect(cx - headW / 2, headY, Math.max(1, 1 * scale), 2 * scale);
      }
    }

    // 7. Gathering animation & Tool
    if (human.state === 'GATHERING') {
      const swingAngle = Math.sin(human.gatherProgress * Math.PI * 6) * 0.8;
      const toolX = human.facing === 'right' ? cx + 3.5 * scale : cx - 3.5 * scale;
      const toolY = bodyY + 1 * scale;

      ctx.save();
      ctx.translate(toolX, toolY);
      ctx.rotate(human.facing === 'right' ? swingAngle : -swingAngle);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, -5 * scale, Math.max(1, 1.2 * scale), 6 * scale);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5 * scale, -6 * scale, 4 * scale, 2 * scale);

      ctx.restore();
    }

    // 8. Building animation & Hammer
    if (human.state === 'BUILDING') {
      const hammerAngle = Math.sin(human.buildProgress * Math.PI * 8) * 0.9;
      const toolX = human.facing === 'right' ? cx + 3.5 * scale : cx - 3.5 * scale;
      const toolY = bodyY + 1 * scale;

      ctx.save();
      ctx.translate(toolX, toolY);
      ctx.rotate(human.facing === 'right' ? hammerAngle : -hammerAngle);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, -4 * scale, 1.2 * scale, 5 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2 * scale, -5 * scale, 4 * scale, 2 * scale);

      ctx.restore();
    }

    // 9. Soldier Sword & Shield & Attack Animation
    if (human.profession === 'SOLDIER') {
      // Shield on off-hand
      const shieldX = human.facing === 'right' ? cx - 3.5 * scale : cx + 2.5 * scale;
      ctx.fillStyle = kingdomColor || '#3b82f6';
      ctx.beginPath();
      ctx.arc(shieldX, bodyY + 1 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sword in main hand
      const swordX = human.facing === 'right' ? cx + 3.5 * scale : cx - 3.5 * scale;
      const isAttacking = human.isAttackingAnim > 0;
      const swordAngle = isAttacking ? (human.facing === 'right' ? 1.2 : -1.2) : 0;

      ctx.save();
      ctx.translate(swordX, bodyY + 1 * scale);
      ctx.rotate(swordAngle);

      ctx.fillStyle = '#cbd5e1'; // blade
      ctx.fillRect(0, -7 * scale, 1.5 * scale, 7 * scale);
      ctx.fillStyle = '#eab308'; // guard
      ctx.fillRect(-1.5 * scale, -1 * scale, 4 * scale, 1.5 * scale);

      ctx.restore();

      // Melee attack slash visual arc!
      if (isAttacking) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        const startA = human.facing === 'right' ? -0.4 : Math.PI - 0.8;
        const endA = human.facing === 'right' ? 0.8 : Math.PI + 0.4;
        ctx.arc(cx + (human.facing === 'right' ? 5 * scale : -5 * scale), bodyY, 6 * scale, startA, endA);
        ctx.stroke();
      }
    }

    // 10. Health Bar (if damaged or soldier or selected)
    if (human.health < human.maxHealth || isSelected || human.profession === 'SOLDIER') {
      const barW = 10 * scale;
      const barH = 2 * scale;
      const barX = cx - barW / 2;
      const barY = headY - 4 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

      const healthFrac = Math.max(0, human.health / human.maxHealth);
      ctx.fillStyle = healthFrac > 0.5 ? '#22c55e' : healthFrac > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * healthFrac, barH);
    }

    ctx.restore();
  }
}
