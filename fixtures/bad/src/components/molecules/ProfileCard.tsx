import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";

// expect-lint: R05
import { SiteHeader } from "@/components/organisms/SiteHeader";
// expect-claude: R22
import styles from "./ProfileCard.module.css";

const sx = stylex.create({
  // expect-lint: R09
  root: { colr: "red" },
});

type Props = { first: string; last: string; bio: string; userId: string };

export const ProfileCard = ({ first, last, bio, userId }: Props) => {
  // expect-claude: R12
  const [fullName, setFullName] = useState(`${first} ${last}`);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // expect-lint: R10
    setFullName(`${first} ${last}`);
    // expect-lint: R24
  }, [first]);

  useEffect(() => {
    // expect-lint: R10
    setOpen(false);
  }, [userId]);

  return (
    <section className={styles["profile-card"]} {...stylex.props(sx.root)}>
      <SiteHeader />
      {/* expect-lint: R16 */}
      <div onClick={() => setOpen(!open)}>{fullName}</div>
      {/* expect-lint: R18 */}
      <span role="button" onClick={() => setOpen(true)} onKeyDown={() => setOpen(true)}>
        more
      </span>
      {/* expect-lint: R20 */}
      <p dangerouslySetInnerHTML={{ __html: bio }} />
    </section>
  );
};
