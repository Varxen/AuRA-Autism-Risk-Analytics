import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import auraAnimation from "../../assets/aurabot-animate.mp4";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface AnimatedAuraAssetProps extends Pick<
  HTMLAttributes<HTMLDivElement>,
  "className"
> {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  poster?: string;
  src?: string;
  decorative?: boolean;
  children?: ReactNode;
}

export function AnimatedAuraAsset({
  className = "",
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  poster = "/assets/branding/aura-mascot.png",
  src = auraAnimation,
  decorative = false,
  children,
}: AnimatedAuraAssetProps) {
  const video = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (!reducedMotion && autoPlay)
      void video.current?.play().catch(() => setFallback(true));
  }, [reducedMotion, autoPlay]);
  return (
    <div className={`animated-aura ${className}`} aria-hidden={decorative || undefined}>
      {reducedMotion || fallback ? (
        <img src={poster} alt={decorative ? "" : "AuRA robot mascot"} draggable={false} />
      ) : (
        <video
          ref={video}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          preload="metadata"
          aria-label={decorative ? undefined : "Animated AuRA robot mascot"}
          onError={() => setFallback(true)}
        />
      )}
      {children}
    </div>
  );
}
