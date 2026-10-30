import * as React from "react";

export interface NexusLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: "badge" | "mark";
  title?: string;
}

/**
 * Oficjalne logo Nexus:
 * - variant="badge" (domyślny): znak wpisany w szklany, ciemny squircle z subtelną poświatą
 * - variant="mark": sam geometryczny sygnet bez tła
 */
export function NexusLogo({
  size = 32,
  variant = "badge",
  className,
  title,
  ...props
}: NexusLogoProps) {
  const rawId = React.useId();
  const id = `nx-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {/* Background gradient */}
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0c101d" />
          <stop offset="50%" stopColor="#070a14" />
          <stop offset="100%" stopColor="#020408" />
        </linearGradient>

        {/* Glass Rim highlight */}
        <linearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
        </linearGradient>

        {/* Ambient Core Glow */}
        <radialGradient id={`${id}-ambient`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        {/* Left Pillar: Cyan -> Indigo */}
        <linearGradient id={`${id}-left`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        {/* Right Pillar: Indigo -> Fuchsia */}
        <linearGradient id={`${id}-right`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Diagonal Traverse: High-energy Spectral Stream */}
        <linearGradient id={`${id}-diag`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="25%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="75%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>

        {/* Overlap shadow for 3D depth */}
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-0.4" dy="0.8" stdDeviation="0.9" floodColor="#000000" floodOpacity="0.7" />
        </filter>
      </defs>

      {variant === "badge" && (
        <g>
          {/* Base Squircle */}
          <rect width="32" height="32" rx="7.5" fill={`url(#${id}-bg)`} />
          <rect width="31" height="31" x="0.5" y="0.5" rx="7" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1" />
          <circle cx="16" cy="16" r="9" fill={`url(#${id}-ambient)`} />
        </g>
      )}

      {/* The Nexus Mark */}
      <g>
        {/* Left Pillar */}
        <rect x="6.5" y="6.5" width="4" height="19" rx="2" fill={`url(#${id}-left)`} />

        {/* Right Pillar */}
        <rect x="21.5" y="6.5" width="4" height="19" rx="2" fill={`url(#${id}-right)`} />

        {/* Diagonal Nexus Beam with 3D drop shadow */}
        <g filter={`url(#${id}-shadow)`}>
          <line x1="8.5" y1="8.5" x2="23.5" y2="23.5" stroke={`url(#${id}-diag)`} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Central Nexus Core: 4-point brilliant star flare */}
        <circle cx="16" cy="16" r="3.2" fill="#38bdf8" opacity="0.45" />
        <circle cx="16" cy="16" r="1.3" fill="#ffffff" />
        <path d="M 16 13.2 Q 16 16 13.2 16 Q 16 16 16 18.8 Q 16 16 18.8 16 Q 16 16 16 13.2 Z" fill="#ffffff" />
      </g>
    </svg>
  );
}

export const NexusIcon = NexusLogo;

