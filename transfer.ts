import { assertString, exportPages, importPages } from "./deps.ts";

const sid = Deno.env.get("SID");
assertString(sid);

//Transfer a Project
export default async function transferProject(
  srcPrjName: string,
  dstPrjName: string,
  duplComPages: boolean,
) {
  //exportPages
  console.log(`Exporting a json file from "/${srcPrjName}"...`);
  const result = await exportPages(srcPrjName, { sid, metadata: true });
  if (!result.ok) {
    const error = new Error();
    error.name = `${result.value.name} when exporting a json file`;
    error.message = result.value.message;
    throw error;
  }
  const { pages } = result.value;
  console.log(`Exported ${pages.length}pages:`);
  for (const page of pages) {
    console.log(`\t${page.title}`);
  }

  //filter pages to import
  const importingPages = pages.filter(({ lines }) => {
    if (lines.some((line) => line.text.includes("[private.icon]"))) {
      return false;
    } else if (lines.some((line) => line.text.includes("[public.icon]"))) {
      return true;
    } else {
      return duplComPages;
    }
  });

  //importPages
  if (importingPages.length === 0) {
    console.log("No page to be imported found.");
  } else {
    console.log(
      `Importing ${importingPages.length} pages to "/${dstPrjName}"...`,
    );
    const result = await importPages(dstPrjName, { pages: importingPages }, {
      sid,
    });
    if (!result.ok) {
      const error = new Error();
      error.name = `${result.value.name} when importing pages`;
      error.message = result.value.message;
      throw error;
    }
    console.log(result.value);
  }
}
