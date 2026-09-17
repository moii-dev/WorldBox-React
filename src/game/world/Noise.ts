/**
 * Fast 2D Perlin / Simplex style noise with multi-octave Fractal Brownian Motion (FBM)
 */
export class Noise {
  private p: Uint8Array = new Uint8Array(512);

  constructor(seed: number = 1337) {
    this.reseed(seed);
  }

  public reseed(seed: number): void {
    const permutation = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }

    // Fisher-Yates shuffle with seed
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;

    const nextRandom = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const p = this.p;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;

    const g00 = this.grad(p[A], xf, yf);
    const g10 = this.grad(p[B], xf - 1, yf);
    const g01 = this.grad(p[A + 1], xf, yf - 1);
    const g11 = this.grad(p[B + 1], xf - 1, yf - 1);

    const x1 = this.lerp(u, g00, g10);
    const x2 = this.lerp(u, g01, g11);

    return (this.lerp(v, x1, x2) + 1) * 0.5; // normalized 0 to 1
  }

  /**
   * Fractal Brownian Motion (FBM) with multiple octaves for natural terrain
   */
  public fbm2D(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
