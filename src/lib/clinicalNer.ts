/* ============================================================================
   Clinical entity extraction over real document text
   ----------------------------------------------------------------------------
   This is dictionary-and-pattern extraction, not a language model. That choice
   is deliberate and it is a limitation worth being plain about:

     It genuinely reads the text. Every entity below is produced by matching
     against characters that are actually in the file, and every one carries
     the line it came from and its offset — so provenance for an uploaded
     document is real, not decorative.

     It does not understand the text. It will miss a drug outside its
     dictionary and it cannot read intent. Where it is unsure it lowers the
     confidence, and the acceptance threshold then withholds the value rather
     than asserting it.

   Confidence is derived, not decorative:
     0.97  exact dictionary hit on a drug/analyte/condition name
     0.90  strong structural pattern (dose, BP, dated line)
     0.82  weaker pattern, or a match needing normalisation
     ×     scaled by OCR confidence when the text came from OCR
   ========================================================================== */

export type NerEntityType =
  | 'medication'
  | 'dosage'
  | 'frequency'
  | 'condition'
  | 'allergy'
  | 'lab-value'
  | 'vital'
  | 'date'
  | 'procedure';

export interface NerEntity {
  id: string;
  type: NerEntityType;
  /** Exactly as it appears in the document. */
  surfaceForm: string;
  /** Cleaned/canonical form. */
  normalised: string;
  confidence: number;
  page: number;
  /** The whole line it was found on — this is what the evidence drawer cites. */
  line: string;
  lineIndex: number;
  charStart: number;
  charEnd: number;
  coding?: { system: 'RxNorm' | 'SNOMED-CT' | 'LOINC' | 'ICD-10'; code: string };
}

/* --- Dictionaries ----------------------------------------------------------- */

const MEDICATIONS: { name: string; rxnorm?: string; aliases?: string[] }[] = [
  { name: 'Atorvastatin', rxnorm: '83367' },
  { name: 'Rosuvastatin', rxnorm: '301542' },
  { name: 'Simvastatin', rxnorm: '36567' },
  { name: 'Metformin', rxnorm: '6809', aliases: ['Glycomet', 'Glucophage'] },
  { name: 'Glimepiride', rxnorm: '25789' },
  { name: 'Insulin', rxnorm: '5856' },
  { name: 'Telmisartan', rxnorm: '73494' },
  { name: 'Losartan', rxnorm: '203160' },
  { name: 'Amlodipine', rxnorm: '17767' },
  { name: 'Ramipril', rxnorm: '35296' },
  { name: 'Enalapril', rxnorm: '3827' },
  { name: 'Metoprolol', rxnorm: '6918' },
  { name: 'Bisoprolol', rxnorm: '19484' },
  { name: 'Aspirin', rxnorm: '1191', aliases: ['Ecosprin', 'ASA'] },
  { name: 'Clopidogrel', rxnorm: '32968', aliases: ['Plavix'] },
  { name: 'Warfarin', rxnorm: '11289' },
  { name: 'Apixaban', rxnorm: '1364430' },
  { name: 'Pantoprazole', rxnorm: '40790' },
  { name: 'Omeprazole', rxnorm: '7646' },
  { name: 'Levothyroxine', rxnorm: '10582', aliases: ['Thyronorm', 'Eltroxin'] },
  { name: 'Amoxicillin', rxnorm: '723' },
  { name: 'Azithromycin', rxnorm: '18631' },
  { name: 'Ceftriaxone', rxnorm: '2193' },
  { name: 'Paracetamol', rxnorm: '161', aliases: ['Acetaminophen', 'Dolo', 'Crocin'] },
  { name: 'Ibuprofen', rxnorm: '5640' },
  { name: 'Prednisolone', rxnorm: '8638' },
  { name: 'Salbutamol', rxnorm: '435', aliases: ['Albuterol', 'Asthalin'] },
  { name: 'Montelukast', rxnorm: '88249' },
  { name: 'Furosemide', rxnorm: '4603', aliases: ['Lasix'] },
  { name: 'Spironolactone', rxnorm: '9997' },
  { name: 'Gabapentin', rxnorm: '25480' },
  { name: 'Sertraline', rxnorm: '36437' },
  { name: 'Vitamin D3', aliases: ['Cholecalciferol'] },
  { name: 'Folic acid', rxnorm: '4511' },
];

const CONDITIONS: { name: string; icd?: string; aliases?: string[] }[] = [
  { name: 'Hypertension', icd: 'I10', aliases: ['HTN', 'High blood pressure'] },
  { name: 'Type 2 diabetes mellitus', icd: 'E11.9', aliases: ['T2DM', 'Type 2 diabetes', 'DM type 2', 'NIDDM'] },
  { name: 'Type 1 diabetes mellitus', icd: 'E10.9', aliases: ['T1DM'] },
  { name: 'Coronary artery disease', icd: 'I25.10', aliases: ['CAD', 'IHD', 'Ischaemic heart disease'] },
  { name: 'Myocardial infarction', icd: 'I21.9', aliases: ['NSTEMI', 'STEMI', 'MI', 'Heart attack'] },
  { name: 'Dyslipidaemia', icd: 'E78.5', aliases: ['Dyslipidemia', 'Hyperlipidaemia', 'Hyperlipidemia'] },
  { name: 'Chronic kidney disease', icd: 'N18.9', aliases: ['CKD'] },
  { name: 'Asthma', icd: 'J45.909' },
  { name: 'COPD', icd: 'J44.9' },
  { name: 'Hypothyroidism', icd: 'E03.9' },
  { name: 'Atrial fibrillation', icd: 'I48.91', aliases: ['AF', 'AFib'] },
  { name: 'Anaemia', icd: 'D64.9', aliases: ['Anemia'] },
  { name: 'Stroke', icd: 'I63.9', aliases: ['CVA'] },
  { name: 'Heart failure', icd: 'I50.9', aliases: ['CCF', 'CHF'] },
];

const ANALYTES: { name: string; loinc?: string; unit?: string; aliases?: string[] }[] = [
  { name: 'HbA1c', loinc: '4548-4', unit: '%', aliases: ['Glycated haemoglobin', 'A1c'] },
  { name: 'LDL cholesterol', loinc: '13457-7', unit: 'mg/dL', aliases: ['LDL', 'LDL-C'] },
  { name: 'HDL cholesterol', loinc: '2085-9', unit: 'mg/dL', aliases: ['HDL'] },
  { name: 'Total cholesterol', loinc: '2093-3', unit: 'mg/dL' },
  { name: 'Triglycerides', loinc: '2571-8', unit: 'mg/dL' },
  { name: 'Creatinine', loinc: '2160-0', unit: 'mg/dL' },
  { name: 'eGFR', loinc: '62238-1', unit: 'mL/min' },
  { name: 'Haemoglobin', loinc: '718-7', unit: 'g/dL', aliases: ['Hemoglobin', 'Hb'] },
  { name: 'Potassium', loinc: '2823-3', unit: 'mmol/L', aliases: ['K+'] },
  { name: 'Sodium', loinc: '2951-2', unit: 'mmol/L', aliases: ['Na+'] },
  { name: 'TSH', loinc: '3016-3', unit: 'mIU/L' },
  { name: 'Fasting glucose', loinc: '1558-6', unit: 'mg/dL', aliases: ['FBS', 'Fasting blood sugar'] },
  { name: 'Troponin', loinc: '10839-9', unit: 'ng/mL', aliases: ['Troponin-I', 'Trop-I'] },
  { name: 'Vitamin D', loinc: '1989-3', unit: 'ng/mL' },
];

const PROCEDURES = [
  'Angiography',
  'Angioplasty',
  'PCI',
  'CABG',
  'Stent',
  'Echocardiography',
  'Echo',
  'Colonoscopy',
  'Endoscopy',
  'Appendectomy',
  'Cholecystectomy',
  'Caesarean',
  'Dialysis',
  'MRI',
  'CT scan',
  'Ultrasound',
];

/** Frequency shorthand as it is actually written on Indian prescriptions. */
const FREQUENCIES: { pattern: RegExp; meaning: string }[] = [
  { pattern: /\b1\s*-\s*0\s*-\s*1\b/g, meaning: 'Twice daily (morning and night)' },
  { pattern: /\b1\s*-\s*1\s*-\s*1\b/g, meaning: 'Three times daily' },
  { pattern: /\b1\s*-\s*0\s*-\s*0\b/g, meaning: 'Once daily (morning)' },
  { pattern: /\b0\s*-\s*0\s*-\s*1\b/g, meaning: 'Once daily (night)' },
  { pattern: /\b0\s*-\s*1\s*-\s*0\b/g, meaning: 'Once daily (afternoon)' },
  { pattern: /\bOD\b/g, meaning: 'Once daily' },
  { pattern: /\bBD\b|\bBID\b/g, meaning: 'Twice daily' },
  { pattern: /\bTDS\b|\bTID\b/g, meaning: 'Three times daily' },
  { pattern: /\bQID\b/g, meaning: 'Four times daily' },
  { pattern: /\bHS\b/g, meaning: 'At night' },
  { pattern: /\bSOS\b|\bPRN\b/g, meaning: 'As needed' },
  { pattern: /\bonce\s+(?:a\s+)?daily\b/gi, meaning: 'Once daily' },
  { pattern: /\btwice\s+(?:a\s+)?daily\b/gi, meaning: 'Twice daily' },
  { pattern: /\bthree\s+times\s+(?:a\s+)?daily\b/gi, meaning: 'Three times daily' },
];

/* --- Helpers ----------------------------------------------------------------- */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let counter = 0;
const nextId = () => `ner-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface Ctx {
  page: number;
  line: string;
  lineIndex: number;
  /** Multiplier from OCR confidence; 1 for exact text layers. */
  quality: number;
}

function push(
  out: NerEntity[],
  ctx: Ctx,
  type: NerEntityType,
  surfaceForm: string,
  normalised: string,
  base: number,
  index: number,
  coding?: NerEntity['coding'],
) {
  out.push({
    id: nextId(),
    type,
    surfaceForm,
    normalised,
    confidence: Math.max(30, Math.min(99, Math.round(base * ctx.quality))),
    page: ctx.page,
    line: ctx.line,
    lineIndex: ctx.lineIndex,
    charStart: index,
    charEnd: index + surfaceForm.length,
    coding,
  });
}

/* --- The extractor ------------------------------------------------------------ */

export interface NerResult {
  entities: NerEntity[];
  /** Entities below the acceptance threshold — flagged, never written silently. */
  withheld: NerEntity[];
  accepted: NerEntity[];
  meanConfidence: number;
  linesScanned: number;
}

export const ACCEPTANCE_THRESHOLD = 85;

export function extractEntities(
  pages: string[],
  /** OCR mean confidence 0–100, or 100 for an exact text layer. */
  sourceConfidence = 100,
): NerResult {
  const quality = Math.max(0.45, Math.min(1, sourceConfidence / 100));
  const out: NerEntity[] = [];
  let linesScanned = 0;

  pages.forEach((pageText, p) => {
    const lines = pageText.split('\n');
    lines.forEach((line, li) => {
      if (!line.trim()) return;
      linesScanned++;
      const ctx: Ctx = { page: p + 1, line, lineIndex: li, quality };

      /* Medications ------------------------------------------------------- */
      for (const med of MEDICATIONS) {
        for (const term of [med.name, ...(med.aliases ?? [])]) {
          const re = new RegExp(`\\b${escape(term)}\\b`, 'gi');
          let m: RegExpExecArray | null;
          while ((m = re.exec(line))) {
            push(
              out,
              ctx,
              'medication',
              m[0],
              med.name,
              term === med.name ? 97 : 92,
              m.index,
              med.rxnorm ? { system: 'RxNorm', code: med.rxnorm } : undefined,
            );
          }
        }
      }

      /* Dosage ------------------------------------------------------------- */
      // Negative lookahead: "mg/dL" and "mL/min" are a concentration and a
      // rate, not doses. Containment suppression below would catch most of
      // these anyway, but only when the surrounding analyte is recognised.
      const doseRe = /\b(\d+(?:\.\d+)?)\s?(mg|mcg|µg|g|ml|IU|units?)\b(?!\s*\/)/gi;
      let d: RegExpExecArray | null;
      while ((d = doseRe.exec(line))) {
        push(out, ctx, 'dosage', d[0], `${d[1]} ${d[2].toLowerCase()}`, 90, d.index);
      }

      /* Frequency ---------------------------------------------------------- */
      for (const f of FREQUENCIES) {
        const re = new RegExp(f.pattern.source, f.pattern.flags);
        let m: RegExpExecArray | null;
        while ((m = re.exec(line))) {
          push(out, ctx, 'frequency', m[0], f.meaning, 88, m.index);
        }
      }

      /* Allergies ---------------------------------------------------------- */
      const allergyRe =
        /\b(?:allerg(?:y|ic|ies)\s*(?:to)?|ADR|adverse\s+drug\s+reaction|hypersensitiv(?:e|ity))\b\s*[:\-–]?\s*([A-Za-z][A-Za-z\s/,-]{2,40})/gi;
      let a: RegExpExecArray | null;
      while ((a = allergyRe.exec(line))) {
        const substance = a[1].split(/[,.;(]/)[0].trim();
        if (substance.length > 2) {
          push(out, ctx, 'allergy', a[0].trim(), substance, 93, a.index, {
            system: 'SNOMED-CT',
            code: '419199007',
          });
        }
      }

      /* Conditions ---------------------------------------------------------- */
      for (const c of CONDITIONS) {
        for (const term of [c.name, ...(c.aliases ?? [])]) {
          // Abbreviations must be case-sensitive or "MI" matches "mild".
          const isAbbrev = term.length <= 5 && term === term.toUpperCase();
          const re = new RegExp(`\\b${escape(term)}\\b`, isAbbrev ? 'g' : 'gi');
          let m: RegExpExecArray | null;
          while ((m = re.exec(line))) {
            push(
              out,
              ctx,
              'condition',
              m[0],
              c.name,
              term === c.name ? 96 : 89,
              m.index,
              c.icd ? { system: 'ICD-10', code: c.icd } : undefined,
            );
          }
        }
      }

      /* Lab values ----------------------------------------------------------- */
      for (const an of ANALYTES) {
        for (const term of [an.name, ...(an.aliases ?? [])]) {
          const re = new RegExp(
            `\\b${escape(term)}\\b[^0-9\\n]{0,20}(\\d+(?:\\.\\d+)?)\\s*(%|mg/dL|mmol/L|g/dL|mL/min|ng/mL|mIU/L)?`,
            'gi',
          );
          let m: RegExpExecArray | null;
          while ((m = re.exec(line))) {
            const unit = m[2] ?? an.unit ?? '';
            push(
              out,
              ctx,
              'lab-value',
              m[0].trim(),
              `${an.name} ${m[1]}${unit ? ` ${unit}` : ''}`,
              m[2] ? 96 : 87,
              m.index,
              an.loinc ? { system: 'LOINC', code: an.loinc } : undefined,
            );
          }
        }
      }

      /* Vitals ---------------------------------------------------------------- */
      const bpRe = /\b(\d{2,3})\s*\/\s*(\d{2,3})\s*(?:mmHg)?\b/g;
      let v: RegExpExecArray | null;
      while ((v = bpRe.exec(line))) {
        const sys = Number(v[1]);
        const dia = Number(v[2]);
        if (sys >= 70 && sys <= 260 && dia >= 40 && dia <= 160) {
          push(out, ctx, 'vital', v[0].trim(), `Blood pressure ${sys}/${dia} mmHg`, 91, v.index);
        }
      }
      const spo2Re = /\bSpO2\s*[:\-]?\s*(\d{2,3})\s*%?/gi;
      while ((v = spo2Re.exec(line))) {
        push(out, ctx, 'vital', v[0].trim(), `SpO2 ${v[1]} %`, 93, v.index);
      }
      const pulseRe = /\b(?:pulse|heart\s*rate|HR)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?\b/gi;
      while ((v = pulseRe.exec(line))) {
        push(out, ctx, 'vital', v[0].trim(), `Heart rate ${v[1]} bpm`, 90, v.index);
      }

      /* Procedures -------------------------------------------------------------- */
      for (const proc of PROCEDURES) {
        const re = new RegExp(`\\b${escape(proc)}\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = re.exec(line))) {
          push(out, ctx, 'procedure', m[0], proc, 88, m.index);
        }
      }

      /* Dates --------------------------------------------------------------------- */
      // A dose schedule like "0-1-0 30 days" is not a date. Require either a
      // named month or a full four-digit year before believing it is one.
      const namedMonthRe = new RegExp(
        String.raw`\b(\d{1,2})[-/\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s](\d{2,4})\b`,
        'gi',
      );
      const numericDateRe = new RegExp(
        String.raw`\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b`,
        'g',
      );
      for (const re of [namedMonthRe, numericDateRe]) {
        let dt: RegExpExecArray | null;
        while ((dt = re.exec(line))) {
          push(out, ctx, 'date', dt[0], dt[0].replace(/\s+/g, '-'), 90, dt.index);
        }
      }
    });
  });

  /**
   * Where two entities cover overlapping characters, the more specific reading
   * wins. "LDL 118 mg/dL" is one lab value, not a lab value plus a 118 mg dose;
   * reporting both would inflate the count with something that is not there.
   */
  const SPECIFICITY: Record<NerEntityType, number> = {
    'lab-value': 9,
    allergy: 8,
    medication: 7,
    condition: 6,
    vital: 5,
    procedure: 4,
    dosage: 3,
    frequency: 2,
    date: 1,
  };
  const contained = new Set<string>();
  for (const a of out) {
    for (const b of out) {
      if (a === b || a.page !== b.page || a.lineIndex !== b.lineIndex) continue;
      const inside = a.charStart >= b.charStart && a.charEnd <= b.charEnd;
      if (inside && SPECIFICITY[b.type] > SPECIFICITY[a.type]) contained.add(a.id);
    }
  }
  const survivors = out.filter((e) => !contained.has(e.id));

  // Same string matched by two dictionary passes (e.g. a name and its alias)
  // collapses to the higher-confidence hit.
  const deduped = new Map<string, NerEntity>();
  for (const e of survivors) {
    const key = `${e.page}:${e.lineIndex}:${e.charStart}:${e.type}`;
    const prev = deduped.get(key);
    if (!prev || e.confidence > prev.confidence) deduped.set(key, e);
  }
  const entities = [...deduped.values()].sort(
    (a, b) => a.page - b.page || a.lineIndex - b.lineIndex || a.charStart - b.charStart,
  );

  const accepted = entities.filter((e) => e.confidence >= ACCEPTANCE_THRESHOLD);
  const withheld = entities.filter((e) => e.confidence < ACCEPTANCE_THRESHOLD);

  return {
    entities,
    accepted,
    withheld,
    meanConfidence: entities.length
      ? Math.round(entities.reduce((s, e) => s + e.confidence, 0) / entities.length)
      : 0,
    linesScanned,
  };
}

export const nerTypeLabel: Record<NerEntityType, string> = {
  medication: 'Medication',
  dosage: 'Dosage',
  frequency: 'Frequency',
  condition: 'Diagnosis',
  allergy: 'Allergy',
  'lab-value': 'Lab value',
  vital: 'Vital sign',
  date: 'Date',
  procedure: 'Procedure',
};
