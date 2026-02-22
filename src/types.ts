/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Color = 'white' | 'black';

export enum PieceType {
  PAWN = 'pawn',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  ROOK = 'rook',
  QUEEN = 'queen',
  KING = 'king',
}

export interface Piece {
  type: PieceType;
  color: Color;
  id: string; // To track pieces for animations/keys
  hasMoved?: boolean;
}

export type Square = Piece | null;

export type Board = Square[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  isCastling?: boolean;
  isEnPassant?: boolean;
  promotion?: PieceType;
}

export interface GameState {
  board: Board;
  turn: Color;
  selectedPosition: Position | null;
  validMoves: Position[];
  history: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  lastMove: Move | null;
}
