export default {
  rules: {
    // R07
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      { message: (selector) => `Class "${selector}" should be kebab-case, without underscores` },
    ],
  },
};
