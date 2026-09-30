/**
 * Vstup z klávesnice pro hru, odolný vůči českému rozložení.
 *
 * - Znaky bere z události `input` skrytého <input> (funguje s mrtvými klávesami ˇ ´,
 *   Z/Y prohozením i libovolným rozložením OS — porovnáváme znaky, ne fyzické klávesy).
 * - `keydown` slouží jen pro Backspace / Escape a pro časové značky.
 * - Každý úhoz dostane časovou značku performance.now() pro metriky a detekci podvodů.
 */

export interface TypingHandlers {
  onChar: (ch: string, t: number) => void;
  onBackspace?: (t: number) => void;
  onEscape?: () => void;
}

export class TypingInput {
  private el: HTMLInputElement;
  private handlers: TypingHandlers;
  private composing = false;
  private disposed = false;

  constructor(container: HTMLElement, handlers: TypingHandlers) {
    this.handlers = handlers;
    const el = document.createElement("input");
    el.type = "text";
    el.autocomplete = "off";
    el.autocapitalize = "off";
    el.spellcheck = false;
    el.setAttribute("aria-label", "Vstup pro psaní");
    Object.assign(el.style, {
      position: "absolute",
      opacity: "0",
      left: "0",
      top: "0",
      width: "1px",
      height: "1px",
      pointerEvents: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(el);
    this.el = el;

    el.addEventListener("compositionstart", this.onCompStart);
    el.addEventListener("compositionend", this.onCompEnd);
    el.addEventListener("input", this.onInput);
    el.addEventListener("keydown", this.onKeyDown);
    el.addEventListener("blur", this.refocusSoon);
    container.addEventListener("pointerdown", this.focus);
    window.addEventListener("focus", this.focus);
    this.focus();
  }

  focus = () => {
    if (!this.disposed) this.el.focus({ preventScroll: true });
  };

  private refocusSoon = () => {
    setTimeout(this.focus, 0);
  };

  private onCompStart = () => {
    this.composing = true;
  };

  private onCompEnd = (e: CompositionEvent) => {
    this.composing = false;
    this.emitText(e.data ?? "");
    this.el.value = "";
  };

  private onInput = (e: Event) => {
    const ev = e as InputEvent;
    if (this.composing || ev.isComposing) return;
    if (ev.inputType === "insertText" || ev.inputType === "insertFromPaste") {
      // insertFromPaste záměrně nepočítáme jako úhozy
      if (ev.inputType === "insertText") this.emitText(ev.data ?? "");
    }
    this.el.value = "";
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      this.handlers.onBackspace?.(performance.now());
    } else if (e.key === "Escape") {
      this.handlers.onEscape?.();
    }
  };

  private emitText(text: string) {
    const t = performance.now();
    for (const ch of text.normalize("NFC")) {
      if (ch === "\n" || ch === "\r") continue;
      this.handlers.onChar(ch, t);
    }
  }

  dispose() {
    this.disposed = true;
    this.el.removeEventListener("compositionstart", this.onCompStart);
    this.el.removeEventListener("compositionend", this.onCompEnd);
    this.el.removeEventListener("input", this.onInput);
    this.el.removeEventListener("keydown", this.onKeyDown);
    this.el.removeEventListener("blur", this.refocusSoon);
    this.el.parentElement?.removeEventListener("pointerdown", this.focus);
    window.removeEventListener("focus", this.focus);
    this.el.remove();
  }
}
