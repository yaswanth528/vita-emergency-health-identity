import type * as PdfJs from 'pdfjs-dist';

/* ============================================================================
   Document reader — this actually reads the file
   ----------------------------------------------------------------------------
   Two paths, chosen by what the file turns out to be rather than by its
   extension:

     1. PDF with a text layer   pdf.js pulls the text out directly. Exact
                                characters, no guessing, effectively instant.
     2. Anything else           the page is rasterised (or the image used as-is)
                                and passed to Tesseract in a worker. Slower, and
                                the per-word confidence it returns is carried
                                through rather than discarded.

   A PDF that yields almost no text is treated as a scan, because that is what
   it almost always is — a photograph wrapped in a PDF container.

   Tesseract's language data is fetched on first use. If that fetch fails the
   reader says so; it never falls back to inventing content.
   ========================================================================== */

/**
 * pdf.js and its worker are ~2.4 MB together. Loading them on first read
 * instead of at boot keeps them off the landing page, which most visitors
 * never leave.
 */
let pdfjsPromise: Promise<typeof PdfJs> | null = null;
async function getPdfjs(): Promise<typeof PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })();
  }
  return pdfjsPromise;
}

export type ReadMethod = 'pdf-text' | 'ocr' | 'pdf-scan-ocr';

export interface ReadResult {
  pages: string[];
  method: ReadMethod;
  /** 0–100. For OCR this is Tesseract's own mean word confidence. */
  confidence: number;
  /** Set when the document could not be read at all. */
  error?: string;
}

export type ReadProgress = (stage: string, pct: number) => void;

/** Below this many characters a PDF page is assumed to be a scan, not text. */
const TEXT_LAYER_MIN_CHARS = 40;

/* --- PDF ------------------------------------------------------------------- */

async function renderPageToCanvas(page: PdfJs.PDFPageProxy, scale = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext('2d')!;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

async function readPdf(file: File, onProgress: ReadProgress): Promise<ReadResult> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(`Reading page ${i} of ${doc.numPages}`, (i / doc.numPages) * 70);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Rebuild lines from positioned text items: pdf.js returns fragments, and
    // a prescription's meaning lives in its line structure.
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const key = Math.round(y / 3) * 3; // tolerate sub-pixel drift
      const row = rows.get(key) ?? [];
      row.push({ x: item.transform[4], str: item.str });
      rows.set(key, row);
    }
    const text = [...rows.entries()]
      .sort((a, b) => b[0] - a[0]) // top of page first
      .map(([, row]) =>
        row
          .sort((a, b) => a.x - b.x)
          .map((r) => r.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n');

    pages.push(text);
  }

  const total = pages.join('').replace(/\s/g, '').length;
  if (total >= TEXT_LAYER_MIN_CHARS) {
    onProgress('Text layer extracted', 100);
    return { pages, method: 'pdf-text', confidence: 99 };
  }

  // No usable text layer — it is a scan. Rasterise and OCR the pages.
  onProgress('No text layer — running OCR', 20);
  const ocrPages: string[] = [];
  let confSum = 0;
  const limit = Math.min(doc.numPages, 5); // keep a demo responsive
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const canvas = await renderPageToCanvas(page);
    const r = await ocrCanvas(canvas, (s, p) =>
      onProgress(`${s} (page ${i}/${limit})`, 20 + (p / 100) * 75),
    );
    if (r.error) return { pages: [], method: 'pdf-scan-ocr', confidence: 0, error: r.error };
    ocrPages.push(r.text);
    confSum += r.confidence;
  }
  return {
    pages: ocrPages,
    method: 'pdf-scan-ocr',
    confidence: Math.round(confSum / Math.max(1, ocrPages.length)),
  };
}

/* --- OCR -------------------------------------------------------------------- */

let workerPromise: Promise<unknown> | null = null;

async function getOcrWorker(onProgress: ReadProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) =>
          onProgress(m.status, Math.round(m.progress * 100)),
      });
    })();
  }
  return workerPromise;
}

async function ocrCanvas(
  source: HTMLCanvasElement | File,
  onProgress: ReadProgress,
): Promise<{ text: string; confidence: number; error?: string }> {
  try {
    const worker = (await getOcrWorker(onProgress)) as {
      recognize: (i: unknown) => Promise<{ data: { text: string; confidence: number } }>;
    };
    const { data } = await worker.recognize(source);
    return { text: data.text.trim(), confidence: Math.round(data.confidence) };
  } catch (e) {
    // Tesseract pulls its language data over the network on first use. If that
    // is unavailable, say so — do not substitute anything.
    workerPromise = null;
    return {
      text: '',
      confidence: 0,
      error:
        e instanceof Error && /fetch|network|Failed to/i.test(e.message)
          ? 'OCR needs to download its language data on first use and could not reach the network.'
          : `OCR failed: ${e instanceof Error ? e.message : 'unknown error'}`,
    };
  }
}

/* --- Entry point ------------------------------------------------------------- */

export async function readDocument(file: File, onProgress: ReadProgress): Promise<ReadResult> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  try {
    if (isPdf) return await readPdf(file, onProgress);

    onProgress('Running OCR', 5);
    const r = await ocrCanvas(file, onProgress);
    if (r.error) return { pages: [], method: 'ocr', confidence: 0, error: r.error };
    return { pages: [r.text], method: 'ocr', confidence: r.confidence };
  } catch (e) {
    return {
      pages: [],
      method: isPdf ? 'pdf-text' : 'ocr',
      confidence: 0,
      error: e instanceof Error ? e.message : 'Could not read this file.',
    };
  }
}

export const readMethodLabel: Record<ReadMethod, string> = {
  'pdf-text': 'PDF text layer',
  ocr: 'OCR (image)',
  'pdf-scan-ocr': 'OCR (scanned PDF)',
};
