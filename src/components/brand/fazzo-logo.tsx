export function FazzoLogo({ className, textSize = 'text-2xl' }: { className?: string; textSize?: string }) {
  return (
    <span className={`relative inline-flex items-center gap-[2px] font-heading font-extrabold ${textSize} ${className ?? ''}`}>
      <span className="text-primary">FA</span>
      <span className="text-primary">Z</span>
      <span className="text-accent inline-block -skew-x-[10deg]">Z</span>
      <span className="text-primary">O</span>
    </span>
  );
}

export function FazzoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Fazzo">
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#241068" />
      <rect x="24" y="12" width="20" height="40" rx="5" fill="#0C9B9D" transform="skewX(-14) translate(-10 0)" />
    </svg>
  );
}
