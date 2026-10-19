import styles from "./Spinner.module.css";

export const Spinner = ({ label }: { label: string }) => (
  <span role="status" className={styles["spinner"]}>
    <span className={styles["visually-hidden"]}>{label}</span>
  </span>
);
