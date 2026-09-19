import { ResourceType, ResourceNode, CarcassEntity, ShipEntity, CaravanEntity, RoadType } from '../types';
import { Human } from '../entities/Human';
import { Building } from '../buildings/Building';
import { Animal } from '../entities/Animal';
import { Ship } from '../seafaring/Ship';

/**
 * Procedural Pixel Art Renderers for Canvas 2D
 */
export class PixelSprites {
  /**
   * Draw a stylized pixel-art berry bush
   */
  public static drawBerryBush(
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

    // 1. Ground shadow
    ctx.fillStyle = 'rgba(15, 35, 15, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3.5 * scale, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Bush foliage clump
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(cx - 1.2 * scale, cy - 1 * scale, 3.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx - 1.8 * scale, cy - 1.8 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 3. Berries (if has berries)
    const berryCount = res.berryCount ?? 4;
    if (berryCount > 0) {
      const berryPositions = [
        { x: cx - 2 * scale, y: cy - 1 * scale },
        { x: cx + 1 * scale, y: cy - 2 * scale },
        { x: cx + 2 * scale, y: cy + 1 * scale },
        { x: cx - 1 * scale, y: cy + 1.5 * scale },
        { x: cx, y: cy - 0.5 * scale },
      ];

      for (let i = 0; i < Math.min(berryCount, berryPositions.length); i++) {
        const bp = berryPositions[i];
        ctx.fillStyle = '#dc2626'; // vibrant red berry
        ctx.fillRect(bp.x, bp.y, Math.max(1, 1.8 * scale), Math.max(1, 1.8 * scale));
        ctx.fillStyle = '#fca5a5'; // glint highlight
        ctx.fillRect(bp.x, bp.y, Math.max(1, 0.8 * scale), Math.max(1, 0.8 * scale));
      }
    }

    ctx.restore();
  }
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
    } else if (building.type === 'FARM') {
      // 2x2 Farm Field
      const bx = screenX + 1 * scale;
      const by = screenY + 1 * scale;
      const bw = w - 2 * scale;
      const bh = h - 2 * scale;

      // Tilled dirt field
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx, by, bw, bh);

      // Furrows & soil ridges
      ctx.fillStyle = '#451a03';
      for (let fy = by + 2 * scale; fy < by + bh - 1 * scale; fy += 3 * scale) {
        ctx.fillRect(bx, fy, bw, 1 * scale);
      }

      // Crop stalks based on stage
      const stage = building.cropStage || 'GROWING';
      const cropColor = stage === 'READY' ? '#eab308' : stage === 'GROWING' ? '#84cc16' : '#65a30d';

      for (let fx = bx + 2 * scale; fx < bx + bw - 2 * scale; fx += 3.5 * scale) {
        for (let fy = by + 2 * scale; fy < by + bh - 2 * scale; fy += 3.5 * scale) {
          ctx.fillStyle = cropColor;
          if (stage === 'READY') {
            // Golden full wheat stalks
            ctx.fillRect(fx, fy - 2 * scale, 1.5 * scale, 4 * scale);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(fx - 0.5 * scale, fy - 3 * scale, 2.5 * scale, 2 * scale);
          } else {
            // Growing green sprout
            ctx.fillRect(fx, fy, 1.5 * scale, 2.5 * scale);
          }
        }
      }

      // Small scarecrow in corner
      ctx.fillStyle = '#78350f'; // stick
      ctx.fillRect(bx + bw - 4 * scale, by + 1 * scale, 1 * scale, 5 * scale);
      ctx.fillRect(bx + bw - 5.5 * scale, by + 2.5 * scale, 4 * scale, 0.8 * scale);
      ctx.fillStyle = '#ef4444'; // hat/shirt
      ctx.fillRect(bx + bw - 4.5 * scale, by + 1.5 * scale, 2 * scale, 2 * scale);
    } else if (building.type === 'ANIMAL_PEN') {
      // 2x2 Animal Pasture / Pen
      const bx = screenX + 1 * scale;
      const by = screenY + 1 * scale;
      const bw = w - 2 * scale;
      const bh = h - 2 * scale;

      // Straw & trodden pasture ground
      ctx.fillStyle = '#65a30d'; // grass base
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#d97706'; // straw patch
      ctx.fillRect(bx + 3 * scale, by + 3 * scale, bw - 6 * scale, bh - 6 * scale);

      // Wooden fence perimeter with gate
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8 * scale;
      ctx.strokeRect(bx + 1 * scale, by + 1 * scale, bw - 2 * scale, bh - 2 * scale);

      // Fence posts at corners and edges
      ctx.fillStyle = '#451a03';
      const posts = [
        { x: bx + 1 * scale, y: by + 1 * scale },
        { x: bx + bw - 2 * scale, y: by + 1 * scale },
        { x: bx + 1 * scale, y: by + bh - 2 * scale },
        { x: bx + bw - 2 * scale, y: by + bh - 2 * scale },
        { x: cx, y: by + 1 * scale },
      ];
      for (const pt of posts) {
        ctx.fillRect(pt.x - 1 * scale, pt.y - 1 * scale, 2 * scale, 2 * scale);
      }

      // Feeding trough
      ctx.fillStyle = '#92400e';
      ctx.fillRect(bx + 3 * scale, by + bh - 5 * scale, 6 * scale, 2.5 * scale);
      ctx.fillStyle = '#fef08a'; // hay inside trough
      ctx.fillRect(bx + 3.5 * scale, by + bh - 4.5 * scale, 5 * scale, 1.5 * scale);
    } else if (building.type === 'WATCHTOWER') {
      // 2x2 Tall Stone Watchtower
      const bx = screenX + 3 * scale;
      const by = screenY + 2 * scale;
      const bw = w - 6 * scale;
      const bh = h - 4 * scale;

      // Tall Stone Tower Shaft
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx, by + 4 * scale, bw, bh - 4 * scale);

      // Stone brick lines
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by + 9 * scale, bw, 1 * scale);
      ctx.fillRect(bx, by + 14 * scale, bw, 1 * scale);
      ctx.fillRect(bx, by + 19 * scale, bw, 1 * scale);

      // Arrow slits
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 0.8 * scale, by + 7 * scale, 1.6 * scale, 4 * scale);
      ctx.fillRect(cx - 0.8 * scale, by + 13 * scale, 1.6 * scale, 4 * scale);

      // Top Wooden Guard Balcony & Crenellations
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx - 2 * scale, by + 1 * scale, bw + 4 * scale, 3 * scale);
      // Balcony railings
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 2 * scale, by - 1 * scale, 1.5 * scale, 2.5 * scale);
      ctx.fillRect(cx - 0.7 * scale, by - 1 * scale, 1.5 * scale, 2.5 * scale);
      ctx.fillRect(bx + bw + 0.5 * scale, by - 1 * scale, 1.5 * scale, 2.5 * scale);

      // Kingdom Pennant Flag fluttering
      const flagColor = kingdomColor || '#ef4444';
      ctx.fillStyle = '#451a03'; // flagpole
      ctx.fillRect(cx - 0.5 * scale, by - 8 * scale, 1 * scale, 7 * scale);
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(cx + 0.5 * scale, by - 8 * scale);
      ctx.lineTo(cx + 6 * scale, by - 6 * scale);
      ctx.lineTo(cx + 0.5 * scale, by - 4 * scale);
      ctx.closePath();
      ctx.fill();
    } else if (building.type === 'DEFENSIVE_WALL') {
      // 1x1 Defensive Stone Wall Segment
      const bx = screenX + 1 * scale;
      const by = screenY + 2 * scale;
      const bw = w - 2 * scale;
      const bh = h - 3 * scale;

      // Heavy stone block wall
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by + 3 * scale, bw, bh - 3 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx, by + bh - 2 * scale, bw, 2 * scale);

      // Crenellations (battlements) on top
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by, 3.5 * scale, 3 * scale);
      ctx.fillRect(bx + bw - 3.5 * scale, by, 3.5 * scale, 3 * scale);

      // Iron studs / arrow loop
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 0.6 * scale, by + 4 * scale, 1.2 * scale, 2.5 * scale);
    } else if (building.type === 'BLACKSMITH') {
      // 2x2 Forge & Armory
      const bx = screenX + 2 * scale;
      const by = screenY + 4 * scale;
      const bw = w - 4 * scale;
      const bh = h - 6 * scale;

      // Dark stone masonry workshop
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by + 6 * scale, bw, bh - 6 * scale);

      // Stone tiled roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(cx, by + 1 * scale);
      ctx.lineTo(bx - 2 * scale, by + 7 * scale);
      ctx.lineTo(bx + bw + 2 * scale, by + 7 * scale);
      ctx.closePath();
      ctx.fill();

      // Stone chimney puffing smoke
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx + 2 * scale, by - 4 * scale, 3 * scale, 8 * scale);
      ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
      const smokeBounce = Math.sin(Date.now() * 0.005) * 1 * scale;
      ctx.beginPath();
      ctx.arc(bx + 3.5 * scale, by - 6 * scale + smokeBounce, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Glowing furnace fire pit inside
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx + 4 * scale, by + bh - 6 * scale, 4 * scale, 4 * scale);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx + 5 * scale, by + bh - 5 * scale, 2 * scale, 2 * scale);

      // Iron Anvil on wooden block outside
      ctx.fillStyle = '#78350f'; // log stand
      ctx.fillRect(bx + bw - 6 * scale, by + bh - 4 * scale, 3.5 * scale, 4 * scale);
      ctx.fillStyle = '#94a3b8'; // iron anvil body
      ctx.fillRect(bx + bw - 7 * scale, by + bh - 6 * scale, 5.5 * scale, 2 * scale);
      ctx.fillStyle = '#cbd5e1'; // horn glint
      ctx.fillRect(bx + bw - 7.5 * scale, by + bh - 6 * scale, 1 * scale, 1 * scale);
    } else if (building.type === 'TEMPLE') {
      // 3x3 Grand Sacred Temple
      const bx = screenX + 3 * scale;
      const by = screenY + 4 * scale;
      const bw = w - 6 * scale;
      const bh = h - 7 * scale;

      // White marble podium / steps
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(bx - 1 * scale, by + bh - 4 * scale, bw + 2 * scale, 4 * scale);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx, by + bh - 6 * scale, bw, 2 * scale);

      // Sanctuary columns / pillars
      ctx.fillStyle = '#e2e8f0';
      const colWidth = 2.5 * scale;
      ctx.fillRect(bx + 2 * scale, by + 8 * scale, colWidth, bh - 14 * scale);
      ctx.fillRect(bx + bw / 2 - colWidth / 2, by + 8 * scale, colWidth, bh - 14 * scale);
      ctx.fillRect(bx + bw - 2 * scale - colWidth, by + 8 * scale, colWidth, bh - 14 * scale);

      // Grand Triangular Pediment / Roof
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx, by + 3 * scale);
      ctx.lineTo(bx - 2 * scale, by + 9 * scale);
      ctx.lineTo(bx + bw + 2 * scale, by + 9 * scale);
      ctx.closePath();
      ctx.fill();

      // Golden dome or Sacred Altar on top
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, by + 1 * scale, 4.5 * scale, Math.PI, 0, false);
      ctx.fill();

      // Golden spire & radiant divine glow
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 0.7 * scale, by - 6 * scale, 1.4 * scale, 4 * scale);

      // Pulsing divine halo
      const haloAlpha = Math.sin(Date.now() * 0.005) * 0.2 + 0.35;
      ctx.fillStyle = `rgba(56, 189, 248, ${haloAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, by + 1 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (building.type === 'DOCK') {
      // 2x2 Coastal Harbor Dock & Wooden Pier
      const bx = screenX + 1 * scale;
      const by = screenY + 2 * scale;
      const bw = w - 2 * scale;
      const bh = h - 3 * scale;

      // Pier wooden plank decking
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx, by + 2 * scale, bw, bh - 3 * scale);

      // Deck plank seams
      ctx.fillStyle = '#451a03';
      for (let px = bx + 3 * scale; px < bx + bw; px += 3.5 * scale) {
        ctx.fillRect(px, by + 2 * scale, 0.8 * scale, bh - 3 * scale);
      }

      // Wooden pilings / stilts
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bx + 1 * scale, by + bh - 2 * scale, 2 * scale, 3 * scale);
      ctx.fillRect(bx + bw - 3 * scale, by + bh - 2 * scale, 2 * scale, 3 * scale);

      // Mooring bollards & coiled rope
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + 2 * scale, by + 1 * scale, 2 * scale, 2 * scale);
      ctx.fillRect(bx + bw - 4 * scale, by + 1 * scale, 2 * scale, 2 * scale);
      ctx.fillStyle = '#d97706'; // coiled rope
      ctx.beginPath();
      ctx.arc(bx + 3 * scale, by + 4 * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 3x3 TOWN HALL (Default)
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

    // Burning building visual effect
    if (building.onFireTimer && building.onFireTimer > 0) {
      const flameTime = Date.now() * 0.02;
      for (let fi = 0; fi < 3; fi++) {
        const fx = cx + (fi - 1) * 6 * scale;
        const fy = screenY + 4 * scale;
        const fh = (6 + Math.sin(flameTime + fi * 2) * 3) * scale;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(fx, fy - fh / 2, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(fx, fy - fh / 2 - 1 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
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

    // 10. HUNTER: Leather gear, bow/quiver and spear
    if (human.profession === 'HUNTER') {
      const toolX = human.facing === 'right' ? cx + 3.5 * scale : cx - 3.5 * scale;
      // Hunting bow
      ctx.save();
      ctx.translate(toolX, bodyY);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, 4 * scale, -Math.PI / 2.5, Math.PI / 2.5, human.facing !== 'right');
      ctx.stroke();
      // Bow string
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -3.5 * scale);
      ctx.lineTo(0, 3.5 * scale);
      ctx.stroke();
      ctx.restore();

      // Quiver on back
      const backX = human.facing === 'right' ? cx - 2.5 * scale : cx + 2.5 * scale;
      ctx.fillStyle = '#92400e';
      ctx.fillRect(backX - 1 * scale, bodyY - 4 * scale, 2 * scale, 6 * scale);
      // Arrow fletchings
      ctx.fillStyle = '#f87171';
      ctx.fillRect(backX - 0.5 * scale, bodyY - 5.5 * scale, 1 * scale, 1.5 * scale);
    }

    // 11. FARMER: Straw hat and pitchfork/hoe
    if (human.profession === 'FARMER') {
      // Straw hat
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 4.5 * scale, headY - 1 * scale, 9 * scale, 2 * scale);
      ctx.fillRect(cx - 2.5 * scale, headY - 3 * scale, 5 * scale, 2.5 * scale);
      ctx.fillStyle = '#78350f'; // hat band
      ctx.fillRect(cx - 2.5 * scale, headY - 1 * scale, 5 * scale, 0.8 * scale);

      // Pitchfork in hand
      const toolX = human.facing === 'right' ? cx + 3 * scale : cx - 3 * scale;
      ctx.fillStyle = '#78350f'; // shaft
      ctx.fillRect(toolX, bodyY - 3 * scale, 1 * scale, 8 * scale);
      ctx.fillStyle = '#94a3b8'; // prongs
      ctx.fillRect(toolX - 1.5 * scale, bodyY - 4.5 * scale, 4 * scale, 1.5 * scale);
      ctx.fillRect(toolX - 1.5 * scale, bodyY - 6 * scale, 1 * scale, 2 * scale);
      ctx.fillRect(toolX, bodyY - 6 * scale, 1 * scale, 2 * scale);
      ctx.fillRect(toolX + 1.5 * scale, bodyY - 6 * scale, 1 * scale, 2 * scale);
    }

    // 12. HERDER: Shepherd's staff / crook
    if (human.profession === 'HERDER') {
      const staffX = human.facing === 'right' ? cx + 3.5 * scale : cx - 3.5 * scale;
      ctx.fillStyle = '#92400e';
      ctx.fillRect(staffX, bodyY - 4 * scale, 1.2 * scale, 9 * scale);
      // Crook curl
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(staffX + (human.facing === 'right' ? 1.5 * scale : -1.5 * scale), bodyY - 5 * scale, 2 * scale, 0, Math.PI, true);
      ctx.stroke();
    }

    // 13. Eating animation indicator (fresh food bite floating)
    if (human.eatingAnimTimer > 0) {
      const bounce = Math.sin(human.eatingAnimTimer * 0.4) * 2 * scale;
      ctx.fillStyle = '#22c55e'; // food sparkle
      ctx.beginPath();
      ctx.arc(cx + 4 * scale, headY - 4 * scale + bounce, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 3.5 * scale, headY - 4.5 * scale + bounce, 1 * scale, 1 * scale);
    }

    // 14. Starvation Warning indicator (pulsing drumstick / hungry sign)
    if (human.hunger < 25 && human.health > 0) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(cx, headY - 6 * scale, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(8, Math.round(7 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', cx, headY - 6 * scale);
    }

    // 15. Courting & Childbirth indicator (pulsing pink heart and sparkles)
    if (human.state === 'SOCIALIZING' || human.isExpecting || (human.birthTimer && human.birthTimer > 0)) {
      const heartBounce = Math.sin(Date.now() * 0.008) * 2 * scale;
      const hx = cx;
      const hy = headY - 8 * scale + heartBounce;

      // Draw heart
      ctx.fillStyle = '#f43f5e'; // rose-500
      ctx.beginPath();
      const r = 2.2 * scale;
      ctx.arc(hx - r / 2, hy - r / 2, r / 2, Math.PI, 0, false);
      ctx.arc(hx + r / 2, hy - r / 2, r / 2, Math.PI, 0, false);
      ctx.lineTo(hx, hy + r);
      ctx.closePath();
      ctx.fill();

      // Sparkle
      const sparkleAlpha = Math.sin(Date.now() * 0.012) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
      ctx.fillRect(hx + 3 * scale, hy - 4 * scale, 1.2 * scale, 1.2 * scale);
    }

    // 16. Health Bar (if damaged or soldier or selected)
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

    // 17. Warrior Boost: Crimson Blazing Wrath Aura
    if (human.warriorBoostTimer && human.warriorBoostTimer > 0) {
      const flamePulse = Math.sin(Date.now() * 0.015) * 1.5 * scale;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.arc(cx, bodyY, 8 * scale + flamePulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
    }

    // 18. Divine Shield: Radiant Golden Sphere with orbiting runes
    if (human.divineShieldTimer && human.divineShieldTimer > 0) {
      const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * pulse})`;
      ctx.fillStyle = `rgba(254, 240, 138, ${0.25 * pulse})`;
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.beginPath();
      ctx.arc(cx, bodyY, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const ang = (Date.now() * 0.003) % (Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + Math.cos(ang) * 9 * scale - 1, bodyY + Math.sin(ang) * 9 * scale - 1, 2.5 * scale, 2.5 * scale);
      ctx.fillRect(cx - Math.cos(ang) * 9 * scale - 1, bodyY - Math.sin(ang) * 9 * scale - 1, 2.5 * scale, 2.5 * scale);
    }

    // 19. Frozen: Translucent Ice Crystal Block
    if (human.frozenTimer && human.frozenTimer > 0) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 * scale;
      const bw = 12 * scale;
      const bh = 17 * scale;
      ctx.fillRect(cx - bw / 2, bodyY - bh / 2, bw, bh);
      ctx.strokeRect(cx - bw / 2, bodyY - bh / 2, bw, bh);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(cx - bw / 2 + 1.5 * scale, bodyY - bh / 2 + 2 * scale, bw - 3 * scale, 1.5 * scale);
    }

    ctx.restore();
  }

  /**
   * Draw stylized pixel-art animals (DEER, BOAR, WOLF, CHICKEN, COW)
   */
  public static drawAnimal(
    ctx: CanvasRenderingContext2D,
    animal: Animal,
    screenX: number,
    screenY: number,
    zoom: number,
    isSelected: boolean = false
  ): void {
    if (animal.health <= 0) {
      return;
    }

    const scale = zoom / 16;
    const cx = screenX + zoom / 2;
    const cy = screenY + zoom / 2;
    const isRight = animal.facing === 'right';

    ctx.save();

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 3 * scale, 8 * scale, 4 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hit flash red tint
    if (animal.hitFlashTimer > 0) {
      ctx.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(6)';
    }

    // Walk bob
    const bob = Math.sin(animal.walkFrame * Math.PI) * 1 * scale;

    switch (animal.species) {
      case 'CHICKEN': {
        // Chicken shadow
        ctx.fillStyle = 'rgba(20, 25, 20, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3 * scale, 3.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#f97316';
        ctx.fillRect(cx - 1 * scale, cy + 1 * scale, 0.8 * scale, 2.5 * scale);
        ctx.fillRect(cx + 0.5 * scale, cy + 1 * scale, 0.8 * scale, 2.5 * scale);

        // Body
        ctx.fillStyle = animal.isDomesticated ? '#fef08a' : '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 0.5 * scale + bob, 3 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.fillStyle = animal.isDomesticated ? '#eab308' : '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(cx - 0.5 * scale, cy - 0.5 * scale + bob, 1.8 * scale, 1.2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        const hx = isRight ? cx + 2.2 * scale : cx - 2.2 * scale;
        const hy = cy - 2.2 * scale + bob;
        ctx.fillStyle = animal.isDomesticated ? '#fef08a' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(hx, hy, 1.6 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Comb & wattle
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(hx - 0.6 * scale, hy - 2.4 * scale, 1.2 * scale, 1.2 * scale);
        ctx.fillRect(hx + (isRight ? 0.8 : -1.4) * scale, hy + 0.6 * scale, 0.8 * scale, 1 * scale);

        // Beak
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(isRight ? hx + 1.2 * scale : hx - 2 * scale, hy - 0.4 * scale, 1.2 * scale, 0.8 * scale);
        break;
      }

      case 'COW': {
        // Cow shadow
        ctx.fillStyle = 'rgba(20, 25, 20, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4 * scale, 7.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 4.5 * scale, cy + 1 * scale, 1.5 * scale, 3.5 * scale);
        ctx.fillRect(cx - 2 * scale, cy + 1 * scale, 1.5 * scale, 3.5 * scale);
        ctx.fillRect(cx + 1 * scale, cy + 1 * scale, 1.5 * scale, 3.5 * scale);
        ctx.fillRect(cx + 3.5 * scale, cy + 1 * scale, 1.5 * scale, 3.5 * scale);

        // Body (Black & white patched)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 5.5 * scale, cy - 3.5 * scale + bob, 11 * scale, 6 * scale);

        // Dark cow spots
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 4 * scale, cy - 3.5 * scale + bob, 3 * scale, 3 * scale);
        ctx.fillRect(cx + 0.5 * scale, cy - 2 * scale + bob, 3.5 * scale, 4 * scale);

        // Head
        const hx = isRight ? cx + 5 * scale : cx - 7.5 * scale;
        const hy = cy - 4.5 * scale + bob;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(hx, hy, 4 * scale, 4.5 * scale);

        // Snout
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(isRight ? hx + 2.5 * scale : hx - 1.5 * scale, hy + 1.8 * scale, 2.5 * scale, 2.5 * scale);

        // Horns
        ctx.fillStyle = '#d6d3d1';
        ctx.fillRect(isRight ? hx + 0.5 * scale : hx + 2 * scale, hy - 1.5 * scale, 1 * scale, 1.8 * scale);

        // Bell if domesticated
        if (animal.isDomesticated) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(hx + 1 * scale, hy + 4.5 * scale, 1.5 * scale, 1.5 * scale);
        }
        break;
      }

      case 'DEER': {
        // Deer shadow
        ctx.fillStyle = 'rgba(20, 25, 20, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4 * scale, 6 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Graceful slender legs
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 3.5 * scale, cy + 1 * scale, 1 * scale, 4 * scale);
        ctx.fillRect(cx - 1.5 * scale, cy + 1 * scale, 1 * scale, 4 * scale);
        ctx.fillRect(cx + 1.5 * scale, cy + 1 * scale, 1 * scale, 4 * scale);
        ctx.fillRect(cx + 3.5 * scale, cy + 1 * scale, 1 * scale, 4 * scale);

        // Body
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 1 * scale + bob, 5 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // White belly / spots
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 2 * scale, cy + 0.5 * scale + bob, 4 * scale, 1.2 * scale);
        ctx.fillRect(cx - 1 * scale, cy - 2 * scale + bob, 1 * scale, 1 * scale);
        ctx.fillRect(cx + 1 * scale, cy - 1.5 * scale + bob, 1 * scale, 1 * scale);

        // Slender Neck & Head
        const hx = isRight ? cx + 4.5 * scale : cx - 5.5 * scale;
        const hy = cy - 5 * scale + bob;
        ctx.fillStyle = '#b45309';
        ctx.fillRect(isRight ? cx + 2.5 * scale : cx - 4 * scale, cy - 3.5 * scale + bob, 2 * scale, 3.5 * scale);
        ctx.beginPath();
        ctx.arc(hx, hy, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Antlers
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx, hy - 1.5 * scale);
        ctx.lineTo(hx - 1 * scale, hy - 5 * scale);
        ctx.lineTo(hx + 1.5 * scale, hy - 4.5 * scale);
        ctx.stroke();

        // White tail
        const tx = isRight ? cx - 5 * scale : cx + 4.5 * scale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx, cy - 2.5 * scale + bob, 1.5 * scale, 2 * scale);
        break;
      }

      case 'BOAR': {
        // Boar shadow
        ctx.fillStyle = 'rgba(20, 25, 20, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3.5 * scale, 6.5 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sturdy short legs
        ctx.fillStyle = '#292524';
        ctx.fillRect(cx - 3.5 * scale, cy + 1 * scale, 1.4 * scale, 3 * scale);
        ctx.fillRect(cx + 2 * scale, cy + 1 * scale, 1.4 * scale, 3 * scale);

        // Chunky bristly body
        ctx.fillStyle = '#44403c';
        ctx.fillRect(cx - 4.5 * scale, cy - 3 * scale + bob, 8.5 * scale, 5 * scale);

        // Ridge bristles
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(cx - 3 * scale, cy - 4.2 * scale + bob, 6 * scale, 1.5 * scale);

        // Snout
        const hx = isRight ? cx + 4 * scale : cx - 6 * scale;
        const hy = cy - 2 * scale + bob;
        ctx.fillStyle = '#57534e';
        ctx.fillRect(hx, hy, 3 * scale, 3.5 * scale);

        // White Tusks
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(isRight ? hx + 2 * scale : hx - 0.5 * scale, hy + 0.5 * scale, 1 * scale, 1.8 * scale);
        break;
      }

      case 'WOLF': {
        // Wolf shadow
        ctx.fillStyle = 'rgba(20, 25, 20, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3.5 * scale, 6.5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Athletic legs
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 3.5 * scale, cy + 1 * scale, 1.2 * scale, 3.5 * scale);
        ctx.fillRect(cx - 1.5 * scale, cy + 1 * scale, 1.2 * scale, 3.5 * scale);
        ctx.fillRect(cx + 1.5 * scale, cy + 1 * scale, 1.2 * scale, 3.5 * scale);
        ctx.fillRect(cx + 3.5 * scale, cy + 1 * scale, 1.2 * scale, 3.5 * scale);

        // Body
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 4.5 * scale, cy - 2.5 * scale + bob, 8.5 * scale, 4.2 * scale);

        // Light chest
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(isRight ? cx + 1 * scale : cx - 3 * scale, cy - 1 * scale + bob, 2.5 * scale, 2.5 * scale);

        // Snout & Head
        const hx = isRight ? cx + 4 * scale : cx - 6.5 * scale;
        const hy = cy - 3.5 * scale + bob;
        ctx.fillStyle = '#475569';
        ctx.fillRect(hx, hy, 3.5 * scale, 3.5 * scale);

        // Pointed lupine ears
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isRight ? hx + 0.5 * scale : hx + 2 * scale, hy - 2 * scale, 1.2 * scale, 2 * scale);

        // Amber predator eye
        ctx.fillStyle = '#facc15';
        ctx.fillRect(isRight ? hx + 1.8 * scale : hx + 0.8 * scale, hy + 0.8 * scale, 1 * scale, 1 * scale);

        // Bushy tail
        const tx = isRight ? cx - 5.5 * scale : cx + 4.5 * scale;
        ctx.fillStyle = '#334155';
        ctx.fillRect(tx, cy - 1 * scale + bob, 2.5 * scale, 3 * scale);
        break;
      }
    }

    // Animal health bar (if hurt or selected)
    if (animal.health < animal.maxHealth || isSelected) {
      const barW = 8 * scale;
      const barH = 1.5 * scale;
      const barX = cx - barW / 2;
      const barY = cy - 7 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

      const frac = Math.max(0, animal.health / animal.maxHealth);
      ctx.fillStyle = frac > 0.5 ? '#22c55e' : '#ef4444';
      ctx.fillRect(barX, barY, barW * frac, barH);
    }

    // Fleeing indicator
    if (animal.state === 'FLEEING') {
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.max(9, Math.round(8 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, cy - 8 * scale);
    }

    // Mating / Birth indicator
    if (animal.state === 'MATING') {
      const heartBounce = Math.sin(Date.now() * 0.008) * 1.5 * scale;
      const hx = cx;
      const hy = cy - 8 * scale + heartBounce;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      const r = 2 * scale;
      ctx.arc(hx - r / 2, hy - r / 2, r / 2, Math.PI, 0, false);
      ctx.arc(hx + r / 2, hy - r / 2, r / 2, Math.PI, 0, false);
      ctx.lineTo(hx, hy + r);
      ctx.closePath();
      ctx.fill();
    }

    // Divine Shield on animal
    if (animal.divineShieldTimer && animal.divineShieldTimer > 0) {
      const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * pulse})`;
      ctx.fillStyle = `rgba(254, 240, 138, ${0.25 * pulse})`;
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.beginPath();
      ctx.arc(cx, cy, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Frozen on animal
    if (animal.frozenTimer && animal.frozenTimer > 0) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 * scale;
      const bw = 16 * scale;
      const bh = 14 * scale;
      ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(cx - bw / 2 + 1.5 * scale, cy - bh / 2 + 1.5 * scale, bw - 3 * scale, 1.5 * scale);
    }

    ctx.restore();
  }

  /**
   * Draw harvestable animal carcass on ground
   */
  public static drawCarcass(
    ctx: CanvasRenderingContext2D,
    carcass: CarcassEntity,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const scale = zoom / 16;
    const cx = screenX + zoom / 2;
    const cy = screenY + zoom / 2;

    ctx.save();

    // Dark red stain
    ctx.fillStyle = 'rgba(127, 29, 29, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ribcage / bones
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(cx - 3.5 * scale, cy - 1 * scale, 7 * scale, 1.5 * scale);
    ctx.fillRect(cx - 2.5 * scale, cy - 3 * scale, 1.2 * scale, 4 * scale);
    ctx.fillRect(cx, cy - 3.5 * scale, 1.2 * scale, 4.5 * scale);
    ctx.fillRect(cx + 2 * scale, cy - 3 * scale, 1.2 * scale, 4 * scale);

    // Fresh meat chunks
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 1.5 * scale, cy - 0.5 * scale, 3 * scale, 2.5 * scale);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - 0.5 * scale, cy + 0.5 * scale, 2 * scale, 1.5 * scale);

    // Floating meat amount badge
    const meatRemaining = Math.round(carcass.meatAmount);
    if (zoom >= 12 && meatRemaining > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = `${Math.max(7, Math.round(6 * scale))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`🥩 ${meatRemaining}`, cx, cy - 4.5 * scale);
    }

    ctx.restore();
  }

  /**
   * Draw animated pixel fire on a burning terrain tile
   */
  public static drawFireTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    zoom: number,
    intensity: number = 1.0,
    isNapalm: boolean = false,
    animTime: number = 0
  ): void {
    const scale = zoom / 16;
    const cx = screenX + zoom / 2;
    const cy = screenY + zoom / 2;

    ctx.save();

    // 1. Warm ground glow
    ctx.fillStyle = isNapalm ? 'rgba(168, 85, 247, 0.32)' : 'rgba(234, 88, 12, 0.32)';
    ctx.beginPath();
    ctx.arc(cx, cy, 7 * scale * Math.min(1.5, intensity), 0, Math.PI * 2);
    ctx.fill();

    // 2. Multilayer animated pixel flames dancing
    const flicker1 = Math.sin(animTime * 18 + cx * 0.5) * 1.6 * scale;
    const flicker2 = Math.cos(animTime * 22 + cy * 0.5) * 1.4 * scale;
    const flameH = (7 + Math.sin(animTime * 14 + screenX) * 2.5) * scale * Math.min(1.8, intensity);

    // Dark orange / purple base
    ctx.fillStyle = isNapalm ? '#9333ea' : '#ea580c';
    ctx.beginPath();
    ctx.moveTo(cx - 5 * scale, cy + 4 * scale);
    ctx.quadraticCurveTo(cx - 3 * scale + flicker1, cy - flameH * 0.5, cx, cy - flameH);
    ctx.quadraticCurveTo(cx + 3 * scale + flicker2, cy - flameH * 0.5, cx + 5 * scale, cy + 4 * scale);
    ctx.closePath();
    ctx.fill();

    // Bright yellow / violet inner core
    ctx.fillStyle = isNapalm ? '#c084fc' : '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx - 3 * scale, cy + 3 * scale);
    ctx.quadraticCurveTo(cx - 1.5 * scale + flicker2, cy - flameH * 0.35, cx, cy - flameH * 0.7);
    ctx.quadraticCurveTo(cx + 1.5 * scale + flicker1, cy - flameH * 0.35, cx + 3 * scale, cy + 3 * scale);
    ctx.closePath();
    ctx.fill();

    // Pure white core tip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1 * scale, cy - flameH * 0.4, 2 * scale, 3 * scale);

    ctx.restore();
  }

  /**
   * Draw road overlay on a tile (DIRT footpath or PAVED stone cobblestone)
   */
  public static drawRoad(
    ctx: CanvasRenderingContext2D,
    type: RoadType,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    if (type === 'NONE') return;

    ctx.save();
    const scale = zoom / 16;

    if (type === 'DIRT') {
      // Worn dirt trail
      ctx.fillStyle = 'rgba(120, 75, 40, 0.65)';
      ctx.fillRect(screenX + 2 * scale, screenY + 2 * scale, zoom - 4 * scale, zoom - 4 * scale);

      // Organic trodden edges
      ctx.fillStyle = 'rgba(90, 55, 25, 0.45)';
      ctx.fillRect(screenX + 3 * scale, screenY + 4 * scale, zoom - 6 * scale, zoom - 8 * scale);

      // Pebble specks
      ctx.fillStyle = 'rgba(215, 185, 145, 0.7)';
      ctx.fillRect(screenX + 4 * scale, screenY + 5 * scale, 1.5 * scale, 1.5 * scale);
      ctx.fillRect(screenX + zoom - 6 * scale, screenY + zoom - 7 * scale, 1.5 * scale, 1.5 * scale);
    } else if (type === 'PAVED') {
      // Paved stone cobblestone road
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX + 1 * scale, screenY + 1 * scale, zoom - 2 * scale, zoom - 2 * scale);

      // Mortar groove lines
      ctx.fillStyle = '#334155';
      const midX = screenX + zoom / 2;
      const midY = screenY + zoom / 2;
      ctx.fillRect(screenX + 1 * scale, midY - 0.5 * scale, zoom - 2 * scale, 1 * scale);
      ctx.fillRect(midX - 0.5 * scale, screenY + 1 * scale, 1 * scale, zoom - 2 * scale);

      // Cobblestone stone bevel highlights
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(screenX + 2 * scale, screenY + 2 * scale, (zoom / 2) - 3 * scale, 1.2 * scale);
      ctx.fillRect(midX + 1 * scale, midY + 1 * scale, (zoom / 2) - 3 * scale, 1.2 * scale);
    }

    ctx.restore();
  }

  /**
   * Draw sailing ships (FISHING_BOAT, TRADE_SHIP, TRANSPORT_SHIP)
   */
  public static drawShip(
    ctx: CanvasRenderingContext2D,
    ship: ShipEntity,
    screenX: number,
    screenY: number,
    zoom: number,
    kingdomColor?: string
  ): void {
    const scale = Math.max(0.4, zoom / 16);
    const cx = screenX;
    const cy = screenY;

    ctx.save();

    // 1. Water foam ripples & wake
    const waveTime = Date.now() * 0.006;
    const wakePulse = Math.sin(waveTime + cx * 0.1) * 1.5 * scale;
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.65)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * scale, (12 + wakePulse) * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    const isFacingLeft = ship.facing === 'left';
    const flip = isFacingLeft ? -1 : 1;

    // 2. Hull size by ship type
    let hullLength = 20 * scale;
    let hullHeight = 7 * scale;
    if (ship.type === 'FISHING_BOAT') {
      hullLength = 14 * scale;
      hullHeight = 5 * scale;
    } else if (ship.type === 'TRANSPORT_SHIP') {
      hullLength = 26 * scale;
      hullHeight = 9 * scale;
    }

    // Wooden Hull with curved prow and stern
    ctx.fillStyle = '#78350f'; // rich timber brown
    ctx.beginPath();
    ctx.moveTo(cx - (hullLength / 2) * flip, cy);
    ctx.lineTo(cx + (hullLength / 2 - 2 * scale) * flip, cy);
    ctx.quadraticCurveTo(cx + (hullLength / 2 + 4 * scale) * flip, cy + 2 * scale, cx + (hullLength / 2) * flip, cy + hullHeight);
    ctx.lineTo(cx - (hullLength / 2 - 2 * scale) * flip, cy + hullHeight);
    ctx.quadraticCurveTo(cx - (hullLength / 2 + 3 * scale) * flip, cy + 2 * scale, cx - (hullLength / 2) * flip, cy);
    ctx.closePath();
    ctx.fill();

    // Dark timber gunwale rail
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Deck plank lines
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx - (hullLength / 2 - 3 * scale), cy + 1 * scale, hullLength - 6 * scale, 2 * scale);

    // 3. Central Mast
    const mastH = ship.type === 'FISHING_BOAT' ? 14 * scale : ship.type === 'TRANSPORT_SHIP' ? 22 * scale : 18 * scale;
    const mastX = cx + (ship.type === 'TRANSPORT_SHIP' ? -2 * scale * flip : 0);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(mastX - 1 * scale, cy - mastH, 2 * scale, mastH + 2 * scale);

    // Crossyard spar
    const yardW = ship.type === 'FISHING_BOAT' ? 10 * scale : 16 * scale;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(mastX - yardW / 2, cy - mastH + 3 * scale, yardW, 1.5 * scale);

    // Rigging ropes
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.moveTo(mastX, cy - mastH);
    ctx.lineTo(cx - (hullLength / 2 - 2 * scale), cy);
    ctx.moveTo(mastX, cy - mastH);
    ctx.lineTo(cx + (hullLength / 2 - 2 * scale), cy);
    ctx.stroke();

    // 4. White Canvas Sail with Kingdom Stripe / Heraldry
    const sailW = yardW - 2 * scale;
    const sailH = mastH - 6 * scale;
    const billow = Math.sin(waveTime) * 1.5 * scale;

    ctx.fillStyle = '#f8fafc'; // clean canvas
    ctx.beginPath();
    ctx.moveTo(mastX - sailW / 2, cy - mastH + 3 * scale);
    ctx.quadraticCurveTo(mastX + billow, cy - mastH / 2, mastX - sailW / 2, cy - 3 * scale);
    ctx.lineTo(mastX + sailW / 2, cy - 3 * scale);
    ctx.quadraticCurveTo(mastX + sailW / 2 + billow, cy - mastH / 2, mastX + sailW / 2, cy - mastH + 3 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8 * scale;
    ctx.stroke();

    // Kingdom Heraldic Crest / Colored Stripe on Sail
    const flagColor = kingdomColor || '#38bdf8';
    ctx.fillStyle = flagColor;
    ctx.fillRect(mastX - 2 * scale, cy - mastH + 6 * scale, 4 * scale, sailH - 5 * scale);

    // 5. Type-Specific Details:
    if (ship.type === 'FISHING_BOAT') {
      // Fishing net draped over side
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8 * scale;
      ctx.strokeRect(cx + 2 * scale * flip, cy + 2 * scale, 5 * scale, 4 * scale);
    } else if (ship.type === 'TRADE_SHIP') {
      // Cargo crates & barrels on deck
      ctx.fillStyle = '#b45309'; // crate
      ctx.fillRect(cx - 5 * scale, cy - 2 * scale, 3.5 * scale, 3.5 * scale);
      ctx.fillStyle = '#451a03'; // barrel
      ctx.fillRect(cx + 2 * scale, cy - 2.5 * scale, 3 * scale, 4 * scale);
    } else if (ship.type === 'TRANSPORT_SHIP') {
      // Forecastle & sterncastle with crenellations
      ctx.fillStyle = '#92400e';
      ctx.fillRect(cx - (hullLength / 2) * flip, cy - 3 * scale, 5 * scale, 4 * scale);
      ctx.fillRect(cx + (hullLength / 2 - 5 * scale) * flip, cy - 4 * scale, 5 * scale, 5 * scale);

      // Soldiers' shields mounted on railing
      const shieldCols = [flagColor, '#f59e0b', flagColor];
      shieldCols.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + (idx * 4 - 4) * scale, cy + 1.5 * scale, 1.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.6 * scale;
        ctx.stroke();
      });
    }

    // 6. Mast top pennant flag
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(mastX, cy - mastH);
    ctx.lineTo(mastX + 6 * scale * flip, cy - mastH + 2 * scale);
    ctx.lineTo(mastX, cy - mastH + 4 * scale);
    ctx.closePath();
    ctx.fill();

    // 7. Health bar if damaged
    if (ship.health < ship.maxHealth) {
      const barW = 14 * scale;
      const barH = 2 * scale;
      const barX = cx - barW / 2;
      const barY = cy - mastH - 4 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

      const frac = Math.max(0, ship.health / ship.maxHealth);
      ctx.fillStyle = frac > 0.5 ? '#22c55e' : frac > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * frac, barH);
    }

    ctx.restore();
  }

  /**
   * Draw merchant trade caravan (pack donkey / wooden cart)
   */
  public static drawCaravan(
    ctx: CanvasRenderingContext2D,
    caravan: CaravanEntity,
    screenX: number,
    screenY: number,
    zoom: number
  ): void {
    const scale = Math.max(0.4, zoom / 16);
    const cx = screenX;
    const cy = screenY;

    ctx.save();

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 30, 15, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3 * scale, 7 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden handcart / wagon
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 5 * scale, cy - 3 * scale, 8 * scale, 5 * scale);

    // Cart wheels
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(cx - 3 * scale, cy + 2.5 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.arc(cx + 2 * scale, cy + 2.5 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Goods inside cart: sacks & crates
    ctx.fillStyle = '#f59e0b'; // grain sack
    ctx.beginPath();
    ctx.arc(cx - 2 * scale, cy - 4 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b45309'; // wood crate
    ctx.fillRect(cx, cy - 6 * scale, 3.5 * scale, 3.5 * scale);

    // Merchant leading the cart
    ctx.fillStyle = '#1e293b'; // merchant cloak
    ctx.fillRect(cx + 4 * scale, cy - 5 * scale, 3 * scale, 6 * scale);
    ctx.fillStyle = '#fed7aa'; // head
    ctx.beginPath();
    ctx.arc(cx + 5.5 * scale, cy - 6.5 * scale, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw flying arrow projectile from archers and watchtowers
   */
  public static drawArrow(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    zoom: number
  ): void {
    const scale = Math.max(0.5, zoom / 16);
    const angle = Math.atan2(ty - sy, tx - sx);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6 * scale, -0.7 * scale, 12 * scale, 1.4 * scale);

    // Arrowhead (steel tip)
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(6 * scale, 0);
    ctx.lineTo(3 * scale, -2 * scale);
    ctx.lineTo(3 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();

    // Fletchings (feathers)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-6 * scale, -2 * scale, 2.5 * scale, 1.2 * scale);
    ctx.fillRect(-6 * scale, 0.8 * scale, 2.5 * scale, 1.2 * scale);

    ctx.restore();
  }
}

