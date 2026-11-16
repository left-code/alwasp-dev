import { getCollection, type CollectionEntry } from "astro:content";
import pkg from "../../package.json";

export const docGroups = ["Start", "Guides", "Reference", "Project"] as const;
export type DocEntry = CollectionEntry<"docs">;

/** The ALWasp release that this site documents. package.json is the one source. */
export const documentedVersion: string = pkg.version;

export const groupIntro: Record<(typeof docGroups)[number], string> = {
  Start: "Install the tool and make the first build.",
  Guides: "One page for each task: restore, build, verify, package, translate, automate.",
  Reference: "Exact options, version selection, output formats, exit codes, and problem solutions.",
  Project: "Release history and license."
};

export async function getSortedDocs(): Promise<DocEntry[]> {
  const docs = await getCollection("docs");
  return docs.sort(
    (a, b) =>
      docGroups.indexOf(a.data.group) - docGroups.indexOf(b.data.group) ||
      a.data.order - b.data.order ||
      a.id.localeCompare(b.id)
  );
}

export function groupDocs(docs: DocEntry[]) {
  return docGroups
    .map((title) => ({ title, intro: groupIntro[title], docs: docs.filter((doc) => doc.data.group === title) }))
    .filter((group) => group.docs.length > 0);
}
