import { SECTORS, VOCAB_BANK, VocabEntry, SectorInfo } from '../data/wordBank';

export type Direction = 'across' | 'down';
export type GridScale = 'colossal' | 'grand' | 'district';

export interface PlacedWord {
  id: string;
  number: number;
  word: string;
  direction: Direction;
  row: number;
  col: number;
  length: number;
  clue: string;
  crypticClue?: string;
  isCryptic: boolean;
  category: string;
  sectorId: number;
  questId?: number;
  questStep?: number;
}

export interface CellData {
  row: number;
  col: number;
  solution: string; // '' if black block
  number?: number;
  acrossWordId?: string;
  downWordId?: string;
  sectorId: number;
  isQuestCell?: boolean;
}

export interface QuestData {
  id: number;
  sectorId: number;
  title: string;
  subtitle: string;
  description: string;
  wordIds: string[];
}

export interface CrosswordPuzzle {
  scale: GridScale;
  size: number;
  cells: CellData[][];
  words: PlacedWord[];
  wordMap: Record<string, PlacedWord>;
  quests: QuestData[];
  sectors: SectorInfo[];
  totalWhiteCells: number;
}

export const SCALE_CONFIG: Record<GridScale, {
  size: number;
  label: string;
  sublabel: string;
  sectorsPerSide: number;
  badge: string;
}> = {
  colossal: {
    size: 200,
    label: 'Colossal Atlas (200 × 200)',
    sublabel: '40,000 Squares · 25 Sectors · 4,100+ Clues',
    sectorsPerSide: 5,
    badge: '4X BIGGER THAN A 100×100 CROSSWORD'
  },
  grand: {
    size: 120,
    label: 'Grand Broadsheet (120 × 120)',
    sublabel: '14,400 Squares · 9 Sectors · 1,450+ Clues',
    sectorsPerSide: 3,
    badge: 'BROADSHEET EDITION'
  },
  district: {
    size: 60,
    label: 'District Folio (60 × 60)',
    sublabel: '3,600 Squares · 4 Sectors · 350+ Clues',
    sectorsPerSide: 2,
    badge: 'QUICK EXPEDITION'
  }
};

// Deterministic Mulberry32 PRNG
function createRng(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate rich varied clue phrasings when a vocabulary entry is reused in distant sectors
function buildDistinctClue(
  entry: VocabEntry,
  occurrenceIndex: number,
  sectorName: string
): { clue: string; isCryptic: boolean } {
  const cleanWord = entry.word.toUpperCase();
  const len = cleanWord.length;
  const stdClue = entry.standardClue.trim();

  if (occurrenceIndex === 0) {
    return {
      clue: `${stdClue} (${len})`,
      isCryptic: false
    };
  }

  if (occurrenceIndex === 1 && entry.crypticClue) {
    return {
      clue: entry.crypticClue.trim(),
      isCryptic: true
    };
  }

  const variantMode = occurrenceIndex % 5;
  if (variantMode === 1) {
    // Cryptic-style anagram indicator + definition
    const chars = cleanWord.split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = (i * 7 + occurrenceIndex * 3) % (i + 1);
      const tmp = chars[i];
      chars[i] = chars[j];
      chars[j] = tmp;
    }
    if (chars.join('') === cleanWord) {
      for (let i = 1; i < chars.length; i++) {
        if (chars[i] !== chars[0]) {
          const tmp = chars[0];
          chars[0] = chars[i];
          chars[i] = tmp;
          break;
        }
      }
    }
    const anagramStr = chars.join('');
    return {
      clue: `Cryptic anagram (${anagramStr}): ${stdClue} (${len})`,
      isCryptic: true
    };
  } else if (variantMode === 2) {
    return {
      clue: `[${entry.category}] ${stdClue}; starts with ‘${cleanWord[0]}’ and ends with ‘${cleanWord[len - 1]}’ (${len})`,
      isCryptic: false
    };
  } else if (variantMode === 3) {
    return {
      clue: `${stdClue} [2nd letter ‘${cleanWord[1]}’, last letter ‘${cleanWord[len - 1]}’] (${len})`,
      isCryptic: false
    };
  } else {
    const shortSector = sectorName.replace(/^\d+\.\s*/, '');
    return {
      clue: `${shortSector} archive: ${stdClue} (${len})`,
      isCryptic: false
    };
  }
}

export function generateColossalCrossword(scale: GridScale): CrosswordPuzzle {
  const config = SCALE_CONFIG[scale];
  const size = config.size;
  const sectorsPerSide = config.sectorsPerSide;
  const sectorSpan = Math.floor(size / sectorsPerSide);

  const rng = createRng(size * 1337 + 42);

  // Deduplicate vocabulary bank by word
  const uniqueMap = new Map<string, VocabEntry>();
  for (const item of VOCAB_BANK) {
    const w = item.word.toUpperCase().replace(/[^A-Z]/g, '');
    if (w.length >= 4 && !uniqueMap.has(w)) {
      uniqueMap.set(w, { ...item, word: w });
    }
  }
  const vocabList = Array.from(uniqueMap.values());

  // Index words by character they contain -> list of { entry, charIndex }
  const wordsByChar: Record<string, Array<{ entry: VocabEntry; charIdx: number }>> = {};
  for (let c = 65; c <= 90; c++) {
    wordsByChar[String.fromCharCode(c)] = [];
  }
  for (const entry of vocabList) {
    for (let i = 0; i < entry.word.length; i++) {
      const ch = entry.word[i];
      if (wordsByChar[ch]) {
        wordsByChar[ch].push({ entry, charIdx: i });
      }
    }
  }

  // Board arrays for ultra-fast generation
  // charGrid[r][c] = '' or 'A'..'Z'
  const charGrid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const hasAcross: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const hasDown: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const acrossWordAt: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const downWordAt: string[][] = Array.from({ length: size }, () => Array(size).fill(''));

  const rawPlacements: Array<{
    entry: VocabEntry;
    row: number;
    col: number;
    direction: Direction;
  }> = [];

  const wordUsageCount: Record<string, number> = {};

  function canPlaceWord(
    word: string,
    row: number,
    col: number,
    direction: Direction,
    requireIntersection: boolean
  ): number {
    const len = word.length;
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;

    if (row < 0 || col < 0) return -1;
    if (row + dr * (len - 1) >= size || col + dc * (len - 1) >= size) return -1;

    // Check cell immediately before word start
    const beforeR = row - dr;
    const beforeC = col - dc;
    if (beforeR >= 0 && beforeC >= 0 && charGrid[beforeR][beforeC] !== '') {
      return -1;
    }

    // Check cell immediately after word end
    const afterR = row + dr * len;
    const afterC = col + dc * len;
    if (afterR < size && afterC < size && charGrid[afterR][afterC] !== '') {
      return -1;
    }

    let intersections = 0;

    for (let i = 0; i < len; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = charGrid[r][c];

      if (existing !== '') {
        if (existing !== word[i]) return -1;
        // Cannot overlap another word in the same direction
        if (direction === 'across' && hasAcross[r][c]) return -1;
        if (direction === 'down' && hasDown[r][c]) return -1;
        // Prevent a word from intersecting an identical copy of itself
        if (direction === 'across' && downWordAt[r][c] === word) return -1;
        if (direction === 'down' && acrossWordAt[r][c] === word) return -1;
        intersections++;
      } else {
        // Cell is currently empty; check perpendicular neighbors to prevent invalid 2-letter side-by-side contact
        if (direction === 'across') {
          if (r > 0 && charGrid[r - 1][c] !== '') return -1;
          if (r < size - 1 && charGrid[r + 1][c] !== '') return -1;
        } else {
          if (c > 0 && charGrid[r][c - 1] !== '') return -1;
          if (c < size - 1 && charGrid[r][c + 1] !== '') return -1;
        }
      }
    }

    if (requireIntersection && intersections === 0) return -1;
    return intersections;
  }

  function commitWord(entry: VocabEntry, row: number, col: number, direction: Direction) {
    const word = entry.word;
    const len = word.length;
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;

    for (let i = 0; i < len; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      charGrid[r][c] = word[i];
      if (direction === 'across') {
        hasAcross[r][c] = true;
        acrossWordAt[r][c] = word;
      } else {
        hasDown[r][c] = true;
        downWordAt[r][c] = word;
      }
    }

    rawPlacements.push({ entry, row, col, direction });
    wordUsageCount[word] = (wordUsageCount[word] || 0) + 1;
  }

  // Active frontier cells that can spawn perpendicular crossing words
  const frontier: Array<{ r: number; c: number }> = [];

  function addWordAndFrontier(entry: VocabEntry, row: number, col: number, direction: Direction) {
    commitWord(entry, row, col, direction);
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;
    for (let i = 0; i < entry.word.length; i++) {
      frontier.push({ r: row + dr * i, c: col + dc * i });
    }
  }

  // Step 1: Seed a single central anchor word so the entire crossword grows as ONE connected component
  const longWords = vocabList.filter((v) => v.word.length >= 7);
  const popLongWords = longWords.filter(
    (v) => v.category === 'Cinema' || v.category === 'Pop Music' || v.category === 'Pop Culture'
  );
  const seedPool = popLongWords.length > 0 ? popLongWords : longWords;
  const seedEntry = seedPool[Math.floor(rng() * seedPool.length)];
  const centerR = Math.floor(size / 2);
  const centerC = Math.max(1, Math.floor(size / 2) - Math.floor(seedEntry.word.length / 2));
  addWordAndFrontier(seedEntry, centerR, centerC, 'across');

  function expandFrontier(startHead: number): number {
    let head = startHead;
    while (head < frontier.length) {
      const remaining = frontier.length - head;
      if (remaining > 1) {
        const pick = head + Math.floor(rng() * Math.min(remaining, 24));
        const tmp = frontier[head];
        frontier[head] = frontier[pick];
        frontier[pick] = tmp;
      }

      const { r, c } = frontier[head++];
      const ch = charGrid[r][c];
      if (!ch) continue;

      const needAcross = !hasAcross[r][c];
      const needDown = !hasDown[r][c];
      if (!needAcross && !needDown) continue;

      const targetDir: Direction = needAcross ? 'across' : 'down';
      const candidates = wordsByChar[ch];
      if (!candidates || candidates.length === 0) continue;

      const startOffset = Math.floor(rng() * candidates.length);
      let bestCandidate: { entry: VocabEntry; startR: number; startC: number; score: number } | null = null;

      const sampleCount = Math.min(candidates.length, 64);
      const step = Math.max(1, Math.floor(candidates.length / sampleCount));

      for (let s = 0; s < sampleCount; s++) {
        const cand = candidates[(startOffset + s * step) % candidates.length];
        const startR = targetDir === 'down' ? r - cand.charIdx : r;
        const startC = targetDir === 'across' ? c - cand.charIdx : c;

        const intersections = canPlaceWord(cand.entry.word, startR, startC, targetDir, true);
        if (intersections > 0) {
          const usedTimes = wordUsageCount[cand.entry.word] || 0;
          const isPop =
            cand.entry.category === 'Cinema' ||
            cand.entry.category === 'Pop Music' ||
            cand.entry.category === 'Pop Culture';
          const score =
            intersections * 25 +
            cand.entry.word.length * 2 +
            (isPop ? 8 : 0) -
            usedTimes * 28;
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { entry: cand.entry, startR, startC, score };
            if (intersections >= 2 && usedTimes === 0) break;
          }
        }
      }

      if (bestCandidate) {
        addWordAndFrontier(bestCandidate.entry, bestCandidate.startR, bestCandidate.startC, targetDir);
      }
    }
    return head;
  }

  // Step 2: Primary outward frontier expansion from the central seed
  let frontierHead = expandFrontier(0);

  // Step 3: Density sweeps that only attach via valid intersections and re-expand the frontier into any sparse pockets
  for (let pass = 0; pass < 2; pass++) {
    let addedInPass = 0;
    for (let r = 1; r < size - 1; r++) {
      for (let c = 1; c < size - 1; c++) {
        const ch = charGrid[r][c];
        if (!ch) continue;
        const needAcross = !hasAcross[r][c];
        const needDown = !hasDown[r][c];
        if (!needAcross && !needDown) continue;

        const targetDir: Direction = needAcross ? 'across' : 'down';
        const candidates = wordsByChar[ch];
        const startOffset = (r * 31 + c * 17 + pass * 101) % candidates.length;

        let bestCandidate: { entry: VocabEntry; startR: number; startC: number; score: number } | null = null;
        const sampleCount = Math.min(36, candidates.length);
        const step = Math.max(1, Math.floor(candidates.length / sampleCount));

        for (let s = 0; s < sampleCount; s++) {
          const cand = candidates[(startOffset + s * step) % candidates.length];
          const startR = targetDir === 'down' ? r - cand.charIdx : r;
          const startC = targetDir === 'across' ? c - cand.charIdx : c;
          const intersections = canPlaceWord(cand.entry.word, startR, startC, targetDir, true);
          if (intersections > 0) {
            const usedTimes = wordUsageCount[cand.entry.word] || 0;
            const score = intersections * 20 + cand.entry.word.length - usedTimes * 28;
            if (!bestCandidate || score > bestCandidate.score) {
              bestCandidate = { entry: cand.entry, startR, startC, score };
              if (intersections >= 2 && usedTimes === 0) break;
            }
          }
        }

        if (bestCandidate) {
          addWordAndFrontier(bestCandidate.entry, bestCandidate.startR, bestCandidate.startC, targetDir);
          addedInPass++;
        }
      }
    }
    frontierHead = expandFrontier(frontierHead);
    if (addedInPass === 0) break;
  }

  // Step 4: Canonical crossword numbering (top-to-bottom, left-to-right)
  const acrossStartMap = new Map<string, typeof rawPlacements[0]>();
  const downStartMap = new Map<string, typeof rawPlacements[0]>();

  for (const p of rawPlacements) {
    const key = `${p.row},${p.col}`;
    if (p.direction === 'across') {
      acrossStartMap.set(key, p);
    } else {
      downStartMap.set(key, p);
    }
  }

  const cells: CellData[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const sRow = Math.min(sectorsPerSide - 1, Math.floor(r / sectorSpan));
      const sCol = Math.min(sectorsPerSide - 1, Math.floor(c / sectorSpan));
      const sectorId = sRow * sectorsPerSide + sCol;
      return {
        row: r,
        col: c,
        solution: charGrid[r][c],
        sectorId
      };
    })
  );

  const words: PlacedWord[] = [];
  const wordMap: Record<string, PlacedWord> = {};
  const clueOccurrenceCounter: Record<string, number> = {};
  let currentNumber = 1;
  let totalWhiteCells = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (charGrid[r][c] !== '') {
        totalWhiteCells++;
      }
      const key = `${r},${c}`;
      const aPlacement = acrossStartMap.get(key);
      const dPlacement = downStartMap.get(key);

      if (aPlacement || dPlacement) {
        const num = currentNumber++;
        cells[r][c].number = num;

        if (aPlacement) {
          const wStr = aPlacement.entry.word;
          const occ = clueOccurrenceCounter[wStr] || 0;
          clueOccurrenceCounter[wStr] = occ + 1;

          const sectorId = cells[r][c].sectorId;
          const sectorInfo = SECTORS[sectorId % SECTORS.length];
          const { clue, isCryptic } = buildDistinctClue(aPlacement.entry, occ, sectorInfo.name);
          const id = `${num}-across`;

          const placed: PlacedWord = {
            id,
            number: num,
            word: wStr,
            direction: 'across',
            row: r,
            col: c,
            length: wStr.length,
            clue,
            crypticClue: aPlacement.entry.crypticClue,
            isCryptic,
            category: aPlacement.entry.category,
            sectorId
          };
          words.push(placed);
          wordMap[id] = placed;

          for (let i = 0; i < wStr.length; i++) {
            cells[r][c + i].acrossWordId = id;
          }
        }

        if (dPlacement) {
          const wStr = dPlacement.entry.word;
          const occ = clueOccurrenceCounter[wStr] || 0;
          clueOccurrenceCounter[wStr] = occ + 1;

          const sectorId = cells[r][c].sectorId;
          const sectorInfo = SECTORS[sectorId % SECTORS.length];
          const { clue, isCryptic } = buildDistinctClue(dPlacement.entry, occ, sectorInfo.name);
          const id = `${num}-down`;

          const placed: PlacedWord = {
            id,
            number: num,
            word: wStr,
            direction: 'down',
            row: r,
            col: c,
            length: wStr.length,
            clue,
            crypticClue: dPlacement.entry.crypticClue,
            isCryptic,
            category: dPlacement.entry.category,
            sectorId
          };
          words.push(placed);
          wordMap[id] = placed;

          for (let i = 0; i < wStr.length; i++) {
            cells[r + i][c].downWordId = id;
          }
        }
      }
    }
  }

  // Step 5: Build structured Quests (1 quest per active sector, 6-8 curated words per quest)
  const totalSectors = sectorsPerSide * sectorsPerSide;
  const activeSectors = SECTORS.slice(0, totalSectors);
  const quests: QuestData[] = [];

  for (let sId = 0; sId < totalSectors; sId++) {
    const sectorWords = words.filter((w) => w.sectorId === sId && w.length >= 6);
    const stepCount = Math.min(8, Math.max(5, Math.floor(sectorWords.length / 8)));
    const chosenWords: string[] = [];

    if (sectorWords.length > 0) {
      const stride = Math.max(1, Math.floor(sectorWords.length / stepCount));
      for (let i = 0; i < stepCount && i * stride < sectorWords.length; i++) {
        const w = sectorWords[i * stride];
        w.questId = sId;
        w.questStep = i + 1;
        chosenWords.push(w.id);

        // Mark cells as quest cells for subtle cartographic gold highlight
        const dr = w.direction === 'down' ? 1 : 0;
        const dc = w.direction === 'across' ? 1 : 0;
        for (let k = 0; k < w.length; k++) {
          cells[w.row + dr * k][w.col + dc * k].isQuestCell = true;
        }
      }
    }

    const sInfo = activeSectors[sId % activeSectors.length];
    quests.push({
      id: sId,
      sectorId: sId,
      title: sInfo.questTitle,
      subtitle: sInfo.name,
      description: sInfo.questDescription,
      wordIds: chosenWords
    });
  }

  return {
    scale,
    size,
    cells,
    words,
    wordMap,
    quests,
    sectors: activeSectors,
    totalWhiteCells
  };
}
