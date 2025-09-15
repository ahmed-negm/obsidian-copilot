import { exec } from "child_process";

const runAfterBuildPlugin = {
  name: "run-after-build",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        exec("cp ./main.js $COPILOT_VAULT_PATH", (err) => {
          if (err) {
            console.error("Command failed:", err);
            return;
          }
          console.log("Build succeeded, file copied.");
        });
      }
    });
  },
};

export default runAfterBuildPlugin;
