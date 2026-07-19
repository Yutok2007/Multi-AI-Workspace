import { describe, expect, it } from 'vitest';

import { visualEffectParticleCount } from '../../src/content/VisualEffects';

describe('visualEffectParticleCount', () => {
  it('creates no work while effects are disabled', () => {
    expect(visualEffectParticleCount('off', 1920, 1080)).toBe(0);
  });

  it('caps particle counts on large displays', () => {
    expect(visualEffectParticleCount('snow', 7680, 4320)).toBeLessThanOrEqual(64);
    expect(visualEffectParticleCount('sakura', 7680, 4320)).toBeLessThanOrEqual(42);
    expect(visualEffectParticleCount('rain', 7680, 4320)).toBeLessThanOrEqual(110);
    expect(visualEffectParticleCount('mushroom', 7680, 4320)).toBeLessThanOrEqual(30);
    expect(visualEffectParticleCount('dandelion', 7680, 4320)).toBeLessThanOrEqual(38);
  });

  it('keeps a small but visible mobile effect without desktop density', () => {
    const mobileRain = visualEffectParticleCount('rain', 390, 844);
    const desktopRain = visualEffectParticleCount('rain', 1920, 1080);
    expect(mobileRain).toBeGreaterThanOrEqual(24);
    expect(mobileRain).toBeLessThan(desktopRain);
  });

  it('keeps decorative mushroom and dandelion layers intentionally sparse', () => {
    const mushrooms = visualEffectParticleCount('mushroom', 1920, 1080);
    const dandelions = visualEffectParticleCount('dandelion', 1920, 1080);
    expect(mushrooms).toBeGreaterThanOrEqual(8);
    expect(mushrooms).toBeLessThan(visualEffectParticleCount('snow', 1920, 1080));
    expect(dandelions).toBeGreaterThanOrEqual(10);
    expect(dandelions).toBeLessThan(visualEffectParticleCount('rain', 1920, 1080));
  });
});
