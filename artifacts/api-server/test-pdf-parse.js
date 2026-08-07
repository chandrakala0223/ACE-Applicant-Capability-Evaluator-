const { readFileSync } = require('fs');
function ensureGlobals() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrix {
      constructor(values = [1, 0, 0, 1, 0, 0]) {
        if (Array.isArray(values)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = values;
        } else {
          Object.assign(this, values);
        }
      }
      multiply(o) {
        return new DOMMatrix([
          this.a * o.a + this.c * o.b,
          this.b * o.a + this.d * o.b,
          this.a * o.c + this.c * o.d,
          this.b * o.c + this.d * o.d,
          this.a * o.e + this.c * o.f + this.e,
          this.b * o.e + this.d * o.f + this.f,
        ]);
      }
      inverse() {
        const det = this.a * this.d - this.b * this.c;
        if (det === 0) throw new Error('Cannot invert matrix');
        return new DOMMatrix([
          this.d / det,
          -this.b / det,
          -this.c / det,
          this.a / det,
          (this.c * this.f - this.d * this.e) / det,
          (this.b * this.e - this.a * this.f) / det,
        ]);
      }
      toFloat32Array() {
        return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]);
      }
    }
    globalThis.DOMMatrix = DOMMatrix;
  }
  if (typeof globalThis.DOMPoint === 'undefined') {
    class DOMPoint {
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x; this.y = y; this.z = z; this.w = w;
      }
    }
    globalThis.DOMPoint = DOMPoint;
  }
  if (typeof globalThis.Path2D === 'undefined') {
    class Path2D { constructor() {} }
    globalThis.Path2D = Path2D;
  }
  if (typeof globalThis.ImageData === 'undefined') {
    class ImageData { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }}
    globalThis.ImageData = ImageData;
  }
}

(async () => {
  ensureGlobals();
  try {
    const pdfParse = require('pdf-parse');
    console.log('module type', typeof pdfParse);
    console.log('keys', Object.keys(pdfParse));
    console.log('has default', pdfParse && typeof pdfParse.default);
    console.log('has parse', pdfParse && typeof pdfParse.parse);
    const buf = readFileSync('sample_resume.pdf');
    const data = await pdfParse(buf);
    console.log('text length', data.text.length);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
