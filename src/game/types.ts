import type { Game } from './game';

export type Ctx2D = CanvasRenderingContext2D;

export interface Light {
  x: number;
  y: number;
  r: number;
  warm?: boolean;
  flicker?: boolean;
  strength?: number;
  on(g: Game): boolean;
}

export interface Interactable {
  id: string;
  x: number;
  y?: number;
  radius?: number;
  label: string;
  enabled(g: Game): boolean;
  use(g: Game): void;
}

export interface Room {
  id: string;
  w: number;
  // Base darkness of the room, 0 (fully lit) to 1 (black). Lights cut through it.
  ambient: number;
  // Darkness once morning comes (the act2 flag). Falls back to ambient.
  ambientDay?: number;
  lights: Light[];
  items: Interactable[];
  draw(ctx: Ctx2D, g: Game): void;
}

export type Co = Generator<number | (() => boolean), void, unknown>;
