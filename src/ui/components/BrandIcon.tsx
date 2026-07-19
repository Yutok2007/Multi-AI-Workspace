import { useId } from 'react';

export function BrandIcon({
  className,
  tone = 'brand',
}: {
  className?: string;
  tone?: 'brand' | 'pinning';
}) {
  const id = useId().replaceAll(':', '');
  const backgroundId = `maw-brand-background-${id}`;
  const glowId = `maw-brand-glow-${id}`;
  const colors =
    tone === 'pinning'
      ? { start: '#ff806f', middle: '#c94f50', end: '#702d49' }
      : { start: '#8b6cff', middle: '#4d50dc', end: '#1c286f' };

  return (
    <svg
      className={className}
      data-maw-brand-icon="true"
      viewBox="0 0 128 128"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={backgroundId}
          x1="18"
          y1="10"
          x2="112"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={colors.start} />
          <stop offset=".48" stopColor={colors.middle} />
          <stop offset="1" stopColor={colors.end} />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(35 25) rotate(48) scale(103)"
        >
          <stop stopColor="#fff" stopOpacity=".32" />
          <stop offset=".68" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="120" height="120" rx="32" fill={`url(#${backgroundId})`} />
      <rect x="4" y="4" width="120" height="120" rx="32" fill={`url(#${glowId})`} />
      <rect
        x="8"
        y="8"
        width="112"
        height="112"
        rx="28"
        fill="none"
        stroke="#fff"
        strokeOpacity=".16"
        strokeWidth="2"
      />
      <path
        data-letter="m"
        d="M27 55V28h15l22 21 22-21h15v27"
        fill="none"
        stroke="#fff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        data-letter="w"
        d="M27 73v27h15l22-21 22 21h15V73"
        fill="none"
        stroke="#fff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m64 57 7 7-7 7-7-7Z" fill="#fff" fillOpacity=".94" />
    </svg>
  );
}
