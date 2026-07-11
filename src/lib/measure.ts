import type { Block } from "./types";

export interface MeasurerStyle {
  widthPx: number;
  fontSizePx: number;
  lineHeight: number;
  headingScale: number; // heading font = fontSizePx * headingScale
}

/** Creates an offscreen measurer that reports rendered height (px) for a block's text. */
export function createMeasurer(style: MeasurerStyle) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    left: "-9999px",
    top: "0",
    width: `${style.widthPx}px`,
    lineHeight: String(style.lineHeight),
    fontFamily: "system-ui, -apple-system, sans-serif",
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "break-word",
    boxSizing: "border-box",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);

  const measure = (text: string, type: Block["type"]): number => {
    el.style.fontSize = `${type === "heading" ? style.fontSizePx * style.headingScale : style.fontSizePx}px`;
    el.style.fontWeight = type === "heading" ? "700" : "400";
    el.textContent = text;
    return el.getBoundingClientRect().height;
  };

  const destroy = () => el.remove();
  return { measure, destroy };
}
