// Stand-ins so tsc runs without node_modules.
declare module "react";
declare module "@stylexjs/stylex";
declare module "*.css";
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number;
  }
}

interface ImportMeta {
  env: Record<string, string>;
}
