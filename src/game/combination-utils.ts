import { Card, Combination, Rank } from '../types/game';
import { RANK_VALUES, RANKS } from './constants';
import { getCardValue } from './card-utils';

function getHighCardValue(combo: Combination): number {
  return Math.max(...combo.cards.map(c => getCardValue(c)));
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

function areConsecutiveRanks(ranks: Rank[]): boolean {
  const values = ranks.map(r => getRankValue(r)).sort((a, b) => a - b);
  if (values.some(v => v === 15)) return false;
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i - 1] !== 1) return false;
  }
  return true;
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
    if (areConsecutiveRanks(uniqueRanks)) {
      return { type: 'sequence', cards: sorted, highRank: highCard.rank, length: cards.length };
    }
  }

  if (cards.length >= 6 && cards.length % 2 === 0) {
    const allPairs = Array.from(groups.values()).every(g => g.length === 2);
    if (allPairs && uniqueRanks.length === cards.length / 2 && uniqueRanks.length >= 3) {
      if (areConsecutiveRanks(uniqueRanks)) {
        return { type: 'pair_sequence', cards: sorted, highRank: highCard.rank, length: uniqueRanks.length };
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
    // Another single 2 with higher suit can beat
    if (proposed.type === 'single' && proposed.highRank === '2') {
      return getHighCardValue(proposed) > getHighCardValue(current);
    }
    if (proposed.type === 'four_of_a_kind') return true;
    if (proposed.type === 'pair_sequence' && proposed.length >= 3) return true;
    return false;
  }

  if (isPairOfTwos(current)) {
    if (proposed.type === 'four_of_a_kind') return true;
    if (proposed.type === 'pair_sequence' && proposed.length >= 4) return true;
    return false;
  }

  if (proposed.type !== current.type) return false;

  if ((current.type === 'sequence' || current.type === 'pair_sequence') && proposed.length !== current.length) {
    return false;
  }

  // Compare by high card value (rank + suit) for proper ordering
  return getHighCardValue(proposed) > getHighCardValue(current);
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
  // Get sorted rank indices available in hand (exclude '2')
  const availableRanks = rankOrder
    .filter(r => r !== '2')
    .sort((a, b) => getRankValue(a) - getRankValue(b));

  for (let seqLen = 3; seqLen <= availableRanks.length; seqLen++) {
    for (let start = 0; start <= availableRanks.length - seqLen; start++) {
      const seqRanks = availableRanks.slice(start, start + seqLen);
      // Check consecutive
      const values = seqRanks.map(r => getRankValue(r));
      let consecutive = true;
      for (let i = 1; i < values.length; i++) {
        if (values[i] - values[i - 1] !== 1) {
          consecutive = false;
          break;
        }
      }
      if (!consecutive) continue;

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
      const values = pairRanks.map(r => getRankValue(r));
      let consecutive = true;
      for (let i = 1; i < values.length; i++) {
        if (values[i] - values[i - 1] !== 1) {
          consecutive = false;
          break;
        }
      }
      if (!consecutive) continue;

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
