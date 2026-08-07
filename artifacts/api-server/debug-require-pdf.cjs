const pdf = require('pdf-parse');
console.log('type', typeof pdf);
console.log('keys', Object.keys(pdf));
console.log('hasDefault', pdf && pdf.default ? true : false);
console.log('pdfParse', typeof pdf.PDFParse);
console.log('parse', typeof pdf.parse);
console.log('default keys', pdf && pdf.default ? Object.keys(pdf.default) : null);
