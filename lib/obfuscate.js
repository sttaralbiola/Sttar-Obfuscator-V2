const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const VENDOR_CLI = path.join(__dirname, "..", "vendor", "prometheus", "cli.lua");
const TMP_DIR = path.join(__dirname, "..", "tmp");

const PRESETS = new Set(["Minify", "Weak", "Medium", "Strong"]);

const BANNER = `--[[
    Obfuscated by: Sttar Obfuscator
    Discord: https://discord.gg/TfznZ8uSUu
]]
`;

async function ensureTmpDir() {
  await fs.mkdir(TMP_DIR, { recursive: true });
}

/**
 * Obfuscate a Lua source string using Prometheus.
 * @param {string} source - raw Lua source code
 * @param {string} preset - one of Minify | Weak | Medium | Strong
 * @returns {Promise<{ok: boolean, output?: string, error?: string}>}
 */
async function obfuscate(source, preset = "Medium") {
  if (!PRESETS.has(preset)) preset = "Medium";
  await ensureTmpDir();

  const id = randomUUID();
  const inputPath = path.join(TMP_DIR, `${id}.lua`);
  const outputPath = path.join(TMP_DIR, `${id}.out.lua`);

  await fs.writeFile(inputPath, source, "utf8");

  return new Promise((resolve) => {
    const proc = spawn("lua", [
      VENDOR_CLI,
      `--preset`,
      preset,
      `--out`,
      outputPath,
      inputPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    proc.on("error", async (err) => {
      await cleanup(inputPath, outputPath);
      resolve({ ok: false, error: `Engine not available: ${err.message}` });
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        await cleanup(inputPath, outputPath);
        resolve({ ok: false, error: stderr.trim() || `Prometheus exited with code ${code}` });
        return;
      }
      try {
        const output = await fs.readFile(outputPath, "utf8");
        await cleanup(inputPath, outputPath);
        resolve({ ok: true, output: BANNER + output });
      } catch (err) {
        await cleanup(inputPath, outputPath);
        resolve({ ok: false, error: "Prometheus did not produce output." });
      }
    });
  });
}

async function cleanup(...files) {
  await Promise.all(
    files.map((f) => fs.rm(f, { force: true }).catch(() => {}))
  );
}

module.exports = { obfuscate, PRESETS: [...PRESETS] };
