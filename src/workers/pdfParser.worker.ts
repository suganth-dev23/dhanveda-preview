import * as pdfjsLib from 'pdfjs-dist';
import { StagedTransaction } from '../types/finance';
import type { AutoRule } from '../utils/categoryMatcher';
import { extractTransactionsFromPDFLines } from '../utils/pdfLineExtractor';

// Re-export extractTransactionsFromPDFLines for consumers that need types or references
export { extractTransactionsFromPDFLines };

// Set worker source using Vite URL import
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // worker option fallback
}

export interface WorkerPDFMessage {
  arrayBuffer: ArrayBuffer;
  customRules?: AutoRule[];
}

export type WorkerPDFResponse =
  | {
      type: 'progress';
      page: number;
      totalPages: number;
    }
  | {
      type: 'success';
      transactions: StagedTransaction[];
      totalPages: number;
      extractedLinesCount: number;
      errors: string[];
      rawExtractedText?: string;
    }
  | {
      type: 'error';
      error: string;
      isPasswordProtected?: boolean;
    };

self.onmessage = async (e: MessageEvent<WorkerPDFMessage>) => {
  const { arrayBuffer, customRules } = e.data || {};
  const errors: string[] = [];

  if (!arrayBuffer) {
    self.postMessage({ type: 'error', error: 'No ArrayBuffer received in PDF worker.' } as WorkerPDFResponse);
    return;
  }

  try {
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
    }).promise;

    const lines: string[] = [];
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Emit progress
      self.postMessage({
        type: 'progress',
        page: pageNum,
        totalPages,
      } as WorkerPDFResponse);

      // Group text items by vertical position (Y coordinate with 4px tolerance)
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

      // Sort lines top to bottom (descending Y)
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

    const transactions = extractTransactionsFromPDFLines(lines, customRules);

    self.postMessage({
      type: 'success',
      transactions,
      totalPages,
      extractedLinesCount: lines.length,
      errors,
      rawExtractedText: lines.slice(0, 100).join('\n'),
    } as WorkerPDFResponse);
  } catch (err: any) {
    const isPassword = err?.name === 'PasswordException' || /password/i.test(err?.message || '');
    const errorMessage = isPassword
      ? 'This PDF statement is password-protected or encrypted. Please decrypt or unlock the file before uploading.'
      : (err?.message || 'Failed to parse PDF document.');
    self.postMessage({
      type: 'error',
      error: errorMessage,
      isPasswordProtected: isPassword,
    } as WorkerPDFResponse);
  }
};
