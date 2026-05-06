export type PublishableWorkTarget = {
  id: string;
  workKind: "ORIGINAL" | "REWRITE";
  noteCategory: "原创" | "二创";
  title: string;
  sourceLabel: string;
};
