import { useEffect, useState } from "react";

type Size = { width: number; height: number };

export const useImageSize = (src: string) => {
  const [size, setSize] = useState(null as Size | null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return size;
};
