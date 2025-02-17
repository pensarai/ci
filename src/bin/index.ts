#!/usr/bin/env node

import { program } from "commander";
import { Gitlab } from "../lib/gitlab";
program
  .command("gh scan")
  .description("Trigger a GitHub scan")
  .action(async () => {
    console.log("Initializing scan...");
  });

program
  .command("gl scan")
  .description("Trigger a GitLab scan")
  .action(async () => {
    await Gitlab.runScan();
  });

program.parse(process.argv);
