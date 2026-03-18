
import { useState, useEffect } from "react";
import { Blurhash } from "react-blurhash";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  blurhash?: string | null;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  onClick?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  blurhash,
  className,
  aspectRatio = "video",
  loading = "lazy",
  fetchPriority = "auto",
  onClick
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted rounded-md", 
        aspectClass, 
        className
      )}
      onClick={onClick}
    >
      {/* BlurHash Placeholder */}
      {!isLoaded && blurhash && !error && (
        <div className="absolute inset-0">
          <Blurhash
            hash={blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        // @ts-ignore - fetchpriority is relatively new in TS types
        fetchpriority={fetchPriority}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          onClick ? "cursor-pointer" : ""
        )}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center p-2">
          Error al cargar imagen
        </div>
      )}
    </div>
  );
}
