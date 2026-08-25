import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertDf13FirstPreprodComposeContract } from "./df13-first-preprod-compose-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const compose = readFileSync(resolve(root, "deploy/docker-compose.vps.yml"), "utf8");

assertDf13FirstPreprodComposeContract(compose);

console.log("DF13 first-preprod Compose startup contract: PASS");
