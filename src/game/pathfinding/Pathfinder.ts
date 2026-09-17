import { World } from '../world/World';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: PathNode | null;
}

export class Pathfinder {
  private static readonly CARDINAL_DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  /**
   * Fast budget-limited A* search to a target tile
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

    const openSet: PathNode[] = [];
    const closedSet = new Uint8Array(world.width * world.height);

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      f: Math.abs(actualTargetX - startX) + Math.abs(actualTargetY - startY),
      parent: null,
    };

    openSet.push(startNode);

    let budget = maxBudget;
    let closestNode: PathNode = startNode;
    let minH = startNode.f;

    while (openSet.length > 0 && budget-- > 0) {
      // Find lowest f score in openSet
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIdx].f) {
          lowestIdx = i;
        }
      }

      const current = openSet.splice(lowestIdx, 1)[0];
      const curIdx = current.y * world.width + current.x;
      closedSet[curIdx] = 1;

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
        if (closedSet[neighborIdx] === 1) continue;

        const gScore = current.g + 1;
        const hScore = Math.abs(actualTargetX - nx) + Math.abs(actualTargetY - ny);
        const fScore = gScore + hScore;

        const existingIdx = openSet.findIndex((n) => n.x === nx && n.y === ny);
        if (existingIdx !== -1) {
          if (gScore < openSet[existingIdx].g) {
            openSet[existingIdx].g = gScore;
            openSet[existingIdx].f = fScore;
            openSet[existingIdx].parent = current;
          }
        } else {
          openSet.push({
            x: nx,
            y: ny,
            g: gScore,
            f: fScore,
            parent: current,
          });
        }
      }
    }

    // If reached budget limit and didn't find exact target, but made progress, use closestNode
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
