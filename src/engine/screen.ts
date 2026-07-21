export const W = 960;
export const H = 540;

export interface Screen {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  light: HTMLCanvasElement;
  lctx: CanvasRenderingContext2D;
}

export function createScreen(): Screen {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const light = document.createElement('canvas');
  light.width = W;
  light.height = H;
  const lctx = light.getContext('2d')!;

  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
  };
  addEventListener('resize', fit);
  fit();

  return { canvas, ctx, light, lctx };
}
