"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  getCompanyLogoFallback,
  getSafeCompanyLogoUrl,
} from "@/app/utils/imageUrl";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  src?: string | null;
  name: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "?";
}

export function CompanyLogo({
  src,
  name,
  alt,
  className,
  width = 40,
  height = 40,
  fill = false,
  sizes,
  priority,
}: CompanyLogoProps) {
  const safeSrc = useMemo(() => getSafeCompanyLogoUrl(src, name), [src, name]);
  const fallbackSrc = useMemo(() => getCompanyLogoFallback(name), [name]);
  const [currentSrc, setCurrentSrc] = useState(safeSrc);
  const [showInitials, setShowInitials] = useState(false);

  useEffect(() => {
    setCurrentSrc(safeSrc);
    setShowInitials(false);
  }, [safeSrc]);

  const imageClassName = cn("rounded-lg object-cover", className);
  const imageAlt = alt ?? `${name} logo`;

  if (showInitials) {
    return (
      <div
        aria-label={imageAlt}
        role="img"
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground",
          className
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    setShowInitials(true);
  };

  if (fill) {
    return (
      <Image
        src={currentSrc}
        alt={imageAlt}
        fill
        sizes={sizes}
        priority={priority}
        className={imageClassName}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={imageAlt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={imageClassName}
      onError={handleError}
    />
  );
}
