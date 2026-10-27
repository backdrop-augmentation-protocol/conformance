#!/usr/bin/env node
import { checkWeWebPackage } from "./we-package.js";

const directories = process.argv.slice(2);
if (directories.length === 0) throw new Error("Usage: npm run check:we-package -- <package-directory> [...directories]");
for (const directory of directories) {
  const checks = await checkWeWebPackage(directory);
  console.log(JSON.stringify({ directory, checks }, null, 2));
  if (checks.some((check) => check.status === "failed")) process.exitCode = 1;
}
