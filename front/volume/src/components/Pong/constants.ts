import { Point } from "./utils";

export const GAME_EVENTS = {
  START_GAME: "START_GAME",
  READY: "READY",
  GAME_TICK: "GAME_TICK",
  PLAYER_MOVE: "PLAYER_MOVE",
  GET_GAME_INFO: "GET_GAME_INFO",
  CREATE_GAME: "CREATE_GAME",
  REGISTER_PLAYER: "REGISTER_PLAYER",
  SPECTATE: "SPECTATE",
};

export const DEFAULT_MAP_SIZE = new Point(600, 400);
export const DEFAULT_PADDLE_SIZE = new Point(6, 50);
export const DEFAULT_BALL_SIZE = new Point(20, 20);
export const DEFAULT_PLAYER_X_OFFSET = 50;
export const DEFAULT_WIN_SCORE = 5;
