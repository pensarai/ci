import { Gitlab } from "../lib/gitlab";

async function Main() {
  await Gitlab.runScan();
}

Main();
