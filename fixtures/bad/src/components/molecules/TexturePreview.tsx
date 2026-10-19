import { useEffect, useRef, useState } from "react";

const loadTexture = (url: string) => fetch(url).then((response) => response.blob());

export const TexturePreview = ({ url }: { url: string }) => {
  const frameRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadTexture(url).then((texture) => {
      // expect-claude: R27
      frameRef.current.dataset.size = String(texture.size);
      setReady(true);
    });
  }, [url]);

  return <div ref={frameRef} data-ready={ready} />;
};
