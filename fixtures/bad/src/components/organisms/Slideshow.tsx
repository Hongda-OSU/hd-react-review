import { useEffect } from "react";

type Slide = { id: string; src: string };
type Size = { width: number; height: number };

const startPlayer = (slides: Slide[], size: Size) => ({
  stop: () => console.log(`stopped ${slides.length} slides at ${size.width}px`),
});

const Player = ({
  slides,
  size = { width: 640, height: 360 },
}: {
  slides: Slide[];
  size?: Size;
}) => {
  useEffect(() => {
    const player = startPlayer(slides, size);
    return () => player.stop();
    // expect-claude: R26
  }, [slides, size]);

  return <div className="player" />;
};

export const Slideshow = () => {
  // expect-claude: R26
  const slides = [
    { id: "a", src: "/a.jpg" },
    { id: "b", src: "/b.jpg" },
  ];

  return <Player slides={slides} />;
};
