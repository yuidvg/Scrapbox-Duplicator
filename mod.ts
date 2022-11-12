import transferPages from "./transfer.ts";
import { parseAll } from "./deps.ts";
import { assertArray } from "https://deno.land/x/unknownutil@v2.0.0/assert.ts";

//make a type for the yaml file to be parsed
interface TransferProjectPair {
  srcPrjName: string;
  dstPrjName: string;
  duplComPages: boolean;
}

//load ./prjPairs.yml and put it into transferProjectPairs[]
//and assert transferProjectPairs[] is an array of TransferProjectPair
const transferProjectPairs = parseAll(
  await Deno.readTextFile("./prjPairs.yml"),
);
assertArray<TransferProjectPair>(transferProjectPairs);

//transfer Projects one by one using async/await
for (const { srcPrjName, dstPrjName, duplComPages } of transferProjectPairs) {
  await transferPages(srcPrjName, dstPrjName, duplComPages);
}
