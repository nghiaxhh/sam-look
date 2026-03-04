import { Card, Combination, Rank } from '../types/game';
import { RANK_VALUES, RANKS } from './constants';
import { getCardValue } from './card-utils';

function getHighRankValue(combo: Combination): number {
  return getRankValue(combo.highRank);
}

function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of cards) {
    const existing = groups.get(card.rank) || [];
    existing.push(card);
    groups.set(card.rank, existing);
  }
  return groups;
}

function areConsecutive(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

interface SeqCheckResult { valid: boolean; twoIsLow: boolean; aceIsLow: boolean }

function checkConsecutiveRanks(ranks: Rank[]): SeqCheckResult {
  const values = ranks.map(r => getRankValue(r));
  const hasTwo = values.includes(15);

  if (!hasTwo) {
    return { valid: areConsecutive(values), twoIsLow: false, aceIsLow: false };
  }

  // Forbid any sequence containing both K and 2
  if (values.includes(13)) return { valid: false, twoIsLow: false, aceIsLow: false };

  // Try 2 as high (value 15): not possible without K-A bridge, but check anyway
  if (areConsecutive(values)) return { valid: true, twoIsLow: false, aceIsLow: false };

  // Try 2 as low (value 2): works for 2-3-4, 2-3-4-5, etc.
  const lowValues = values.map(v => v === 15 ? 2 : v);
  if (areConsecutive(lowValues)) return { valid: true, twoIsLow: true, aceIsLow: false };

  // Try A as 1 and 2 as 2: works for A-2-3, A-2-3-4-5-6, etc.
  if (values.includes(14)) {
    const aceLowValues = values.map(v => v === 15 ? 2 : v === 14 ? 1 : v);
    if (areConsecutive(aceLowValues)) return { valid: true, twoIsLow: true, aceIsLow: true };
  }

  return { valid: false, twoIsLow: false, aceIsLow: false };
}

function getSeqHighRank(sorted: Card[], aceIsLow: boolean): Rank {
  const lowRanks: Set<Rank> = new Set(['2']);
  if (aceIsLow) lowRanks.add('A');
  const filtered = sorted.filter(c => !lowRanks.has(c.rank));
  return filtered[filtered.length - 1].rank;
}

export function classifyCombination(cards: Card[]): Combination | null {
  if (cards.length === 0) return null;

  const sorted = [...cards].sort((a, b) => getCardValue(a) - getCardValue(b));
  const groups = groupByRank(sorted);
  const uniqueRanks = Array.from(groups.keys());
  const highCard = sorted[sorted.length - 1];

  if (cards.length === 1) {
    return { type: 'single', cards: sorted, highRank: highCard.rank, length: 1 };
  }

  if (cards.length === 2 && uniqueRanks.length === 1) {
    return { type: 'pair', cards: sorted, highRank: highCard.rank, length: 1 };
  }

  if (cards.length === 3 && uniqueRanks.length === 1) {
    return { type: 'triple', cards: sorted, highRank: highCard.rank, length: 1 };
  }

  if (cards.length === 4 && uniqueRanks.length === 1) {
    return { type: 'four_of_a_kind', cards: sorted, highRank: highCard.rank, length: 1 };
  }

  if (cards.length >= 3 && uniqueRanks.length === cards.length) {
    const seq = checkConsecutiveRanks(uniqueRanks);
    if (seq.valid) {
      const seqHighRank = seq.twoIsLow
        ? getSeqHighRank(sorted, seq.aceIsLow)
        : highCard.rank;
      return { type: 'sequence', cards: sorted, highRank: seqHighRank, length: cards.length, twoIsLow: seq.twoIsLow };
    }
  }

  if (cards.length >= 6 && cards.length % 2 === 0) {
    const allPairs = Array.from(groups.values()).every(g => g.length === 2);
    if (allPairs && uniqueRanks.length === cards.length / 2 && uniqueRanks.length >= 3) {
      const seq = checkConsecutiveRanks(uniqueRanks);
      if (seq.valid) {
        const seqHighRank = seq.twoIsLow
          ? getSeqHighRank(sorted, seq.aceIsLow)
          : highCard.rank;
        return { type: 'pair_sequence', cards: sorted, highRank: seqHighRank, length: uniqueRanks.length, twoIsLow: seq.twoIsLow };
      }
    }
  }

  return null;
}

function isSingleTwo(combo: Combination): boolean {
  return combo.type === 'single' && combo.highRank === '2';
}

function isPairOfTwos(combo: Combination): boolean {
  return combo.type === 'pair' && combo.highRank === '2';
}

export function canBeat(current: Combination, proposed: Combination): boolean {
  if (isSingleTwo(current)) {
    // Same-rank cards are equal — a single 2 cannot beat another single 2
    if (proposed.type === 'four_of_a_kind') return true;
    if (proposed.type === 'pair_sequence' && proposed.length >= 3) return true;
    return false;
  }

  if (isPairOfTwos(current)) {
    // A pair of 2s cannot beat another pair of 2s
    if (proposed.type === 'four_of_a_kind') return true;
    if (proposed.type === 'pair_sequence' && proposed.length >= 4) return true;
    return false;
  }

  if (proposed.type !== current.type) return false;

  if ((current.type === 'sequence' || current.type === 'pair_sequence') && proposed.length !== current.length) {
    return false;
  }

  // Compare by rank only — same rank cards are equal regardless of suit
  return getHighRankValue(proposed) > getHighRankValue(current);
}

export function containsThreeOfSpades(cards: Card[]): boolean {
  return cards.some(c => c.rank === '3' && c.suit === 'spades');
}

/**
 * Check if playing these cards would leave only 2s in hand.
 * In Sâm Lốc, you cannot end with only 2s remaining.
 */
export function wouldLeaveOnlyTwos(hand: Card[], playedCards: Card[]): boolean {
  const playedIds = new Set(playedCards.map(c => c.id));
  const remaining = hand.filter(c => !playedIds.has(c.id));
  if (remaining.length === 0) return false; // playing all cards is fine
  return remaining.every(c => c.rank === '2');
}

// Helper: pick k items from array, return all combinations
function pickK(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (k === arr.length) return [arr];
  const results: Card[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = pickK(arr.slice(i + 1), k - 1);
    for (const r of rest) {
      results.push([arr[i], ...r]);
    }
  }
  return results;
}

/**
 * Generate all valid plays from hand in a smart way instead of brute-force.
 * Groups cards by rank, then generates: singles, pairs, triples, fours, sequences, pair sequences.
 */
export function getAllValidPlays(
  hand: Card[],
  currentTrick: Combination | null,
  mustIncludeThreeOfSpades: boolean
): Card[][] {
  const validPlays: Card[][] = [];
  const groups = groupByRank(hand);

  const rankOrder = RANKS.filter(r => groups.has(r));

  // --- Singles ---
  for (const card of hand) {
    validPlays.push([card]);
  }

  // --- Pairs ---
  for (const rank of rankOrder) {
    const cards = groups.get(rank)!;
    if (cards.length >= 2) {
      const pairs = pickK(cards, 2);
      validPlays.push(...pairs);
    }
  }

  // --- Triples ---
  for (const rank of rankOrder) {
    const cards = groups.get(rank)!;
    if (cards.length >= 3) {
      const triples = pickK(cards, 3);
      validPlays.push(...triples);
    }
  }

  // --- Four of a kind ---
  for (const rank of rankOrder) {
    const cards = groups.get(rank)!;
    if (cards.length === 4) {
      validPlays.push(cards);
    }
  }

  // --- Sequences (3+ consecutive singles) ---
  const availableRanks = rankOrder
    .sort((a, b) => getRankValue(a) - getRankValue(b));

  for (let seqLen = 3; seqLen <= availableRanks.length; seqLen++) {
    for (let start = 0; start <= availableRanks.length - seqLen; start++) {
      const seqRanks = availableRanks.slice(start, start + seqLen);
      if (!checkConsecutiveRanks(seqRanks).valid) continue;

      // For each rank in the sequence, pick 1 card — generate all combos
      const cardChoices = seqRanks.map(r => groups.get(r)!);
      const seqCombos = cartesianProduct(cardChoices);
      validPlays.push(...seqCombos);
    }
  }

  // --- Pair sequences (3+ consecutive pairs) ---
  const ranksWithPairs = availableRanks.filter(r => (groups.get(r)?.length ?? 0) >= 2);
  for (let pairCount = 3; pairCount <= ranksWithPairs.length; pairCount++) {
    for (let start = 0; start <= ranksWithPairs.length - pairCount; start++) {
      const pairRanks = ranksWithPairs.slice(start, start + pairCount);
      if (!checkConsecutiveRanks(pairRanks).valid) continue;

      // For each rank, pick 2 cards
      const pairChoices = pairRanks.map(r => pickK(groups.get(r)!, 2));
      const pairSeqCombos = cartesianProductArrays(pairChoices);
      validPlays.push(...pairSeqCombos);
    }
  }

  // --- Filter ---
  const filtered = validPlays.filter(play => {
    const combo = classifyCombination(play);
    if (!combo) return false;

    if (mustIncludeThreeOfSpades && !containsThreeOfSpades(play)) return false;

    if (currentTrick !== null) {
      return canBeat(currentTrick, combo);
    }

    return true;
  });

  return filtered;
}

// Cartesian product: pick one from each array
function cartesianProduct(arrays: Card[][]): Card[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  const result: Card[][] = [];
  for (const item of first) {
    for (const combo of restProduct) {
      result.push([item, ...combo]);
    }
  }
  return result;
}

// Cartesian product where each element is already an array of cards (pair choices)
function cartesianProductArrays(arrays: Card[][][]): Card[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProductArrays(rest);
  const result: Card[][] = [];
  for (const pair of first) {
    for (const combo of restProduct) {
      result.push([...pair, ...combo]);
    }
  }
  return result;
}
