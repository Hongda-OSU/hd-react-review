import styles from "./Button.module.css";

type Props = { label: string; onPress: () => void };

export const Button = ({ label, onPress }: Props) => (
  <button type="button" className={styles["primary-button"]} onClick={onPress}>
    {label}
  </button>
);
