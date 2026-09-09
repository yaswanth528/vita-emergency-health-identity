/**
 * Generates a small, valid PDF prescription with a real text layer, for testing
 * the document reader. Not part of the app bundle.
 *
 *   node scripts/make-test-pdf.mjs
 */
import fs from 'node:fs';

const lines = [
  'APOLLO HOSPITALS  -  CARDIOLOGY OPD',
  'Date: 12-Aug-2026        Rx No. 2026/CARD/8841',
  'Patient: Kavita Menon    Age: 58 Y    Sex: F',
  'Dx : CAD s/p PCI, HTN, T2DM, Dyslipidaemia',
  '',
  'Rx',
  '1. TAB. ATORVASTATIN 20 mg    1-0-0 night      30 days',
  '2. TAB. METFORMIN 500 mg      1-0-1 after food 30 days',
  '3. TAB. TELMISARTAN 40 mg     OD morning       30 days',
  '4. TAB. ASPIRIN 75 mg         0-1-0            30 days',
  '',
  'ALLERGY : PENICILLIN  - anaphylaxis, documented 2019',
  'BP 138/86 mmHg    Pulse 74 bpm    SpO2 98 %',
  'HbA1c 7.4 %   LDL 118 mg/dL   Creatinine 1.10 mg/dL   eGFR 62 mL/min',
  '',
  'Review after 4 weeks with fasting lipid profile.',
];

const BS = String.fromCharCode(92);
const esc = (t) =>
  t.split(BS).join(BS + BS).split('(').join(BS + '(').split(')').join(BS + ')');

let content = 'BT /F1 11 Tf 14 TL 40 800 Td\n';
for (const l of lines) content += '(' + esc(l) + ') Tj T*\n';
content += 'ET';

const objs = [
  '<</Type/Catalog/Pages 2 0 R>>',
  '<</Type/Pages/Kids[3 0 R]/Count 1>>',
  '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
  '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  '<</Length ' + content.length + '>>\nstream\n' + content + '\nendstream',
];

let pdf = '%PDF-1.4\n';
const offsets = [];
objs.forEach((o, i) => {
  offsets.push(pdf.length);
  pdf += i + 1 + ' 0 obj\n' + o + '\nendobj\n';
});
const xref = pdf.length;
pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
pdf +=
  'trailer\n<</Size ' + (objs.length + 1) + '/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF\n';

const out = process.argv[2] ?? 'Prescription_Real.pdf';
fs.writeFileSync(out, pdf, 'latin1');
fs.writeFileSync(out + '.b64.txt', Buffer.from(pdf, 'latin1').toString('base64'));
console.log('wrote', out, pdf.length, 'bytes');
