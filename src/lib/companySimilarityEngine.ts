/**
 * Machine Learning & Fuzzy Similarity Engine for Company Names
 * Detects duplicates, near-duplicates, and fuzzy matching company names.
 */

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics
    // Strip common legal prefixes/suffixes in Indonesian, Japanese, and English
    .replace(/\b(pt|cv|ud|tbk|inc|corp|corporation|co|ltd|limited|kabushiki|kaisha|godo|kk|gk|g\.k\.|k\.k\.)\b/gi, '')
    // Strip punctuation
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function checkCompanySimilarity(
  inputName: string, 
  existingName: string
): { similarity: number; isDuplicate: boolean; reason?: string } {
  if (!inputName || !existingName) {
    return { similarity: 0, isDuplicate: false };
  }

  // 1. Raw exact match
  if (inputName.trim().toLowerCase() === existingName.trim().toLowerCase()) {
    return { 
      similarity: 1.0, 
      isDuplicate: true, 
      reason: `Nama '${inputName}' persis sama dengan '${existingName}'` 
    };
  }

  const norm1 = normalizeCompanyName(inputName);
  const norm2 = normalizeCompanyName(existingName);

  // 2. Exact normalized match
  if (norm1 === norm2 && norm1.length > 0) {
    return { 
      similarity: 1.0, 
      isDuplicate: true, 
      reason: `Setelah dinormalisasi (tanpa PT/CV/Corp/spasi), nama '${inputName}' sama dengan '${existingName}'` 
    };
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return { similarity: 0, isDuplicate: false };

  // 3. Levenshtein similarity
  const levDist = levenshteinDistance(norm1, norm2);
  const levSim = 1 - levDist / maxLen;

  // 4. Token Set / Jaccard Similarity
  const tokens1 = new Set(norm1.split(' ').filter(b => b.length > 1));
  const tokens2 = new Set(norm2.split(' ').filter(b => b.length > 1));

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const tokenSim = union.size === 0 ? 0 : intersection.size / union.size;

  // 5. Substring inclusion check for core brand names
  const isSubstring = (norm1.length >= 4 && norm2.length >= 4) && (norm1.includes(norm2) || norm2.includes(norm1));
  const substringSim = isSubstring ? 0.88 : 0;

  // Highest similarity score
  const finalScore = Math.max(levSim, tokenSim, substringSim);

  // Threshold: >= 0.75 (75% similarity) considers it a duplicate/near-duplicate
  const isDuplicate = finalScore >= 0.75;

  return {
    similarity: Math.round(finalScore * 100) / 100,
    isDuplicate,
    reason: isDuplicate 
      ? `Kemiripan nama ${Math.round(finalScore * 100)}% dengan '${existingName}'`
      : undefined
  };
}
