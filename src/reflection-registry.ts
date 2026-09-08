type ReflectKind = 'text' | 'button' | 'image' | 'edge';

type Emitter = {
  element: HTMLElement;
  kind: ReflectKind;
  rect: DOMRect;
  strength: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, r);
}

function numberFrom(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class ReflectionRegistry {
  readonly canvas = document.createElement('canvas');
  private readonly source = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d', { alpha: true });
  private readonly sourceContext = this.source.getContext('2d', { alpha: true });
  private scale = 0.5;
  private viewportWidth = 1;
  private viewportHeight = 1;

  resize(width: number, height: number, scale: number) {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.scale = clamp(scale, 0.32, 0.58);
    const bufferWidth = Math.max(1, Math.round(width * this.scale));
    const bufferHeight = Math.max(1, Math.round(height * this.scale));
    if (this.canvas.width === bufferWidth && this.canvas.height === bufferHeight) return false;
    this.canvas.width = bufferWidth;
    this.canvas.height = bufferHeight;
    this.source.width = bufferWidth;
    this.source.height = bufferHeight;
    return true;
  }

  paint() {
    const context = this.context;
    const sourceContext = this.sourceContext;
    if (!context || !sourceContext) return;

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    sourceContext.clearRect(0, 0, this.source.width, this.source.height);

    const emitters = [...document.querySelectorAll<HTMLElement>('[data-reflect]')]
      .map((element): Emitter | null => {
        const rect = element.getBoundingClientRect();
        if (
          rect.width < 2 ||
          rect.height < 2 ||
          rect.bottom < -rect.height * 2.5 ||
          rect.top > this.viewportHeight + rect.height * 0.4
        ) {
          return null;
        }
        const rawKind = element.dataset.reflect;
        const kind: ReflectKind =
          rawKind === 'button' || rawKind === 'image' || rawKind === 'edge'
            ? rawKind
            : 'text';
        return {
          element,
          kind,
          rect,
          strength: clamp(numberFrom(element.dataset.reflectStrength, 0.78), 0.1, 1.2),
        };
      })
      .filter((emitter): emitter is Emitter => emitter !== null);

    emitters.forEach((emitter) => this.drawSource(sourceContext, emitter));
    emitters.forEach((emitter) => this.drawReflection(context, emitter));
  }

  private drawSource(context: CanvasRenderingContext2D, emitter: Emitter) {
    const { element, kind, rect } = emitter;
    const style = getComputedStyle(element);
    const x = rect.left * this.scale;
    const y = rect.top * this.scale;
    const width = rect.width * this.scale;
    const height = rect.height * this.scale;
    const color = element.dataset.reflectColor || style.color || '#5AACD1';

    context.save();
    context.globalCompositeOperation = 'lighter';

    if (kind === 'image') {
      const image =
        element instanceof HTMLImageElement
          ? element
          : element.querySelector<HTMLImageElement>('img');
      if (image?.complete && image.naturalWidth > 0) {
        context.globalAlpha = 0.9;
        context.drawImage(image, x, y, width, height);
      }
      context.restore();
      return;
    }

    if (kind === 'edge') {
      context.strokeStyle = color;
      context.lineWidth = Math.max(1, this.scale * 1.4);
      context.globalAlpha = 0.8;
      roundedRect(
        context,
        x + context.lineWidth,
        y + context.lineWidth,
        width - context.lineWidth * 2,
        height - context.lineWidth * 2,
        numberFrom(style.borderRadius, 12) * this.scale,
      );
      context.stroke();
      context.restore();
      return;
    }

    if (kind === 'button') {
      const background = element.dataset.reflectColor || style.backgroundColor || color;
      context.fillStyle = background;
      context.globalAlpha = 0.9;
      roundedRect(
        context,
        x,
        y,
        width,
        height,
        numberFrom(style.borderRadius, 6) * this.scale,
      );
      context.fill();
    }

    const fontSize = Math.max(8, numberFrom(style.fontSize, 16) * this.scale);
    const lineHeightRaw = numberFrom(style.lineHeight, fontSize / this.scale * 1.12);
    const lineHeight = Math.max(fontSize, lineHeightRaw * this.scale);
    context.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    context.fillStyle = kind === 'button' ? style.color : color;
    context.textBaseline = 'top';
    context.globalAlpha = kind === 'button' ? 0.96 : 0.9;

    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      context.restore();
      return;
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);

    const blockHeight = lines.length * lineHeight;
    let textY =
      kind === 'button'
        ? y + Math.max(0, (height - blockHeight) / 2)
        : y + Math.max(0, (height - blockHeight) * 0.12);
    lines.forEach((currentLine) => {
      let textX = x;
      if (kind === 'button' || style.textAlign === 'center') {
        textX += Math.max(0, (width - context.measureText(currentLine).width) / 2);
      } else if (style.textAlign === 'right') {
        textX += Math.max(0, width - context.measureText(currentLine).width);
      }
      context.fillText(currentLine, textX, textY, width);
      textY += lineHeight;
    });

    context.restore();
  }

  private drawReflection(context: CanvasRenderingContext2D, emitter: Emitter) {
    const { rect, strength } = emitter;
    const x = rect.left * this.scale;
    const width = rect.width * this.scale;
    const sourceY = rect.top * this.scale;
    const sourceHeight = rect.height * this.scale;
    const originY = (rect.bottom + Math.min(18, rect.height * 0.12)) * this.scale;

    const passes = emitter.kind === 'edge' ? 2 : 3;
    for (let pass = 0; pass < passes; pass += 1) {
      const stretch = 1.08 + pass * 0.34;
      const drift = pass * 1.8 * this.scale;
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = strength * (pass === 0 ? 0.42 : 0.12 / pass);
      context.translate(x + drift, originY + pass * sourceHeight * 0.12);
      context.scale(1, -1);
      context.drawImage(
        this.source,
        x,
        sourceY,
        width,
        sourceHeight,
        0,
        -sourceHeight * stretch,
        width,
        sourceHeight * stretch,
      );
      context.restore();
    }
  }
}
