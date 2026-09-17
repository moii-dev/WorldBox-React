import { CameraState } from '../types';

export class Camera {
  public x: number; // center world coordinate in tiles
  public y: number;
  public zoom: number; // pixel size per tile
  public readonly minZoom: number;
  public readonly maxZoom: number;

  constructor(
    startX: number = 128,
    startY: number = 128,
    initialZoom: number = 16,
    minZoom: number = 4,
    maxZoom: number = 48
  ) {
    this.x = startX;
    this.y = startY;
    this.zoom = initialZoom;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
  }

  public getState(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    };
  }

  public setPosition(x: number, y: number, worldWidth: number, worldHeight: number): void {
    // Keep camera within world bounds with some margin
    const margin = 20;
    this.x = Math.max(-margin, Math.min(worldWidth + margin, x));
    this.y = Math.max(-margin, Math.min(worldHeight + margin, y));
  }

  public moveBy(dxTiles: number, dyTiles: number, worldWidth: number, worldHeight: number): void {
    this.setPosition(this.x + dxTiles, this.y + dyTiles, worldWidth, worldHeight);
  }

  /**
   * Zoom centered at a screen point (e.g. mouse cursor)
   */
  public zoomAt(
    screenX: number,
    screenY: number,
    zoomDelta: number,
    canvasWidth: number,
    canvasHeight: number,
    worldWidth: number,
    worldHeight: number
  ): void {
    // Current world position under cursor
    const worldBefore = this.screenToWorld(screenX, screenY, canvasWidth, canvasHeight);

    // Apply zoom
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + zoomDelta));
    if (newZoom === this.zoom) return;

    this.zoom = newZoom;

    // Adjust camera position so that the point under the cursor remains invariant
    const worldAfter = this.screenToWorld(screenX, screenY, canvasWidth, canvasHeight);
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;

    this.setPosition(this.x, this.y, worldWidth, worldHeight);
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    const halfW = canvasWidth / 2;
    const halfH = canvasHeight / 2;

    const tileX = (screenX - halfW) / this.zoom + this.x;
    const tileY = (screenY - halfH) / this.zoom + this.y;

    return { x: tileX, y: tileY };
  }

  public worldToScreen(
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { screenX: number; screenY: number } {
    const halfW = canvasWidth / 2;
    const halfH = canvasHeight / 2;

    const screenX = (worldX - this.x) * this.zoom + halfW;
    const screenY = (worldY - this.y) * this.zoom + halfH;

    return { screenX, screenY };
  }

  /**
   * Returns visible tile bounding box
   */
  public getVisibleBounds(
    canvasWidth: number,
    canvasHeight: number,
    worldWidth: number,
    worldHeight: number
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    const topLeft = this.screenToWorld(0, 0, canvasWidth, canvasHeight);
    const bottomRight = this.screenToWorld(canvasWidth, canvasHeight, canvasWidth, canvasHeight);

    // Add 1 tile margin for smooth rendering
    const minX = Math.max(0, Math.floor(topLeft.x) - 1);
    const minY = Math.max(0, Math.floor(topLeft.y) - 1);
    const maxX = Math.min(worldWidth - 1, Math.ceil(bottomRight.x) + 1);
    const maxY = Math.min(worldHeight - 1, Math.ceil(bottomRight.y) + 1);

    return { minX, minY, maxX, maxY };
  }
}
