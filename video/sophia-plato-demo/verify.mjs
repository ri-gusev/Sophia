import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline.mjs";

const mp4 = fileURLToPath(new URL("sophia-plato-demo.mp4", import.meta.url));
const ffmpeg = process.env.SOPHIA_DEMO_FFMPEG || "ffmpeg";
const ffprobe = process.env.SOPHIA_DEMO_FFPROBE || "ffprobe";
const info = JSON.parse(execFileSync(ffprobe, [
  "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_streams", "-show_format", "-of", "json", mp4,
], { encoding: "utf8" }));
const [video] = info.streams;
assert(info.format.format_name.includes("mp4"));
assert.equal(video.codec_name, "h264");
assert.equal(video.width, WIDTH);
assert.equal(video.height, HEIGHT);
assert.equal(video.pix_fmt, "yuv420p");
assert.equal(video.r_frame_rate, `${FPS}/1`);
assert.equal(video.avg_frame_rate, `${FPS}/1`);
assert.equal(Number(video.nb_read_frames), FPS * DURATION);
assert.equal(Number(video.duration), DURATION);
assert.equal(Number(info.format.duration), DURATION);
assert.equal(Number(video.start_time), 0);

const frames = execFileSync(ffprobe, [
  "-v", "error", "-select_streams", "v:0", "-show_entries", "frame=best_effort_timestamp_time",
  "-of", "csv=p=0", mp4,
], { encoding: "utf8" }).split(/\r?\n/).map(line => line.split(",")[0]).filter(Boolean).map(Number);
assert.equal(frames.length, FPS * DURATION);
for (const [index, timestamp] of frames.entries()) {
  assert(Math.abs(timestamp - index / FPS) < 0.000001, `Incorrect timestamp at frame ${index}: ${timestamp}.`);
}
execFileSync(ffmpeg, ["-v", "error", "-xerror", "-i", mp4, "-map", "0:v:0", "-f", "null", "-"]);
console.log(`MP4/H.264 · ${WIDTH}×${HEIGHT} · ${FPS} FPS CFR · ${DURATION.toFixed(3)} s · ${frames.length} frames · decoded without errors`);
