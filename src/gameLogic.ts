import { Board, Color, Piece, PieceType, Position, Move, Square } from './types';

export const INITIAL_BOARD: Board = createInitialBoard();

function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const setupRow = (row: number, color: Color) => {
    const pieces = [
      PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
      PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
    ];
    pieces.forEach((type, col) => {
      board[row][col] = { type, color, id: `${color}-${type}-${col}`, hasMoved: false };
    });
  };

  const setupPawns = (row: number, color: Color) => {
    for (let col = 0; col < 8; col++) {
      board[row][col] = { type: PieceType.PAWN, color, id: `${color}-pawn-${col}`, hasMoved: false };
    }
  };

  setupRow(0, 'black');
  setupPawns(1, 'black');
  setupPawns(6, 'white');
  setupRow(7, 'white');

  return board;
}

export const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  white: {
    pawn: '♙',
    knight: '♘',
    bishop: '♗',
    rook: '♖',
    queen: '♕',
    king: '♔',
  },
  black: {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚',
  },
};

export function isWithinBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

export function arePositionsEqual(p1: Position | null, p2: Position | null): boolean {
  if (!p1 || !p2) return false;
  return p1.row === p2.row && p1.col === p2.col;
}

export function getPieceAt(board: Board, pos: Position): Square {
  return board[pos.row][pos.col];
}

export function getValidMoves(board: Board, pos: Position, lastMove: Move | null, checkCheck: boolean = true): Position[] {
  const piece = getPieceAt(board, pos);
  if (!piece) return [];

  let moves: Position[] = [];

  switch (piece.type) {
    case PieceType.PAWN:
      moves = getPawnMoves(board, pos, piece, lastMove);
      break;
    case PieceType.KNIGHT:
      moves = getKnightMoves(board, pos, piece);
      break;
    case PieceType.BISHOP:
      moves = getSlidingMoves(board, pos, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case PieceType.ROOK:
      moves = getSlidingMoves(board, pos, piece, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      break;
    case PieceType.QUEEN:
      moves = getSlidingMoves(board, pos, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
      break;
    case PieceType.KING:
      moves = getKingMoves(board, pos, piece, checkCheck);
      break;
  }

  if (checkCheck) {
    // Filter moves that would put or leave the king in check
    return moves.filter(move => {
      const newBoard = simulateMove(board, pos, move);
      return !isKingInCheck(newBoard, piece.color, lastMove);
    });
  }

  return moves;
}

function getPawnMoves(board: Board, pos: Position, piece: Piece, lastMove: Move | null): Position[] {
  const moves: Position[] = [];
  const direction = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;

  // Forward move
  const forward1 = { row: pos.row + direction, col: pos.col };
  if (isWithinBoard(forward1) && !getPieceAt(board, forward1)) {
    moves.push(forward1);
    
    // Double forward move
    const forward2 = { row: pos.row + 2 * direction, col: pos.col };
    if (pos.row === startRow && !getPieceAt(board, forward2)) {
      moves.push(forward2);
    }
  }

  // Captures
  const captures = [
    { row: pos.row + direction, col: pos.col - 1 },
    { row: pos.row + direction, col: pos.col + 1 }
  ];

  captures.forEach(cap => {
    if (isWithinBoard(cap)) {
      const target = getPieceAt(board, cap);
      if (target && target.color !== piece.color) {
        moves.push(cap);
      }
      
      // En Passant
      if (!target && lastMove && lastMove.piece.type === PieceType.PAWN && 
          Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
          lastMove.to.row === pos.row && lastMove.to.col === cap.col) {
        moves.push(cap);
      }
    }
  });

  return moves;
}

function getKnightMoves(board: Board, pos: Position, piece: Piece): Position[] {
  const moves: Position[] = [];
  const offsets = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
  ];

  offsets.forEach(([dr, dc]) => {
    const newPos = { row: pos.row + dr, col: pos.col + dc };
    if (isWithinBoard(newPos)) {
      const target = getPieceAt(board, newPos);
      if (!target || target.color !== piece.color) {
        moves.push(newPos);
      }
    }
  });

  return moves;
}

function getSlidingMoves(board: Board, pos: Position, piece: Piece, directions: number[][]): Position[] {
  const moves: Position[] = [];

  directions.forEach(([dr, dc]) => {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isWithinBoard({ row: r, col: c })) {
      const target = getPieceAt(board, { row: r, col: c });
      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  });

  return moves;
}

function getKingMoves(board: Board, pos: Position, piece: Piece, checkCheck: boolean): Position[] {
  const moves: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const newPos = { row: pos.row + dr, col: pos.col + dc };
      if (isWithinBoard(newPos)) {
        const target = getPieceAt(board, newPos);
        if (!target || target.color !== piece.color) {
          moves.push(newPos);
        }
      }
    }
  }

  // Castling
  if (checkCheck && !piece.hasMoved && !isKingInCheck(board, piece.color, null)) {
    // Kingside
    const rookK = getPieceAt(board, { row: pos.row, col: 7 });
    if (rookK && rookK.type === PieceType.ROOK && !rookK.hasMoved) {
      if (!getPieceAt(board, { row: pos.row, col: 5 }) && !getPieceAt(board, { row: pos.row, col: 6 })) {
        // Check if passing through check
        if (!isKingInCheck(simulateMove(board, pos, { row: pos.row, col: 5 }), piece.color, null)) {
          moves.push({ row: pos.row, col: 6 });
        }
      }
    }
    // Queenside
    const rookQ = getPieceAt(board, { row: pos.row, col: 0 });
    if (rookQ && rookQ.type === PieceType.ROOK && !rookQ.hasMoved) {
      if (!getPieceAt(board, { row: pos.row, col: 1 }) && !getPieceAt(board, { row: pos.row, col: 2 }) && !getPieceAt(board, { row: pos.row, col: 3 })) {
        if (!isKingInCheck(simulateMove(board, pos, { row: pos.row, col: 3 }), piece.color, null)) {
          moves.push({ row: pos.row, col: 2 });
        }
      }
    }
  }

  return moves;
}

export function simulateMove(board: Board, from: Position, to: Position): Board {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];
  if (!piece) return newBoard;

  // Handle Castling in simulation
  if (piece.type === PieceType.KING && Math.abs(from.col - to.col) === 2) {
    const isKingside = to.col === 6;
    const rookFromCol = isKingside ? 7 : 0;
    const rookToCol = isKingside ? 5 : 3;
    const rook = newBoard[from.row][rookFromCol];
    newBoard[from.row][rookToCol] = rook;
    newBoard[from.row][rookFromCol] = null;
  }

  // Handle En Passant in simulation
  if (piece.type === PieceType.PAWN && from.col !== to.col && !newBoard[to.row][to.col]) {
    newBoard[from.row][to.col] = null;
  }

  newBoard[to.row][to.col] = { ...piece, hasMoved: true };
  newBoard[from.row][from.col] = null;
  return newBoard;
}

export function isKingInCheck(board: Board, color: Color, lastMove: Move | null): boolean {
  let kingPos: Position | null = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === PieceType.KING && p.color === color) {
        kingPos = { row: r, col: c };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === opponentColor) {
        const moves = getValidMoves(board, { row: r, col: c }, lastMove, false);
        if (moves.some(m => arePositionsEqual(m, kingPos))) {
          return true;
        }
      }
    }
  }

  return false;
}

export function canMove(board: Board, color: Color, lastMove: Move | null): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = getValidMoves(board, { row: r, col: c }, lastMove, true);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}
