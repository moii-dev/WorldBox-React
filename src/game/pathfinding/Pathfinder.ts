import { World } from '../world/World';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: PathNode | null;
}

class FastMinHeap {
  private data: PathNode[] = [];

  public get size(): number {
    return this.data.length;
  }

  public clear(): void {
    this.data.length = 0;
  }

  public push(node: PathNode): void {
    this.data.push(node);
    this.up(this.data.length - 1);
  }

  public pop(): PathNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.down(0);
    }
    return top;
  }

  private up(i: number): void {
    const item = this.data[i];
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].f <= item.f) break;
      this.data[i] = this.data[p];
      i = p;
    }
    this.data[i] = item;
  }

  private down(i: number): void {
    const len = this.data.length;
    const item = this.data[i];
    const half = len >> 1;
    while (i < half) {
      let child = (i << 1) + 1;
      const right = child + 1;
      if (right < len && this.data[right].f < this.data[child].f) {
        child = right;
      }
      if (this.data[child].f >= item.f) break;
      this.data[i] = this.data[child];
      i = child;
    }
    this.data[i] = item;
  }
}

export class Pathfinder {
  private static readonly CARDINAL_DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  // Reusable static buffers to avoid GC churn during pathfinding
  private static visitedMap: Uint32Array | null = null;
  private static bestGMap: Float32Array | null = null;
  private static bestGIteration: Uint32Array | null = null;
  private static currentIteration: number = 0;
  private static openHeap: FastMinHeap = new FastMinHeap();

  public static clearCache(): void {
    this.visitedMap = null;
    this.bestGMap = null;
    this.bestGIteration = null;
    this.currentIteration = 0;
    this.openHeap.clear();
  }

  /**
   * Fast budget-limited A* search to a target tile with zero GC allocations in the search loop
   */
  public static findPath(
    world: World,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    maxBudget: number = 160
  ): { x: number; y: number }[] | null {
    // If start is outside or unwalkable, cannot path
    if (!world.isWalkable(startX, startY)) return null;

    // If target is unwalkable, check adjacent neighbors to see if any are walkable
    let actualTargetX = targetX;
    let actualTargetY = targetY;

    if (!world.isWalkable(targetX, targetY)) {
      const bestAdj = this.getBestAdjacentWalkable(world, targetX, targetY, startX, startY);
      if (!bestAdj) return null;
      actualTargetX = bestAdj.x;
      actualTargetY = bestAdj.y;
    }

    if (startX === actualTargetX && startY === actualTargetY) {
      return [];
    }

    const totalTiles = world.width * world.height;
    if (!this.visitedMap || this.visitedMap.length < totalTiles) {
      this.visitedMap = new Uint32Array(totalTiles);
      this.bestGMap = new Float32Array(totalTiles);
      this.bestGIteration = new Uint32Array(totalTiles);
      this.currentIteration = 1;
    } else {
      this.currentIteration++;
      if (this.currentIteration >= 0xfffffffe) {
        this.visitedMap.fill(0);
        this.bestGIteration!.fill(0);
        this.currentIteration = 1;
      }
    }

    const iter = this.currentIteration;
    const visited = this.visitedMap;
    const bestG = this.bestGMap!;
    const bestGIter = this.bestGIteration!;
    const heap = this.openHeap;
    heap.clear();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      f: Math.abs(actualTargetX - startX) + Math.abs(actualTargetY - startY),
      parent: null,
    };

    heap.push(startNode);
    const startIdx = startY * world.width + startX;
    bestG[startIdx] = 0;
    bestGIter[startIdx] = iter;

    let budget = maxBudget;
    let closestNode: PathNode = startNode;
    let minH = startNode.f;

    while (heap.size > 0 && budget-- > 0) {
      const current = heap.pop()!;
      const curIdx = current.y * world.width + current.x;

      // Skip if already closed
      if (visited[curIdx] === iter) continue;
      visited[curIdx] = iter;

      // Reached goal?
      if (current.x === actualTargetX && current.y === actualTargetY) {
        return this.reconstructPath(current);
      }

      // Check distance to track best-effort fallback
      const h = Math.abs(actualTargetX - current.x) + Math.abs(actualTargetY - current.y);
      if (h < minH) {
        minH = h;
        closestNode = current;
      }

      // Expand 4 cardinal neighbors
      for (const dir of this.CARDINAL_DIRS) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (!world.isWalkable(nx, ny)) continue;

        const neighborIdx = ny * world.width + nx;
        if (visited[neighborIdx] === iter) continue;

        const gScore = current.g + 1;
        if (bestGIter[neighborIdx] === iter && gScore >= bestG[neighborIdx]) {
          continue;
        }

        bestG[neighborIdx] = gScore;
        bestGIter[neighborIdx] = iter;

        const hScore = Math.abs(actualTargetX - nx) + Math.abs(actualTargetY - ny);
        const fScore = gScore + hScore;

        heap.push({
          x: nx,
          y: ny,
          g: gScore,
          f: fScore,
          parent: current,
        });
      }
    }

    // If reached budget limit and didn't find exact target, but made significant progress towards it
    if (closestNode !== startNode && minH < startNode.f) {
      return this.reconstructPath(closestNode);
    }

    return null;
  }

  private static getBestAdjacentWalkable(
    world: World,
    targetX: number,
    targetY: number,
    fromX: number,
    fromY: number
  ): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let minD = Infinity;

    for (const dir of this.CARDINAL_DIRS) {
      const nx = targetX + dir.dx;
      const ny = targetY + dir.dy;
      if (world.isWalkable(nx, ny)) {
        const d = Math.abs(nx - fromX) + Math.abs(ny - fromY);
        if (d < minD) {
          minD = d;
          best = { x: nx, y: ny };
        }
      }
    }

    return best;
  }

  private static reconstructPath(node: PathNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let curr: PathNode | null = node;

    while (curr && curr.parent) {
      path.push({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }

    path.reverse();
    return path;
  }
}
