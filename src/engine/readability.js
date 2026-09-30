// Readability formulas — standard published coefficients.
// W = eligible prose words; S = prose sentences; C = letters/digits in word
// tokens; L = letters per 100 words; T = sentences per 100 words;
// Y = estimated syllables; P = words with >=3 estimated syllables.
// Return null when denominator is zero; never NaN/Infinity/0-fake.

export function ari({ W, S, C }) {
  if (!W || !S) return null;
  const v = 4.71 * (C / W) + 0.5 * (W / S) - 21.43;
  return Number.isFinite(v) ? v : null;
}

export function fleschKincaid({ W, S, Y }) {
  if (!W || !S) return null;
  const v = 0.39 * (W / S) + 11.8 * (Y / W) - 15.59;
  return Number.isFinite(v) ? v : null;
}

export function colemanLiau({ L, T }) {
  if (L == null || T == null) return null;
  const v = 0.0588 * L - 0.296 * T - 15.8;
  return Number.isFinite(v) ? v : null;
}

// Formula-only SMOG (caller enforces >=30 sentence suppression for display).
export function smog({ P, S }) {
  if (!S) return null;
  const v = 1.0430 * Math.sqrt((P * 30) / S) + 3.1291;
  return Number.isFinite(v) ? v : null;
}

// Display helpers per spec §2.
export function displayGrade(raw) {
  if (raw == null || !Number.isFinite(raw)) return null;
  const rounded = Math.ceil(raw - 1e-9);
  const floored = Math.max(1, rounded);
  if (floored > 12) return { label: "College+", value: floored, raw };
  return { label: String(floored), value: floored, raw };
}

export function shouldSuppressGrade({ eligibleWords, proseSentences }) {
  return eligibleWords < 100 || proseSentences < 5;
}
