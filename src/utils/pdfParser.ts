import { StagedTransaction } from '../types/finance';
import type { WorkerPDFResponse } from '../workers/pdfParser.worker';
import { extractTransactionsFromPDFLines } from './pdfLineExtractor';
import { getCustomAutoRules } from './categoryMatcher';

// Configure pdfjs worker in main thread as well for seamless fallback


export interface PDFParseProgress {
  page: number;
  totalPages: number;
}

export interface PDFParseResult {
  transactions: StagedTransaction[];
  totalPages: number;
  extractedLinesCount: number;
  errors: string[];
  rawExtractedText?: string;
}

/**
 * Direct in-thread PDF statement parser (used as robust fallback)
 */
export async function parsePDFInThread(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  const errors: string[] = [];

  try {
    const pdfjsLib = await import('pdfjs-dist');
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    } catch {}

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
    }).promise;

    const lines: string[] = [];
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      if (onProgress) {
        onProgress({ page: pageNum, totalPages });
      }

      const lineMap: Map<number, { x: number; text: string }[]> = new Map();

      textContent.items.forEach((item: any) => {
        if (!item.str || item.str.trim() === '') return;
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];

        let foundKey: number | null = null;
        for (const k of lineMap.keys()) {
          if (Math.abs(k - y) <= 4) {
            foundKey = k;
            break;
          }
        }

        if (foundKey !== null) {
          lineMap.get(foundKey)!.push({ x, text: item.str });
        } else {
          lineMap.set(y, [{ x, text: item.str }]);
        }
      });

      const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

      sortedYKeys.forEach((y) => {
        const rowItems = lineMap.get(y)!;
        rowItems.sort((a, b) => a.x - b.x);
        const lineStr = rowItems.map(i => i.text.trim()).join('   ').trim();
        if (lineStr.length > 0) {
          lines.push(lineStr);
        }
      });
    }

    const transactions = extractTransactionsFromPDFLines(lines, getCustomAutoRules());

    return {
      transactions,
      totalPages,
      extractedLinesCount: lines.length,
      errors,
      rawExtractedText: lines.slice(0, 100).join('\n'),
    };
  } catch (err: any) {
    const isPassword = err?.name === 'PasswordException' || /password/i.test(err?.message || '');
    const errorMsg = isPassword
      ? 'This PDF statement is password-protected or encrypted. Please decrypt or unlock the file before uploading.'
      : (err?.message || 'Failed to parse PDF document.');
    return {
      transactions: [],
      totalPages: 0,
      extractedLinesCount: 0,
      errors: [errorMsg],
    };
  }
}

/**
 * Parses Bank statement PDF with Web Worker and automatic main-thread fallback
 */
export async function parsePDFStatement(
  file: File,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let hasResolved = false;

    const runFallback = async () => {
      if (hasResolved) return;
      hasResolved = true;
      if (worker) {
        try {
          worker.terminate();
        } catch {
          // ignore
        }
      }
      try {
        const result = await parsePDFInThread(arrayBuffer.slice(0), onProgress);
        resolve(result);
      } catch (err: any) {
        resolve({
          transactions: [],
          totalPages: 0,
          extractedLinesCount: 0,
          errors: [err?.message || 'Failed to parse PDF document.'],
        });
      }
    };

    try {
      worker = new Worker(
        new URL('../workers/pdfParser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      let timeoutId: any = null;

      worker.onmessage = (e: MessageEvent<WorkerPDFResponse>) => {
        const data = e.data;

        if (data.type === 'progress') {
          if (onProgress) {
            onProgress({ page: data.page, totalPages: data.totalPages });
          }
        } else if (data.type === 'success') {
          hasResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          worker?.terminate();
          resolve({
            transactions: data.transactions,
            totalPages: data.totalPages,
            extractedLinesCount: data.extractedLinesCount,
            errors: data.errors,
            rawExtractedText: data.rawExtractedText,
          });
        } else if (data.type === 'error') {
          if (timeoutId) clearTimeout(timeoutId);
          if (data.isPasswordProtected) {
            hasResolved = true;
            worker?.terminate();
            resolve({
              transactions: [],
              totalPages: 0,
              extractedLinesCount: 0,
              errors: [data.error],
            });
            return;
          }
          // Attempt main thread fallback if worker errored
          console.warn('PDF Worker failed, falling back to in-thread parsing:', data.error);
          runFallback();
        }
      };

      worker.onerror = (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('PDF Worker onerror triggered, falling back to in-thread parsing:', err);
        runFallback();
      };

      // Clone buffer before posting in case fallback is needed
      const bufferForWorker = arrayBuffer.slice(0);
      worker.postMessage(
        { arrayBuffer: bufferForWorker, customRules: getCustomAutoRules() },
        [bufferForWorker]
      );

      // Safety timeout for worker (15 seconds)
      timeoutId = setTimeout(() => {
        if (!hasResolved) {
          console.warn('PDF Worker timed out, triggering fallback.');
          runFallback();
        }
      }, 15000);
    } catch (workerInitErr) {
      console.warn('Could not instantiate PDF Web Worker, running in-thread:', workerInitErr);
      runFallback();
    }
  });
}
