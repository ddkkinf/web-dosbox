/* eslint-disable @typescript-eslint/no-explicit-any */
import { once, load } from "nano-loader";

const baseUrl = import.meta.env.BASE_URL || "./";
const loadJsDos = once(() => load(`${baseUrl}static/js-dos/js-dos.js?v=3`));

export interface CreateDosOptions {
  cycles?: number | string;
  autolock?: boolean;
}

export async function createDos(
  canvas: HTMLCanvasElement,
  options?: CreateDosOptions,
): Promise<{ fs: any; main: any }> {
  await loadJsDos();

  return await new Promise((resolve) => {
    window
      .Dos(canvas, {
        wdosboxUrl: `${baseUrl}static/js-dos/wdosbox.js`,
        SDL_numSimultaneouslyQueuedBuffers: 3,
        cycles: options?.cycles ?? "max",
        autolock: options?.autolock ?? false,
      } as Record<string, unknown>)
      .ready((fs, main) => resolve({ fs, main }));
  });
}

export function applyMove(elem: HTMLDivElement, consumer: any) {
  window.DosController.Move(elem, consumer);
}
