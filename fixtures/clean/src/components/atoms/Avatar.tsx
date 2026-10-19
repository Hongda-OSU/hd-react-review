type Props = { src: string; name: string };

export const Avatar = ({ src, name }: Props) => <img src={src} alt={name} width={32} height={32} />;
