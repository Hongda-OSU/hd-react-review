type Props = { icon: string; onPress: () => void };

// expect-claude: R06
export const IconButton = ({ icon, onPress }: Props) => (
  <button type="button" onClick={onPress}>
    {icon}
  </button>
);
