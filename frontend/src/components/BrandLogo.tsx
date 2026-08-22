import React from "react";

interface BrandLogoProps {
  logoUrl?: string;
  siteName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function BrandLogo({
  logoUrl,
  siteName = "webmintra",
  size = "md",
  className = "",
  showText = true,
}: BrandLogoProps) {
  const isWebmintra = siteName.toLowerCase().includes("webmintra");

  // Split "web" and "mintra" for themed gradient typography
  const renderStyledName = () => {
    if (isWebmintra) {
      return (
        <span className="inline-flex items-baseline tracking-tight lowercase font-extrabold select-none">
          <span className="text-[#0f172a] transition-colors">web</span>
          <span className="bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#059669] bg-clip-text text-transparent drop-shadow-2xs">
            mintra
          </span>
        </span>
      );
    }

    return (
      <span className="tracking-tight lowercase font-extrabold text-[#0f172a]">{siteName}</span>
    );
  };

  const imgHeight = size === "sm" ? "h-6" : size === "lg" ? "h-9" : "h-8";
  const iconSize =
    size === "sm" ? "h-6 w-6 text-xs" : size === "lg" ? "h-9 w-9 text-base" : "h-8 w-8 text-sm";
  const textClass = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-[21px]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteName}
          className={`${imgHeight} max-w-[180px] object-contain shrink-0`}
        />
      ) : (
        <div
          className={`flex ${iconSize} items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-black shrink-0`}
        >
          W
        </div>
      )}

      {showText && (
        <div className={`${textClass} font-sans leading-none flex items-center`}>
          {renderStyledName()}
        </div>
      )}
    </div>
  );
}
