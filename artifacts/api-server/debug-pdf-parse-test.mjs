import fs from 'fs';
import { createRequire } from 'module';

function ensureGlobals() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrixPolyfill {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(values = [1, 0, 0, 1, 0, 0]) {
        if (Array.isArray(values)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = values;
        } else {
          this.a = values.a;
          this.b = values.b;
          this.c = values.c;
          this.d = values.d;
          this.e = values.e;
          this.f = values.f;
        }
      }

      multiply(other) {
        return new DOMMatrixPolyfill([
          this.a * other.a + this.c * other.b,
          this.b * other.a + this.d * other.b,
          this.a * other.c + this.c * other.d,
          this.b * other.c + this.d * other.d,
          this.a * other.e + this.c * other.f + this.e,
          this.b * other.e + this.d * other.f + this.f,
        ]);
      }
    }
    globalThis.DOMMatrix = DOMMatrixPolyfill;
  }
  if (typeof globalThis.DOMPoint === 'undefined') {
    class DOMPointPolyfill {
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
      }
    }
    globalThis.DOMPoint = DOMPointPolyfill;
  }
  if (typeof globalThis.Path2D === 'undefined') {
    class Path2DPolyfill { constructor() {} }
    globalThis.Path2D = Path2DPolyfill;
  }
  if (typeof globalThis.ImageData === 'undefined') {
    class ImageDataPolyfill { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }}
    globalThis.ImageData = ImageDataPolyfill;
  }
}

ensureGlobals();
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
console.log('module type', typeof pdfParseModule);
console.log('keys', Object.keys(pdfParseModule));
console.log('has default', !!pdfParseModule.default, typeof pdfParseModule.default);
console.log('PDFParse', typeof pdfParseModule.PDFParse);

const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default || pdfParseModule;
console.log('resolved class type', typeof PDFParseClass);

const buf = fs.readFileSync('sample_resume.pdf');
const parser = new PDFParseClass({ data: buf });
const data = await parser.getText();
console.log('text length', data.text.length);
console.log(data.text.slice(0, 200));
