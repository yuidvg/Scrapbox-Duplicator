import transferPages from "./transfer.ts";
import { parseAll } from "./deps.ts";
import { assertArray } from "https://deno.land/x/unknownutil@v2.0.0/assert.ts";

interface TransferProjectPair {
  srcPrjName: string;
  dstPrjName: string;
  duplComPages: boolean;
}

const transferProjectPairs = parseAll(
  await Deno.readTextFile("./prjPairs.yml"),
) as unknown as TransferProjectPair[];

assertArray(transferProjectPairs);

//transfer Projects one by one using async/await
for (const { srcPrjName, dstPrjName, duplComPages } of transferProjectPairs) {
  await transferPages(srcPrjName, dstPrjName, duplComPages);
}