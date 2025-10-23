import { assertString, exportPages, importPages } from "./deps.ts";

const sid = Deno.env.get("SID");
const exportingProjectName = Deno.env.get("SOURCE_PROJECT_NAME"); //インポート元(本来はprivateプロジェクト)
const importingProjectName = Deno.env.get("DESTINATION_PROJECT_NAME"); //インポート先(publicプロジェクト)
const shouldDuplicateByDefault =
  Deno.env.get("SHOULD_DUPLICATE_BY_DEFAULT") === "True";

assertString(sid);
assertString(exportingProjectName);
assertString(importingProjectName);

console.log(`Exporting a json file from "/${exportingProjectName}"...`);
const result = await exportPages(exportingProjectName, {
  sid,
  metadata: true,
});
if (!result.ok) {
  const error = new Error();
  error.name = `${result.value.name} when exporting a json file`;
  error.message = result.value.message;
  throw error;
}
const { pages } = result.value;
console.log(`Export ${pages.length}pages:`);
for (const page of pages) {
  console.log(`\t${page.title}`);
}

const importingPages = pages.filter(({ lines }) => {
  if (lines.some((line) => line.text.includes("[private.icon]"))) {
    return false;
  } else if (lines.some((line) => line.text.includes("[public.icon]"))) {
    return true;
  } else {
    return shouldDuplicateByDefault;
  }
});

if (importingPages.length === 0) {
  console.log("No page to be imported found.");
} else {
  console.log(
    `Importing ${importingPages.length} pages to "/${importingProjectName}"...`,
  );

  // Attempt import; if the upload is too large, split into smaller batches.
  // This avoids server-side Multer "File too large" limits without needing server changes.
  const maxBatchPagesEnv = Deno.env.get("IMPORT_MAX_BATCH_PAGES");
  const maxBatchPages = maxBatchPagesEnv ? Number(maxBatchPagesEnv) : 150;

  // Import a batch and handle "File too large" by splitting recursively.
  const importBatch = async (
    batch: typeof importingPages,
    depth = 0,
  ): Promise<void> => {
    if (batch.length === 0) return;
    const attemptLabel = `batch depth=${depth} size=${batch.length}`;
    const result = await importPages(importingProjectName, { pages: batch }, {
      sid,
    });
    if (result.ok) {
      console.log(`Imported ${batch.length} pages (${attemptLabel}).`);
      return;
    }
    const name = result.value?.name ?? "";
    const message = result.value?.message ?? "";
    // If server rejects due to size, split and retry recursively
    if (/MulterError/i.test(name) || /File too large/i.test(message)) {
      if (batch.length === 1) {
        const error = new Error();
        error.name = `${name || "MulterError"} when importing pages`;
        error.message = `Single page still too large: ${
          batch[0].title
        }. ${message}`;
        throw error;
      }
      const mid = Math.floor(batch.length / 2);
      console.warn(
        `Upload too large (${attemptLabel}). Splitting into ${mid} + ${
          batch.length - mid
        }...`,
      );
      await importBatch(batch.slice(0, mid), depth + 1);
      await importBatch(batch.slice(mid), depth + 1);
      return;
    }
    const error = new Error();
    error.name = `${name} when importing pages`;
    error.message = message;
    throw error;
  };

  // First, send in moderately sized batches to reduce retries.
  for (let i = 0; i < importingPages.length; i += maxBatchPages) {
    const batch = importingPages.slice(i, i + maxBatchPages);
    await importBatch(batch);
  }
  console.log(`Done importing ${importingPages.length} pages.`);
}
