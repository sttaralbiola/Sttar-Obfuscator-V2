// Runs automatically after `npm install` (see package.json "postinstall").
// Clones the Prometheus Lua obfuscator engine into vendor/prometheus
// if it isn't already there. Requires `git` to be available on the
// machine doing the build (already true in the provided Dockerfile).

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const VENDOR_DIR = path.join(__dirname, "..", "vendor", "prometheus");
const REPO_URL = "https://github.com/levno-710/Prometheus.git";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

try {
  if (fs.existsSync(path.join(VENDOR_DIR, "cli.lua"))) {
    console.log("[setup-prometheus] Prometheus already present, skipping clone.");
    process.exit(0);
  }

  fs.mkdirSync(path.join(__dirname, "..", "vendor"), { recursive: true });
  console.log("[setup-prometheus] Cloning Prometheus engine...");
  run(`git clone --depth 1 ${REPO_URL} "${VENDOR_DIR}"`);
  console.log("[setup-prometheus] Done.");
} catch (err) {
  console.error("[setup-prometheus] Could not clone Prometheus automatically.");
  console.error("Manually place the engine at vendor/prometheus (must contain cli.lua).");
  console.error(err.message);
  // Don't fail the whole install/build over this — allow manual vendoring.
  process.exit(0);
                    }
