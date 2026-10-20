// expect-claude: R30
const PHOTOS = [
  {
    id: "dunes",
    src: "https://images.example.com/photos/dunes-at-dawn.jpg",
    caption: "Dunes at dawn",
  },
  {
    id: "harbour",
    src: "https://images.example.com/photos/harbour-in-fog.jpg",
    caption: "Harbour in fog",
  },
  {
    id: "orchard",
    src: "https://images.example.com/photos/orchard-in-bloom.jpg",
    caption: "Orchard in bloom",
  },
  {
    id: "glacier",
    src: "https://images.example.com/photos/glacier-front.jpg",
    caption: "Glacier front",
  },
  {
    id: "market",
    src: "https://images.example.com/photos/night-market.jpg",
    caption: "Night market",
  },
  {
    id: "terraces",
    src: "https://images.example.com/photos/rice-terraces.jpg",
    caption: "Rice terraces",
  },
];

export const PhotoWall = () => (
  <ul>
    {PHOTOS.map((photo) => (
      <li key={photo.id}>
        <img src={photo.src} alt={photo.caption} />
      </li>
    ))}
  </ul>
);
