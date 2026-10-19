import { useEffect, useMemo, useRef } from "react";
import "./HoverGallery.css";

type Item = { id: string; label: string };

type Props = {
  items: Item[];
  isDark: boolean;
  isCompact: boolean;
  isRounded: boolean;
  isAnimated: boolean;
  isBordered: boolean;
};

// expect-claude: R04, R09
export const HoverGallery = ({
  items,
  isDark,
  isCompact,
  isRounded,
  isAnimated,
  isBordered,
}: Props) => {
  const listRef = useRef(null);
  // expect-claude: R14
  const count = useMemo(() => items.length, [items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onOver = (event: MouseEvent) => {
      list.dataset.active = (event.target as HTMLElement).dataset.id;
    };
    // expect-claude: R18
    list.addEventListener("mouseover", onOver);
    return () => list.removeEventListener("mouseover", onOver);
  }, []);

  const className = [
    "gallery",
    isDark && "gallery-dark",
    isCompact && "gallery-compact",
    isRounded && "gallery-rounded",
    isAnimated && "gallery-animated",
    isBordered && "gallery-bordered",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ul ref={listRef} className={className} data-count={count}>
      {items.map((item) => (
        <li key={item.id} data-id={item.id} className="gallery-item">
          {item.label}
        </li>
      ))}
    </ul>
  );
};
