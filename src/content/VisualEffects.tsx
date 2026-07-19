import { useEffect, useRef } from 'react';

import type { AppSettings } from '../shared/types/settings';

export type VisualEffectMode = AppSettings['ui']['visualEffect'];

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  wobble: number;
  phase: number;
  phaseSpeed: number;
  depth: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  variant: number;
}

const EFFECT_LIMITS: Record<
  Exclude<VisualEffectMode, 'off'>,
  { density: number; min: number; max: number }
> = {
  snow: { density: 28_000, min: 14, max: 64 },
  sakura: { density: 42_000, min: 10, max: 42 },
  rain: { density: 17_000, min: 24, max: 110 },
  mushroom: { density: 54_000, min: 8, max: 30 },
  dandelion: { density: 44_000, min: 10, max: 38 },
};

export function visualEffectParticleCount(
  effect: VisualEffectMode,
  width: number,
  height: number,
): number {
  if (effect === 'off' || width <= 0 || height <= 0) return 0;
  const limits = EFFECT_LIMITS[effect];
  const mobileScale = width < 640 ? 0.72 : 1;
  return Math.round(
    Math.min(limits.max, Math.max(limits.min, (width * height * mobileScale) / limits.density)),
  );
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticle(
  effect: Exclude<VisualEffectMode, 'off'>,
  width: number,
  height: number,
): Particle {
  const isRain = effect === 'rain';
  const isSakura = effect === 'sakura';
  const isMushroom = effect === 'mushroom';
  const isDandelion = effect === 'dandelion';
  const depth = Math.pow(Math.random(), 0.72);
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: isRain
      ? randomBetween(0.7, 1.45)
      : isSakura
        ? randomBetween(4, 8)
        : isMushroom
          ? randomBetween(2.1, 3.7)
          : isDandelion
            ? randomBetween(3.2, 6.4)
            : randomBetween(1.15, 4.8) * (0.68 + depth * 0.52),
    speed: isRain
      ? randomBetween(620, 960)
      : isSakura
        ? randomBetween(24, 48)
        : isMushroom
          ? randomBetween(14, 28)
          : isDandelion
            ? randomBetween(-23, -10)
            : randomBetween(11, 25) + depth * 23,
    drift: isRain
      ? randomBetween(-42, -20)
      : isSakura
        ? randomBetween(-14, 22)
        : isMushroom
          ? randomBetween(-5, 5)
          : isDandelion
            ? randomBetween(-14, 20)
            : randomBetween(-7, 7) * (0.55 + depth * 0.65),
    wobble: isRain
      ? randomBetween(1, 3)
      : isSakura
        ? randomBetween(10, 20)
        : isMushroom
          ? randomBetween(6, 12)
          : isDandelion
            ? randomBetween(10, 20)
            : randomBetween(7, 19) * (0.6 + depth * 0.55),
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: isRain
      ? randomBetween(0.35, 0.65)
      : isSakura
        ? randomBetween(0.75, 1.35)
        : isMushroom
          ? randomBetween(0.55, 0.95)
          : isDandelion
            ? randomBetween(0.45, 0.9)
            : randomBetween(0.48, 1.08),
    depth,
    opacity: isRain
      ? randomBetween(0.2, 0.5)
      : isSakura
        ? randomBetween(0.55, 0.9)
        : isMushroom
          ? randomBetween(0.66, 0.9)
          : isDandelion
            ? randomBetween(0.38, 0.72)
            : 0.28 + depth * 0.58,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: isSakura
      ? randomBetween(-1.2, 1.2)
      : isRain
        ? randomBetween(-0.3, 0.3)
        : isMushroom
          ? randomBetween(-0.5, 0.5)
          : isDandelion
            ? randomBetween(-0.28, 0.28)
            : randomBetween(-0.24, 0.24) * (0.55 + depth),
    variant: Math.random(),
  };
}

function recycleParticle(
  particle: Particle,
  effect: Exclude<VisualEffectMode, 'off'>,
  width: number,
  height: number,
): void {
  const replacement = createParticle(effect, width, 1);
  Object.assign(particle, replacement, {
    y:
      effect === 'dandelion'
        ? height + Math.max(12, replacement.size * 3)
        : -Math.max(12, replacement.size * 3),
    x: Math.random() * width,
  });
}

function drawParticle(
  context: CanvasRenderingContext2D,
  effect: Exclude<VisualEffectMode, 'off'>,
  particle: Particle,
): void {
  context.globalAlpha =
    effect === 'snow'
      ? particle.opacity * (0.88 + Math.sin(particle.phase * 0.72) * 0.12)
      : effect === 'dandelion'
        ? particle.opacity * (0.9 + Math.sin(particle.phase * 0.58) * 0.1)
        : particle.opacity;
  if (effect === 'rain') {
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - 4, particle.y - 15 * particle.size);
    context.lineWidth = particle.size;
    context.strokeStyle = '#78aee7';
    context.stroke();
    return;
  }

  context.save();
  context.translate(particle.x, particle.y);
  context.rotate(particle.rotation);
  context.beginPath();
  if (effect === 'sakura') {
    context.ellipse(0, 0, particle.size * 0.55, particle.size, 0, 0, Math.PI * 2);
    context.fillStyle = '#f4a9c3';
    context.fill();
    context.lineWidth = 0.7;
    context.strokeStyle = '#d77c9f';
    context.stroke();
  } else if (effect === 'mushroom') {
    const radius = particle.size;
    context.lineWidth = Math.max(0.45, radius * 0.12);
    context.beginPath();
    context.ellipse(0, radius * 0.52, radius * 0.33, radius * 0.72, 0, 0, Math.PI * 2);
    context.fillStyle = '#f0d9bd';
    context.fill();
    context.strokeStyle = '#b99671';
    context.stroke();

    context.beginPath();
    context.moveTo(-radius, radius * 0.16);
    context.bezierCurveTo(
      -radius * 0.74,
      -radius * 0.76,
      radius * 0.74,
      -radius * 0.76,
      radius,
      radius * 0.16,
    );
    context.quadraticCurveTo(0, radius * 0.48, -radius, radius * 0.16);
    context.fillStyle = '#d83b45';
    context.fill();
    context.strokeStyle = '#a62432';
    context.stroke();

    context.fillStyle = 'rgba(255, 244, 225, 0.92)';
    for (const [spotX, spotY, spotSize] of [
      [-0.43, -0.2, 0.14],
      [0.18, -0.38, 0.12],
      [0.5, -0.04, 0.1],
    ] as const) {
      context.beginPath();
      context.arc(radius * spotX, radius * spotY, radius * spotSize, 0, Math.PI * 2);
      context.fill();
    }
  } else if (effect === 'dandelion') {
    const radius = particle.size;
    context.lineCap = 'round';
    context.lineWidth = Math.max(0.42, radius * 0.08);
    if (particle.variant < 0.28) {
      context.strokeStyle = 'rgba(113, 125, 102, 0.78)';
      for (let ray = 0; ray < 12; ray += 1) {
        const angle = (Math.PI * ray) / 6;
        context.save();
        context.rotate(angle);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -radius);
        context.moveTo(0, -radius);
        context.lineTo(-radius * 0.2, -radius * 0.76);
        context.moveTo(0, -radius);
        context.lineTo(radius * 0.2, -radius * 0.76);
        context.stroke();
        context.restore();
      }
      context.beginPath();
      context.arc(0, 0, Math.max(0.55, radius * 0.13), 0, Math.PI * 2);
      context.fillStyle = '#b49b4d';
      context.fill();
    } else {
      context.strokeStyle = 'rgba(101, 115, 92, 0.76)';
      context.beginPath();
      context.moveTo(0, radius * 0.72);
      context.lineTo(0, -radius * 0.38);
      context.stroke();
      for (let tuft = -2; tuft <= 2; tuft += 1) {
        context.beginPath();
        context.moveTo(0, -radius * 0.38);
        context.lineTo(tuft * radius * 0.18, -radius * (0.88 - Math.abs(tuft) * 0.07));
        context.stroke();
      }
      context.beginPath();
      context.ellipse(0, radius * 0.7, radius * 0.12, radius * 0.27, 0, 0, Math.PI * 2);
      context.fillStyle = '#8e7438';
      context.fill();
    }
  } else {
    const radius = particle.size;
    context.lineCap = 'round';
    context.shadowColor = 'rgba(93, 142, 197, 0.38)';
    context.shadowBlur = 1.5 + particle.depth * 3.5;
    if (radius < 2.35) {
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fillStyle = particle.depth > 0.58 ? '#ffffff' : '#dcecff';
      context.fill();
    } else {
      context.lineWidth = 0.55 + particle.depth * 0.55;
      context.strokeStyle = particle.depth > 0.58 ? '#f7fbff' : '#d5e8fb';
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = (Math.PI * arm) / 3;
        context.save();
        context.rotate(angle);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, radius);
        if (radius > 3.15) {
          const branchStart = radius * 0.58;
          const branchLength = radius * 0.25;
          context.moveTo(0, branchStart);
          context.lineTo(-branchLength, branchStart + branchLength);
          context.moveTo(0, branchStart);
          context.lineTo(branchLength, branchStart + branchLength);
        }
        context.stroke();
        context.restore();
      }
      context.beginPath();
      context.arc(0, 0, Math.max(0.65, radius * 0.16), 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
    }
  }
  context.restore();
}

export function VisualEffects({ effect }: { effect: VisualEffectMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (effect === 'off') return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let previousTime = 0;
    let disposed = false;

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particles = Array.from({ length: visualEffectParticleCount(effect, width, height) }, () =>
        createParticle(effect, width, height),
      );
    };

    const stop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
    };

    const draw = (time: number) => {
      if (disposed || document.visibilityState === 'hidden' || reducedMotion.matches) {
        stop();
        return;
      }
      const deltaSeconds = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 0;
      previousTime = time;
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.phase += deltaSeconds * particle.phaseSpeed;
        particle.y += particle.speed * deltaSeconds;
        const gentleWind =
          effect === 'snow'
            ? Math.sin(time / 7200 + particle.y * 0.0022) * (2.5 + particle.depth * 5.5)
            : effect === 'dandelion'
              ? Math.sin(time / 4300 + particle.y * 0.003) * (4 + particle.depth * 7)
              : 0;
        particle.x +=
          (particle.drift + Math.sin(particle.phase) * particle.wobble + gentleWind) * deltaSeconds;
        particle.rotation += particle.rotationSpeed * deltaSeconds;
        const outsideVertically =
          effect === 'dandelion' ? particle.y < -40 : particle.y > height + 30;
        if (outsideVertically || particle.x < -40 || particle.x > width + 40) {
          recycleParticle(particle, effect, width, height);
        }
        drawParticle(context, effect, particle);
      }
      context.globalAlpha = 1;
      animationFrame = requestAnimationFrame(draw);
    };

    const start = () => {
      stop();
      context.clearRect(0, 0, width, height);
      if (!disposed && document.visibilityState !== 'hidden' && !reducedMotion.matches) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    const handleVisibility = () => start();
    const handleMotionPreference = () => start();
    const handleResize = () => {
      resize();
      start();
    };

    resize();
    start();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize, { passive: true });
    reducedMotion.addEventListener('change', handleMotionPreference);

    return () => {
      disposed = true;
      stop();
      context.clearRect(0, 0, width, height);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      reducedMotion.removeEventListener('change', handleMotionPreference);
    };
  }, [effect]);

  if (effect === 'off') return null;
  return (
    <canvas ref={canvasRef} className="maw-effect-layer" data-effect={effect} aria-hidden="true" />
  );
}
