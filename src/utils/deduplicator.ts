import { Transaction, StagedTransaction } from '../types/finance';

/**
 * Calculates simple similarity between two strings (0 to 1)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2 && s1.length > 0) return 1;
  // Guard substring match with minimum token length of 4 characters to avoid false positives on empty or short tokens
  if (s1.length >= 4 && s2.length >= 4 && (s1.includes(s2) || s2.includes(s1))) {
    return 0.85;
  }

  // Word token overlap
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });

  return (2 * intersection) / (words1.size + words2.size);
}

/**
 * Checks staged transactions against existing transactions and flags duplicates
 */
export function flagDuplicates(
  stagedList: Omit<StagedTransaction, 'isDuplicate' | 'duplicateReason'>[],
  existingList: Transaction[]
): StagedTransaction[] {
  const seenInBatch = new Map<string, number>();

  return stagedList.map((staged, index) => {
    // 1. Check referenceId exact match against existing
    if (staged.referenceId) {
      const refMatch = existingList.find(
        e => e.referenceId && e.referenceId.toLowerCase() === staged.referenceId?.toLowerCase()
      );
      if (refMatch) {
        return {
          ...staged,
          isDuplicate: true,
          duplicateReason: `Exact reference ID match (#${staged.referenceId})`,
          selected: false,
        };
      }
    }

    // 2. Check Date + Amount + Type exact match against existing
    const exactMatch = existingList.find(e => {
      const dateMatch = e.date === staged.date;
      const amountMatch = Math.abs(e.amount - staged.amount) < 0.01;
      const typeMatch = e.type === staged.type;
      return dateMatch && amountMatch && typeMatch;
    });

    if (exactMatch) {
      const desc1 = (exactMatch.description || '').trim().toLowerCase();
      const desc2 = (staged.description || '').trim().toLowerCase();
      const similarity = stringSimilarity(desc1, desc2);

      // Require high text similarity or exact match, not just identical category
      if (similarity >= 0.65 || (desc1.length > 0 && desc1 === desc2)) {
        const descPreview = (exactMatch.description || 'Transaction').slice(0, 25);
        return {
          ...staged,
          isDuplicate: true,
          duplicateReason: `Matches existing ₹${staged.amount} on ${staged.date} ("${descPreview}...")`,
          selected: false,
        };
      }
    }

    // 3. Intra-batch duplicate check (same file containing duplicates)
    const batchKey = `${staged.date}_${staged.amount.toFixed(2)}_${staged.type}_${(staged.description || '').trim().toLowerCase()}_${(staged.referenceId || '').toLowerCase()}`;
    if (seenInBatch.has(batchKey)) {
      const firstIndex = seenInBatch.get(batchKey)! + 1;
      return {
        ...staged,
        isDuplicate: true,
        duplicateReason: `Duplicate of row #${firstIndex} in same import file`,
        selected: false,
      };
    }
    seenInBatch.set(batchKey, index);

    return {
      ...staged,
      isDuplicate: false,
      selected: true,
    };
  });
}
