import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  badge: { borderRadius: 999, paddingInline: 8, fontSize: 12 },
  success: { backgroundColor: "#dcfce7", color: "#166534" },
});

type Props = { label: string; success?: boolean };

export const StatusBadge = ({ label, success = false }: Props) => (
  <span {...stylex.props(styles.badge, success && styles.success)}>{label}</span>
);
