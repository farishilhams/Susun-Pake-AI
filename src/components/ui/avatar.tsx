"use client";

// ============================================================
// components/ui/avatar.tsx — Standardized shadcn Avatar Primitive
// Reaktif menangani loading, fallback, dan error (zero broken image)
// Sesuai UI-UX standards & ARCHITECTURE.md § 4.3
// ============================================================

import * as React from "react";
import { cn } from "@/lib/utils";

type LoadingStatus = "idle" | "loading" | "loaded" | "error";

interface AvatarContextValue {
  status: LoadingStatus;
  setStatus: React.Dispatch<React.SetStateAction<LoadingStatus>>;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext() {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error("Avatar components must be used within an <Avatar />");
  }
  return context;
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    const [status, setStatus] = React.useState<LoadingStatus>("idle");

    return (
      <AvatarContext.Provider value={{ status, setStatus }}>
        <div
          ref={ref}
          className={cn(
            "relative flex shrink-0 overflow-hidden rounded-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = "Avatar";

export interface AvatarImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: LoadingStatus) => void;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  (
    {
      src,
      alt = "Avatar",
      className,
      onLoad,
      onError,
      onLoadingStatusChange,
      ...props
    },
    ref
  ) => {
    const { status, setStatus } = useAvatarContext();
    const internalRef = React.useRef<HTMLImageElement | null>(null);

    // Cek synchronously apakah gambar sudah ada di cache browser (mencegah flicker fallback inisial)
    React.useLayoutEffect(() => {
      if (!src) {
        setStatus("error");
        onLoadingStatusChange?.("error");
        return;
      }

      // Jika node DOM sudah selesai dimuat (complete dari browser cache)
      if (
        internalRef.current &&
        internalRef.current.complete &&
        internalRef.current.naturalWidth > 0
      ) {
        setStatus("loaded");
        onLoadingStatusChange?.("loaded");
        return;
      }

      // Verifikasi cepat menggunakan objek Image untuk cache browser
      if (typeof window !== "undefined" && typeof src === "string") {
        const testImg = new window.Image();
        testImg.src = src;
        if (testImg.complete && testImg.naturalWidth > 0) {
          setStatus("loaded");
          onLoadingStatusChange?.("loaded");
          return;
        }
      }

      // Hanya ubah ke status "loading" jika sebelumnya belum "loaded" dengan URL yang sama
      setStatus((prev) => (prev === "loaded" ? prev : "loading"));
      onLoadingStatusChange?.("loading");
    }, [src, setStatus, onLoadingStatusChange]);

    if (!src || status === "error") {
      return null;
    }

    return (
      <img
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLImageElement | null>).current = node;
          }
          // Jika image langsung complete saat mounting
          if (node && node.complete && node.naturalWidth > 0 && status !== "loaded") {
            setStatus("loaded");
            onLoadingStatusChange?.("loaded");
          }
        }}
        src={src}
        alt={alt}
        onLoad={(e) => {
          setStatus("loaded");
          onLoadingStatusChange?.("loaded");
          onLoad?.(e);
        }}
        onError={(e) => {
          setStatus("error");
          onLoadingStatusChange?.("error");
          onError?.(e);
        }}
        className={cn(
          "aspect-square h-full w-full object-cover transition-opacity duration-150",
          status !== "loaded" ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  AvatarFallbackProps
>(({ className, children, delayMs, ...props }, ref) => {
  const { status } = useAvatarContext();
  const [canRender, setCanRender] = React.useState(delayMs === undefined);

  React.useEffect(() => {
    if (delayMs !== undefined) {
      const timer = setTimeout(() => setCanRender(true), delayMs);
      return () => clearTimeout(timer);
    }
  }, [delayMs]);

  // Fallback dirender jika gambar belum dimuat, sedang loading, atau mengalami error (404/broken)
  if (status === "loaded" || !canRender) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
AvatarFallback.displayName = "AvatarFallback";

export default Avatar;
