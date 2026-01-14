import english from "@/constants/languages/english.json";

export type Content = typeof english;
export default english; // Keep default export for now to allow incremental migration, but components should prefer useContent
