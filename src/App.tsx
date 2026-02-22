/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { 
  Board, Color, Piece, PieceType, Position, Move, GameState 
} from './types';
import { 
  INITIAL_BOARD, PIECE_SYMBOLS, isWithinBoard, arePositionsEqual, 
  getPieceAt, getValidMoves, simulateMove, isKingInCheck, canMove 
} from './gameLogic';

const ALGEBRAIC_COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ALGEBRAIC_ROWS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_BOARD,
    turn: 'white',
    selectedPosition: null,
    validMoves: [],
    history: [],
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    lastMove: null,
  });

  const [promotionPending, setPromotionPending] = useState<{ from: Position, to: Position } | null>(null);

  const resetGame = () => {
    setGameState({
      board: INITIAL_BOARD,
      turn: 'white',
      selectedPosition: null,
      validMoves: [],
      history: [],
      isCheck: false,
      isCheckmate: false,
      isDraw: false,
      lastMove: null,
    });
    setPromotionPending(null);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameState.isCheckmate || gameState.isDraw || promotionPending) return;

    const clickedPos = { row, col };
    const clickedPiece = getPieceAt(gameState.board, clickedPos);

    // If a piece is already selected and we click a valid move square
    if (gameState.selectedPosition && gameState.validMoves.some(m => arePositionsEqual(m, clickedPos))) {
      executeMove(gameState.selectedPosition, clickedPos);
      return;
    }

    // Select a piece of the current player's color
    if (clickedPiece && clickedPiece.color === gameState.turn) {
      const moves = getValidMoves(gameState.board, clickedPos, gameState.lastMove);
      setGameState(prev => ({
        ...prev,
        selectedPosition: clickedPos,
        validMoves: moves,
      }));
    } else {
      // Deselect if clicking empty or opponent's piece
      setGameState(prev => ({
        ...prev,
        selectedPosition: null,
        validMoves: [],
      }));
    }
  };

  const executeMove = (from: Position, to: Position, promotionType?: PieceType) => {
    const piece = getPieceAt(gameState.board, from)!;
    const captured = getPieceAt(gameState.board, to);
    
    // Check for promotion
    if (!promotionType && piece.type === PieceType.PAWN && (to.row === 0 || to.row === 7)) {
      setPromotionPending({ from, to });
      return;
    }

    let newBoard = simulateMove(gameState.board, from, to);
    
    // Finalize promotion if needed
    if (promotionType) {
      newBoard[to.row][to.col] = { ...newBoard[to.row][to.col]!, type: promotionType };
    }

    const nextTurn = gameState.turn === 'white' ? 'black' : 'white';
    const isCheck = isKingInCheck(newBoard, nextTurn, { from, to, piece });
    const hasMoves = canMove(newBoard, nextTurn, { from, to, piece });
    
    const move: Move = {
      from,
      to,
      piece,
      captured: captured || undefined,
      promotion: promotionType,
    };

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      turn: nextTurn,
      selectedPosition: null,
      validMoves: [],
      history: [...prev.history, move],
      lastMove: move,
      isCheck,
      isCheckmate: isCheck && !hasMoves,
      isDraw: !isCheck && !hasMoves,
    }));
    
    setPromotionPending(null);
  };

  const handlePromotion = (type: PieceType) => {
    if (promotionPending) {
      executeMove(promotionPending.from, promotionPending.to, type);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-4 font-sans">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center justify-center gap-3">
          <Trophy className="text-yellow-500" />
          Grandmaster Chess
        </h1>
        <div className="flex items-center justify-center gap-4 text-sm uppercase tracking-widest opacity-70">
          <span className={gameState.turn === 'white' ? 'text-white font-bold' : ''}>White</span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className={gameState.turn === 'black' ? 'text-white font-bold' : ''}>Black</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Game Board */}
        <div className="relative group">
          <div className="bg-[#2a2a2a] p-2 rounded-lg shadow-2xl border border-white/10">
            <div className="grid grid-cols-[30px_repeat(8,minmax(40px,70px))_30px] grid-rows-[30px_repeat(8,minmax(40px,70px))_30px]">
              {/* Top Labels */}
              <div />
              {ALGEBRAIC_COLS.map(col => (
                <div key={col} className="flex items-center justify-center text-[10px] font-mono opacity-40">{col}</div>
              ))}
              <div />

              {/* Board Rows */}
              {gameState.board.map((row, rIdx) => (
                <React.Fragment key={rIdx}>
                  {/* Left Label */}
                  <div className="flex items-center justify-center text-[10px] font-mono opacity-40">{ALGEBRAIC_ROWS[rIdx]}</div>
                  
                  {row.map((square, cIdx) => {
                    const isDark = (rIdx + cIdx) % 2 === 1;
                    const isSelected = arePositionsEqual(gameState.selectedPosition, { row: rIdx, col: cIdx });
                    const isValidMove = gameState.validMoves.some(m => arePositionsEqual(m, { row: rIdx, col: cIdx }));
                    const isLastMove = gameState.lastMove && (arePositionsEqual(gameState.lastMove.from, { row: rIdx, col: cIdx }) || arePositionsEqual(gameState.lastMove.to, { row: rIdx, col: cIdx }));
                    const isKingCheck = gameState.isCheck && square?.type === PieceType.KING && square?.color === gameState.turn;

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handleSquareClick(rIdx, cIdx)}
                        className={`
                          relative flex items-center justify-center cursor-pointer transition-colors duration-200
                          ${isDark ? 'bg-[#769656]' : 'bg-[#eeeed2]'}
                          ${isSelected ? 'ring-4 ring-inset ring-yellow-400 z-10' : ''}
                          ${isLastMove ? 'after:absolute after:inset-0 after:bg-yellow-400/30' : ''}
                          ${isKingCheck ? 'bg-red-500/80' : ''}
                        `}
                        style={{ aspectRatio: '1/1' }}
                      >
                        {/* Valid Move Indicator */}
                        {isValidMove && (
                          <div className={`absolute w-4 h-4 rounded-full ${square ? 'border-4 border-black/10' : 'bg-black/10'}`} />
                        )}

                        {/* Piece */}
                        <AnimatePresence mode="popLayout">
                          {square && (
                            <motion.span
                              key={square.id}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className={`
                                text-4xl sm:text-5xl select-none z-20
                                ${square.color === 'white' ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]' : 'text-black'}
                              `}
                            >
                              {PIECE_SYMBOLS[square.color][square.type]}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* Right Label */}
                  <div className="flex items-center justify-center text-[10px] font-mono opacity-40">{ALGEBRAIC_ROWS[rIdx]}</div>
                </React.Fragment>
              ))}

              {/* Bottom Labels */}
              <div />
              {ALGEBRAIC_COLS.map(col => (
                <div key={col} className="flex items-center justify-center text-[10px] font-mono opacity-40">{col}</div>
              ))}
              <div />
            </div>
          </div>

          {/* Promotion Modal */}
          <AnimatePresence>
            {promotionPending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
              >
                <div className="bg-[#2a2a2a] p-6 rounded-xl border border-white/20 shadow-2xl text-center">
                  <h3 className="text-lg font-bold mb-4">Promote Pawn</h3>
                  <div className="flex gap-4">
                    {[PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT].map(type => (
                      <button
                        key={type}
                        onClick={() => handlePromotion(type)}
                        className="w-16 h-16 flex items-center justify-center text-4xl bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {PIECE_SYMBOLS[gameState.turn][type]}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {(gameState.isCheckmate || gameState.isDraw) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-lg text-center p-8"
              >
                <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">
                  {gameState.isCheckmate ? 'Checkmate!' : 'Stalemate!'}
                </h2>
                <p className="text-xl opacity-70 mb-8">
                  {gameState.isCheckmate 
                    ? `${gameState.turn === 'white' ? 'Black' : 'White'} wins the game.` 
                    : 'The game ended in a draw.'}
                </p>
                <button
                  onClick={resetGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-yellow-400 transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar / Info */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Status Card */}
          <div className="bg-[#2a2a2a] p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest opacity-50">Current Turn</h2>
              {gameState.isCheck && !gameState.isCheckmate && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30 animate-pulse">
                  IN CHECK
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-3xl ${gameState.turn === 'white' ? 'bg-white text-black' : 'bg-black text-white border border-white/20'}`}>
                {PIECE_SYMBOLS[gameState.turn][PieceType.KING]}
              </div>
              <div>
                <div className="text-xl font-bold capitalize">{gameState.turn}'s Move</div>
                <div className="text-xs opacity-50">Think carefully...</div>
              </div>
            </div>
          </div>

          {/* History Card */}
          <div className="bg-[#2a2a2a] rounded-xl border border-white/10 flex-1 flex flex-col overflow-hidden max-h-[400px]">
            <div className="p-4 border-bottom border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold opacity-50">
                <History size={16} />
                MOVE HISTORY
              </div>
              <button onClick={resetGame} className="p-2 hover:bg-white/5 rounded-lg transition-colors opacity-50 hover:opacity-100">
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {gameState.history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs opacity-30 italic">
                  No moves yet
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs">
                        <span className="opacity-30">{i + 1}.</span>
                        <span>{PIECE_SYMBOLS.white[gameState.history[i * 2].piece.type]}</span>
                        <span className="font-mono">
                          {ALGEBRAIC_COLS[gameState.history[i * 2].from.col]}{ALGEBRAIC_ROWS[gameState.history[i * 2].from.row]}
                          →
                          {ALGEBRAIC_COLS[gameState.history[i * 2].to.col]}{ALGEBRAIC_ROWS[gameState.history[i * 2].to.row]}
                        </span>
                      </div>
                      {gameState.history[i * 2 + 1] && (
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs">
                          <span className="opacity-30"></span>
                          <span>{PIECE_SYMBOLS.black[gameState.history[i * 2 + 1].piece.type]}</span>
                          <span className="font-mono">
                            {ALGEBRAIC_COLS[gameState.history[i * 2 + 1].from.col]}{ALGEBRAIC_ROWS[gameState.history[i * 2 + 1].from.row]}
                            →
                            {ALGEBRAIC_COLS[gameState.history[i * 2 + 1].to.col]}{ALGEBRAIC_ROWS[gameState.history[i * 2 + 1].to.row]}
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-[10px] opacity-30 uppercase tracking-[0.2em]">
        Grandmaster Chess Engine v1.0 • Built with React & Tailwind
      </footer>
    </div>
  );
}
