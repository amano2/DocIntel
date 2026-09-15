import { animate, stagger } from 'animejs';

/**
 * Animates a numeric counter smoothly counting up from 0 to targetVal
 * with custom prefix (e.g. '$'), suffix (e.g. '%', ' hrs'), and decimal precision.
 */
export function animateCounter(
  element: HTMLElement | null,
  targetValue: number,
  options?: {
    duration?: number;
    delay?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    formatComma?: boolean;
    easing?: string;
  }
) {
  if (!element) return;

  const duration = options?.duration ?? 1400;
  const delay = options?.delay ?? 80;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  const decimals = options?.decimals ?? 0;
  const formatComma = options?.formatComma ?? true;
  const ease = (options?.easing as any) ?? 'outExpo';

  const obj = { val: 0 };

  animate(obj, {
    val: targetValue,
    duration,
    delay,
    ease,
    onUpdate: () => {
      let formatted: string;
      if (decimals > 0) {
        formatted = obj.val.toFixed(decimals);
        if (formatComma) {
          const parts = formatted.split('.');
          parts[0] = Number(parts[0]).toLocaleString();
          formatted = parts.join('.');
        }
      } else {
        formatted = formatComma ? Math.round(obj.val).toLocaleString() : String(Math.round(obj.val));
      }
      element.textContent = `${prefix}${formatted}${suffix}`;
    }
  });
}

/**
 * Animates chart bars with a staggered upward pop-in and glowing backlit reveal.
 */
export function animateStaggeredBars(
  selectorOrElements: string | HTMLElement[] | NodeListOf<Element>,
  options?: {
    delayStep?: number;
    duration?: number;
    direction?: 'up' | 'width';
  }
) {
  const delayStep = options?.delayStep ?? 70;
  const duration = options?.duration ?? 900;
  const direction = options?.direction ?? 'up';

  if (direction === 'up') {
    animate(selectorOrElements as any, {
      scaleY: [0, 1],
      opacity: [0, 1],
      delay: stagger(delayStep),
      duration,
      ease: 'outElastic(1, .8)',
      onBegin: (self) => {
        self.targets.forEach((t: any) => {
          if (t && t.style) t.style.transformOrigin = 'bottom center';
        });
      }
    });
  } else {
    animate(selectorOrElements as any, {
      scaleX: [0, 1],
      opacity: [0, 1],
      delay: stagger(delayStep),
      duration,
      ease: 'outCubic',
      onBegin: (self) => {
        self.targets.forEach((t: any) => {
          if (t && t.style) t.style.transformOrigin = 'left center';
        });
      }
    });
  }
}

/**
 * Traces an SVG path or circle stroke with illuminated dashoffset animation.
 */
export function animateSvgStroke(
  pathElement: SVGPathElement | SVGCircleElement | null,
  options?: {
    duration?: number;
    delay?: number;
    easing?: string;
  }
) {
  if (!pathElement) return;

  const duration = options?.duration ?? 1600;
  const delay = options?.delay ?? 150;
  const ease = (options?.easing as any) ?? 'outCubic';

  try {
    const totalLength = (pathElement as any).getTotalLength ? (pathElement as any).getTotalLength() : 300;
    pathElement.style.strokeDasharray = `${totalLength}`;
    pathElement.style.strokeDashoffset = `${totalLength}`;

    animate(pathElement, {
      strokeDashoffset: [totalLength, 0],
      ease,
      duration,
      delay
    });
  } catch {
    // Fallback if SVG element is not yet rendered in DOM
  }
}

/**
 * Applies a gentle breathing backlit glow animation to a telemetry element.
 */
export function animateBacklitHalo(
  element: HTMLElement | null,
  color: string = 'rgba(197, 179, 88, 0.45)'
) {
  if (!element) return;

  animate(element, {
    boxShadow: [
      `0 0 15px 2px ${color}`,
      `0 0 45px 12px ${color}`,
      `0 0 15px 2px ${color}`
    ],
    duration: 3200,
    alternate: true,
    loop: true,
    ease: 'inOutSine'
  });
}

