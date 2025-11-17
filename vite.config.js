import { defineConfig } from "vite";
import { resolve } from "path";
import { spawn } from "node:child_process";

function moonbitWatchPlugin() {
  let building = false;
  let pending = false;
  let buildPromise = null;

  const runBuild = () => {
    if (building) {
      pending = true;
      return buildPromise ?? Promise.resolve();
    }
    if (building) {
      pending = true;
      return buildPromise ?? Promise.resolve();
    }
    building = true;
    buildPromise = new Promise((resolveBuild, rejectBuild) => {
      const proc = spawn("moon", ["build", "--target", "js"], {
        cwd: resolve(__dirname, "singularity"),
        stdio: "inherit",
      });
      proc.on("error", (err) => {
        building = false;
        rejectBuild(err);
      });
      proc.on("close", (code) => {
        building = false;
        if (code !== 0) {
          rejectBuild(
            new Error(`moon build failed with exit code ${code ?? "unknown"}`)
          );
          return;
        }
        resolveBuild();
        if (pending) {
          pending = false;
          runBuild().catch((err) =>
            console.error("[moonbit-watch] rebuild failed", err)
          );
        }
      });
    });
    return buildPromise;
  };

  return {
    name: "moonbit-watch",
    async configureServer(server) {
      await runBuild().catch((err) =>
        console.error("[moonbit-watch] initial build failed", err)
      );
      const globPath = resolve(__dirname, "singularity/src/**/*.mbt");
      server.watcher.add(globPath);
      const trigger = (path) => {
        if (!path.endsWith(".mbt")) return;
        runBuild().catch((err) =>
          console.error("[moonbit-watch] rebuild failed", err)
        );
      };
      server.watcher.on("add", trigger);
      server.watcher.on("change", trigger);
    },
    async buildStart() {
      await runBuild();
    },
  };
}

export default defineConfig({
  base: "./",
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        editor: resolve(__dirname, "editor.html"),
      },
    },
  },
  plugins: [moonbitWatchPlugin()],
});
