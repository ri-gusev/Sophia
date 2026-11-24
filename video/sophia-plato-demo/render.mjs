import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { performance } from "node:perf_hooks";
import { DURATION, FPS, HEIGHT, WIDTH, makeTimeline } from "./timeline.mjs";

const project = fileURLToPath(new URL("./", import.meta.url));
const ffmpeg = process.env.SOPHIA_DEMO_FFMPEG || "ffmpeg";
const output = join(project, "sophia-plato-demo.mp4");
const credit = "Sculpture photographs: Marie-Lan Nguyen (CC BY 2.5), Jastrow (public domain), Wikimedia Commons. Attribution and image links in README.md.";
const { canvas, draw } = await makeTimeline();
const preview = process.argv.indexOf("--stills");

if (preview !== -1) {
  const target = process.argv[preview + 1];
  if (!target) throw new Error("Pass the preview directory after --stills.");
  await mkdir(target, { recursive: true });
  const times = [1.8, 3.7, 4.8, 5.8, 6.8, 8.9, 10.2, 12.35, 14.3, 17.9, 19.9, 21.15, 23.2, 26.5, 28.8];
  for (const time of times) {
    draw(Math.round(time * FPS));
    await writeFile(join(target, `t-${time.toFixed(2).padStart(5, "0")}.jpg`), await canvas.encode("jpeg", 96));
  }
  console.log(`Saved ${times.length} full-size verification frames.`);
} else {
  const temporary = join(project, `.sophia-plato-demo-${process.pid}.mp4`);
  const started = performance.now();
  const length = FPS * DURATION;
  const runner = spawn(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${WIDTH}x${HEIGHT}`, "-framerate", String(FPS), "-i", "pipe:0",
    "-an", "-vf", "scale=out_color_matrix=bt709", "-c:v", "libx264", "-preset", "fast", "-crf", "15",
    "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-movflags", "+faststart", "-metadata", "title=Sophia — диалог с Платоном", "-metadata", `comment=${credit}`,
    "-frames:v", String(length), temporary,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const encoder = new Promise((resolve, reject) => {
    runner.once("error", reject);
    runner.once("close", code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}.`)));
  });
  async function* frames() {
    for (let frame = 0; frame < length; frame++) {
      draw(frame);
      yield canvas.data();
      if ((frame + 1) % 300 === 0) console.log(`Frame ${frame + 1}/${length}`);
    }
  }
  try {
    await Promise.all([pipeline(Readable.from(frames()), runner.stdin), encoder]);
    await rename(temporary, output);
    console.log(`Wrote ${output} in ${((performance.now() - started) / 1000).toFixed(1)} s.`);
  } finally {
    runner.kill();
    await rm(temporary, { force: true });
  }
}
