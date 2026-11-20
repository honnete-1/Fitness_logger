import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom lacks ResizeObserver (used by Recharts' ResponsiveContainer).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// requestAnimationFrame is used to move focus to the first invalid field.
globalThis.requestAnimationFrame ??= ((cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0)) as typeof requestAnimationFrame;
