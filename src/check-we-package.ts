import { checkWeWebPackage } from "./we-package.js";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: npm run check:we-package -- <package-directory>");
const checks = await checkWeWebPackage(directory);
console.log(JSON.stringify({ directory, checks }, null, 2));
if (checks.some((check) => check.status === "failed")) process.exitCode = 1;
