/**
 * pdfPolyfills.ts
 *
 * pdf-parse@2 bundles pdfjs-dist which references browser globals (DOMMatrix,
 * DOMPoint, Path2D, ImageData, window, navigator, document) at MODULE LOAD TIME.
 *
 * This file MUST be imported first in index.ts so the globals are installed
 * before any other module triggers a require/import of pdf-parse.
 *
 * All assignments happen at the top level so they execute synchronously during
 * the module evaluation phase — before any dynamic require() call.
 */

/* ── DOMMatrix ─────────────────────────────────────────────────────────────── */
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a: number; b: number; c: number; d: number; e: number; f: number;

    constructor(
      values: number[] | { a: number; b: number; c: number; d: number; e: number; f: number } = [1, 0, 0, 1, 0, 0],
    ) {
      if (Array.isArray(values)) {
        [this.a = 1, this.b = 0, this.c = 0, this.d = 1, this.e = 0, this.f = 0] = values;
      } else {
        ({ a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f } = values);
      }
    }

    multiply(o: DOMMatrixPolyfill): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([
        this.a * o.a + this.c * o.b, this.b * o.a + this.d * o.b,
        this.a * o.c + this.c * o.d, this.b * o.c + this.d * o.d,
        this.a * o.e + this.c * o.f + this.e, this.b * o.e + this.d * o.f + this.f,
      ]);
    }

    inverse(): DOMMatrixPolyfill {
      const det = this.a * this.d - this.b * this.c;
      if (det === 0) return new DOMMatrixPolyfill();
      return new DOMMatrixPolyfill([
        this.d / det, -this.b / det, -this.c / det, this.a / det,
        (this.c * this.f - this.d * this.e) / det,
        (this.b * this.e - this.a * this.f) / det,
      ]);
    }

    translate(tx: number, ty: number): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty]));
    }

    scale(sx: number, sy = sx): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0]));
    }

    rotate(angleDeg: number): DOMMatrixPolyfill {
      const r = (angleDeg * Math.PI) / 180;
      return this.multiply(new DOMMatrixPolyfill([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]));
    }

    static fromFloat32Array(v: Float32Array): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill(Array.from(v));
    }

    static fromFloat64Array(v: Float64Array): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill(Array.from(v));
    }

    toFloat32Array(): Float32Array {
      return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]);
    }

    toFloat64Array(): Float64Array {
      return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
    }
  }

  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
}

/* ── DOMPoint ──────────────────────────────────────────────────────────────── */
if (typeof (globalThis as any).DOMPoint === "undefined") {
  class DOMPointPolyfill {
    x: number; y: number; z: number; w: number;
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  }
  (globalThis as any).DOMPoint = DOMPointPolyfill;
}

/* ── Path2D ────────────────────────────────────────────────────────────────── */
if (typeof (globalThis as any).Path2D === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class Path2DPolyfill { constructor(_p?: string) {} }
  (globalThis as any).Path2D = Path2DPolyfill;
}

/* ── ImageData ─────────────────────────────────────────────────────────────── */
if (typeof (globalThis as any).ImageData === "undefined") {
  class ImageDataPolyfill {
    width: number; height: number; data: Uint8ClampedArray;
    constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
      if (typeof dataOrWidth === "number") {
        this.width = dataOrWidth; this.height = width ?? 0;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth; this.width = width ?? 0; this.height = height ?? 0;
      }
    }
  }
  (globalThis as any).ImageData = ImageDataPolyfill;
}

/* ── browser-like globals ──────────────────────────────────────────────────── */
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}

if (typeof (globalThis as any).navigator === "undefined") {
  (globalThis as any).navigator = { userAgent: "node.js" };
}

if (typeof (globalThis as any).document === "undefined") {
  (globalThis as any).document = {
    createElement: () => ({ getContext: () => ({}) }),
    createElementNS: () => ({ getContext: () => ({}) }),
  };
}

export {}; // mark as ESM module
