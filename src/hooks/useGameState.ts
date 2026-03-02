import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card } from '../types/game';
import type { GameStatePayload } from '../types/socket-events';
import { classifyCombination, canBeat, wouldLeaveOnlyTwos } from '../game/combination-utils';

export function useGameState(
  gameState: GameStatePayload | null,
  playCards: (cardIds: string[]) => void,
  passAction: () => void,
) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phase = gameState?.phase ?? null;

  const isMyTurn = gameState
    ? gameState.currentPlayerId === gameState.myPlayerId &&
      (phase === 'playing' || phase === 'sam_playing')
    : false;

  const isSamPlayer = gameState
    ? gameState.samPlayerId === gameState.myPlayerId
    : false;

  const isHost = gameState
    ? gameState.hostId === gameState.myPlayerId
    : false;

  const selectedCards = useMemo(() => {
    if (!gameState) return [];
    return gameState.myHand.filter(c => selectedCardIds.has(c.id));
  }, [gameState, selectedCardIds]);

  const canPlay = useMemo(() => {
    if (!isMyTurn || selectedCards.length === 0 || !gameState) return false;

    const combo = classifyCombination(selectedCards);
    if (!combo) return false;

    // Cannot leave only 2s in hand
    if (wouldLeaveOnlyTwos(gameState.myHand, selectedCards)) return false;

    if (gameState.currentTrick) {
      // During sam_playing, sam player plays freely (no need to beat own trick)
      if (phase === 'sam_playing' && isSamPlayer) {
        return true;
      }
      return canBeat(gameState.currentTrick.combination, combo);
    }

    return true;
  }, [isMyTurn, selectedCards, gameState, phase, isSamPlayer]);

  const canPass = useMemo(() => {
    if (!isMyTurn || !gameState) return false;
    // Sam player cannot pass
    if (phase === 'sam_playing' && isSamPlayer) return false;
    if (gameState.currentTrick === null) return false;
    return true;
  }, [isMyTurn, gameState, phase, isSamPlayer]);

  const toggleCardSelection = useCallback((card: Card) => {
    if (!isMyTurn) return;
    setErrorMessage(null);
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.add(card.id);
      }
      return next;
    });
  }, [isMyTurn]);

  const handlePlay = useCallback(() => {
    if (!isMyTurn || selectedCards.length === 0 || !gameState) return;

    const combo = classifyCombination(selectedCards);
    if (!combo) {
      setErrorMessage('Bài không hợp lệ!');
      return;
    }

    if (wouldLeaveOnlyTwos(gameState.myHand, selectedCards)) {
      setErrorMessage('Không được để lại chỉ toàn lá 2!');
      return;
    }

    if (gameState.currentTrick) {
      // During sam play, sam player plays freely
      if (!(phase === 'sam_playing' && isSamPlayer)) {
        if (!canBeat(gameState.currentTrick.combination, combo)) {
          setErrorMessage('Bài không đủ lớn!');
          return;
        }
      }
    }

    playCards(selectedCards.map(c => c.id));
    setSelectedCardIds(new Set());
    setErrorMessage(null);
  }, [isMyTurn, selectedCards, gameState, playCards, phase, isSamPlayer]);

  const handlePass = useCallback(() => {
    if (!canPass) return;
    passAction();
    setSelectedCardIds(new Set());
    setErrorMessage(null);
  }, [canPass, passAction]);

  // Clear selection when current player changes (new turn)
  const prevCurrentPlayerRef = useRef(gameState?.currentPlayerId);
  useEffect(() => {
    if (gameState?.currentPlayerId !== prevCurrentPlayerRef.current) {
      prevCurrentPlayerRef.current = gameState?.currentPlayerId;
      setSelectedCardIds(new Set());
      setErrorMessage(null);
    }
  }, [gameState?.currentPlayerId]);

  return {
    selectedCardIds,
    toggleCardSelection,
    handlePlay,
    handlePass,
    canPlay,
    canPass,
    isMyTurn,
    isHost,
    isSamPlayer,
    errorMessage,
  };
}
