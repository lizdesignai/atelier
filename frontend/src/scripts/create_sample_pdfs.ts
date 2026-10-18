import fs from 'fs';
import path from 'path';

function createSimplePdf(title: string, subtitle: string): Buffer {
  const content = `BT
/F1 22 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
/F1 10 Tf
0 -40 Td
(Studio Veronna - Curadoria e Estrategia de Presenca Digital) Tj
0 -20 Td
(Documento oficial de alinhamento submetido via Focus para aprovacao do cliente.) Tj
0 -30 Td
(- Avalie as diretrizes, aprove ou solicite revisao diretamente pelo Cockpit.) Tj
ET`;

  const streamLength = Buffer.byteLength(content, 'utf-8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000370 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

const docsDir = path.join(process.cwd(), 'public', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(docsDir, 'calendario-editorial-ciclo2.pdf'),
  createSimplePdf('Calendario Editorial de Conteudos - Ciclo 2', 'Planejamento de temas, datas e formatos do ciclo')
);

fs.writeFileSync(
  path.join(docsDir, 'alinhamento-visual-ciclo2.pdf'),
  createSimplePdf('Alinhamento Visual do Feed - Ciclo 2', 'Moodboard, paleta cromatica e grade estetica')
);

fs.writeFileSync(
  path.join(docsDir, 'roteirizacao-videos-ciclo2.pdf'),
  createSimplePdf('Roteirizacao de 8 Videos - Ciclo 2', 'Scripts, ganchos de atencao e CTAs de conversao')
);

console.log('PDFs generated successfully in public/docs');
