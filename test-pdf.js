const pdfMake = require('pdfmake/build/pdfmake.js');
const pdfFonts = require('pdfmake/build/vfs_fonts.js');
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs || pdfFonts;

const definition = {
  content: [{ text: 'Prueba', bold: true }],
};

try {
  const pdfDocGenerator = pdfMake.createPdf(definition);
  pdfDocGenerator.getBuffer((buffer) => {
    console.log('Buffer generated! Size:', buffer.length);
  });

  // Keep alive
  setTimeout(() => console.log('Timeout finished'), 3000);
} catch (e) {
  console.error('Error:', e);
}
