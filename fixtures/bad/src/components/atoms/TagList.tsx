const Pill_Icon = () => <span>•</span>;

export const TagList = ({ tags }: { tags: string[] }) => {
  // expect-lint: R13
  const Item = ({ text }: { text: string }) => <li>{text}</li>;

  return (
    <ul>
      {/* expect-lint: R06 */}
      <Pill_Icon />
      {tags.map((tag, index) => (
        // expect-lint: R11
        <Item key={index} text={tag} />
      ))}
    </ul>
  );
};
