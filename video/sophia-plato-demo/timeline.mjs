import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 60;
export const DURATION = 30;

const palette = {
  white: "#f8faf7", mint: "#bcefe0", lavender: "#d9ddf8", ink: "#293b3c",
  green: "#3e6351", logoDot: "#658b70", reading: "#fafcf9", dark: "#182d29",
};
const view = { x: 720, y: 405, z: 1 };
const chatWide = { x: 720, y: 405, z: 1.055 };
const chatInput = { x: 845, y: 534, z: 1.55 };
const chatRead = { x: 845, y: 358, z: 1.79 };
const chatFinal = { x: 845, y: 358, z: 1.86 };
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const progress = (time, start, end) => clamp((time - start) / (end - start));
const ease = x => x ** 3 * (10 + x * (-15 + 6 * x));
const at = (time, start, end) => ease(progress(time, start, end));
const mix = (a, b, p) => a + (b - a) * p;
const camera = (a, b, p) => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), z: mix(a.z, b.z, p) });
const point = (rect, x = 0.5, y = 0.5) => ({ x: rect.x + rect.width * x, y: rect.y + rect.height * y });
const rectangle = (a, b, p) => ({
  x: mix(a.x, b.x, p), y: mix(a.y, b.y, p),
  width: mix(a.width, b.width, p), height: mix(a.height, b.height, p),
});

function spring(p) {
  if (p >= 1) return 1;
  return 1 - Math.exp(-7.5 * p) * (Math.cos(8 * p) + 0.9375 * Math.sin(8 * p));
}

export async function makeTimeline() {
  const meta = JSON.parse(await readFile(new URL("captures/recording.json", import.meta.url), "utf8"));
  for (const family of ["Latin", "Cyrillic"]) {
    const font = new URL(`fonts/manrope-${family.toLowerCase()}-wght-normal.woff2`, import.meta.url);
    if (!GlobalFonts.registerFromPath(fileURLToPath(font), `Manrope ${family}`)) {
      throw new Error(`Could not load Manrope ${family}.`);
    }
  }
  const stageNames = ["waiting1", "reply1", "waiting2", "reply2"];
  const samples = [meta.samples1, meta.samples2].flatMap((count, turn) =>
    Array.from({ length: count }, (_, index) => `type-${turn + 1}-${index}`));
  const names = ["home", "entry", "empty", ...stageNames, ...stageNames.map(name => `log-${name}`), ...samples];
  const images = Object.fromEntries(await Promise.all(names.map(async name => [
    name, await loadImage(fileURLToPath(new URL(`captures/${name}.png`, import.meta.url))),
  ])));
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingQuality = "high";
  const { viewport, dialog, history, composer, stages } = meta;
  const captureScale = meta.scale;
  const ratio = WIDTH / viewport.width;
  const trigger = point(meta.trigger, 0.7, 0.54);
  const input = point(meta.input, 0.07, 0.68);
  const send = point(meta.send);
  const cameraOnTrigger = { x: 678, y: 470, z: 1.18 };
  const composeArea = {
    ...history,
    height: dialog.y + dialog.height - 1 - history.y,
  };
  const readArea = {
    ...history,
    y: 158.5,
    height: history.y + history.height - 158.5,
  };

  function layer(opacity, draw) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(opacity);
    draw();
    ctx.restore();
  }

  function crop(name, rect, x = rect.x, y = rect.y) {
    ctx.drawImage(images[name], rect.x * captureScale, rect.y * captureScale,
      rect.width * captureScale, rect.height * captureScale, x, y, rect.width, rect.height);
  }

  function drawViewport(name) {
    ctx.drawImage(images[name], 0, 0, viewport.width, viewport.height);
  }

  function solid(color, x = 0, y = 0, width = WIDTH, height = HEIGHT) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  function glow(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color.slice(0, 7) + "00");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function centered(text, y, size, weight, color, spacing = 0) {
    ctx.font = `${weight} ${size}px "Manrope Cyrillic"`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillStyle = color;
    if (ctx.measureText(text).width > WIDTH - 240) throw new Error("Title exceeds the safe area.");
    ctx.fillText(text, WIDTH / 2, y);
  }

  function wordmark(y, size, color, dot) {
    ctx.font = `800 ${size}px "Manrope Latin"`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.letterSpacing = `${-size * 2 / 33}px`;
    const start = (WIDTH - ctx.measureText("sophia.").width) / 2;
    ctx.fillStyle = color;
    ctx.fillText("sophia", start, y);
    ctx.fillStyle = dot;
    ctx.fillText(".", start + ctx.measureText("sophia").width, y);
  }

  function opening(time) {
    solid(palette.white);
    glow(1240 + time * 32, 495, 810, "#ddf2d5b5");
    glow(550 - time * 28, 580, 670, "#d9ddf867");
    const brand = at(time, 0.05, 1.08);
    const line = at(time, 0.52, 1.52);
    layer(brand, () => wordmark(520 + (1 - spring(brand)) * 24, 170, palette.ink, palette.logoDot));
    layer(line, () => centered(meta.labels.intro, 641 + (1 - line) * 16, 48, 560, palette.green, -1.6));
  }

  function closing(time, opacity) {
    layer(opacity, () => {
      solid(palette.dark);
      glow(1240, 410, 920, "#3e635170");
      glow(400, 780, 790, "#293b3cbd");
    });
    const brand = at(time, 26.27, 27.14);
    const line = at(time, 26.61, 27.63);
    const [lead, finish] = meta.labels.outro.split(/(?<=\.) /u);
    layer(brand, () => wordmark(428 + (1 - spring(brand)) * 22, 126, palette.white, palette.mint));
    layer(line, () => {
      centered(lead, 587 + (1 - line) * 16, 60, 570, palette.white, -2.05);
      centered(finish, 673 + (1 - line) * 16, 70, 710, palette.mint, -2.4);
    });
  }

  function world(current, draw) {
    ctx.save();
    ctx.scale(ratio, ratio);
    ctx.translate(view.x, view.y);
    ctx.scale(current.z, current.z);
    ctx.translate(-current.x, -current.y);
    draw();
    ctx.restore();
  }

  function cursor(p, opacity, click = -1) {
    layer(opacity, () => {
      ctx.translate(p.x, p.y);
      if (click >= 0 && click < 1) {
        ctx.beginPath();
        ctx.arc(1.5, 1.5, 6 + 19 * ease(click), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(105, 160, 135, ${0.62 * (1 - click)})`;
        ctx.lineWidth = 1.9;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 19);
      ctx.lineTo(4.7, 14.7);
      ctx.lineTo(8.7, 22);
      ctx.lineTo(12, 20.3);
      ctx.lineTo(8.2, 13);
      ctx.lineTo(14.5, 12.7);
      ctx.closePath();
      ctx.shadowColor = "#182d2950";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1.4;
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineJoin = "round";
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    });
  }

  function cursorPath(from, to, p, bend) {
    return { x: mix(from.x, to.x, p), y: mix(from.y, to.y, p) - Math.sin(Math.PI * p) * bend };
  }

  function landing(time) {
    const scroll = meta.homeScroll * at(time, 4.02, 5.65);
    const current = camera(view, cameraOnTrigger, at(time, 4.63, 5.78));
    world(current, () => {
      ctx.drawImage(images.home, 0, -scroll, images.home.width / captureScale, images.home.height / captureScale);
      crop("home", meta.header);
      layer(at(time, 5.58, 5.85), () => drawViewport("entry"));
      const p = cursorPath({ x: 932, y: 709 }, trigger, at(time, 5.19, 5.92), 54);
      cursor(p, at(time, 5.22, 5.51), (time - 5.99) / 0.42);
    });
  }

  function scrollLimit(name) {
    return Math.max(0, stages[name].height - history.height);
  }

  function log(name, scroll, emphasis = 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(history.x, history.y, history.width, history.height);
    ctx.clip();
    solid(palette.reading, history.x, history.y, history.width, history.height);
    ctx.drawImage(images[`log-${name}`], history.x, history.y - scroll, history.width, stages[name].height);
    if (emphasis > 0) {
      const lines = stages[name].items.at(-1).lines;
      const featured = name === "reply1"
        ? lines.find(line => line.text === "каждому отводится своё") ?? lines.at(-1)
        : lines.findLast(line => line.text.endsWith("?"));
      layer(emphasis, () => {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = name === "reply1" ? "#d8ede2" : "#e6e5f9";
        for (const rect of featured?.rects ?? []) {
          if (rect.width < 5) continue;
          ctx.beginPath();
          ctx.roundRect(history.x + rect.x - 2, history.y + rect.y - scroll - 0.3, rect.width + 4, rect.height + 0.6, 4);
          ctx.fill();
        }
      });
    }
    if (scroll > 0) {
      const shade = ctx.createLinearGradient(0, history.y, 0, history.y + history.height);
      shade.addColorStop(0, palette.reading);
      shade.addColorStop(0.056, "#fafcf900");
      shade.addColorStop(0.944, "#fafcf900");
      shade.addColorStop(1, palette.reading);
      ctx.fillStyle = shade;
      ctx.fillRect(history.x, history.y, history.width, history.height);
    }
    ctx.restore();
  }

  function typing(turn, p) {
    if (p <= 0) return;
    const count = turn === 1 ? meta.samples1 : meta.samples2;
    const index = Math.min(count - 1, Math.floor(count * p));
    ctx.drawImage(images[`type-${turn}-${index}`], composer.x, composer.y, composer.width, composer.height);
  }

  function chat(time) {
    const opening = progress(time, 5.99, 6.64);
    const focusInput = at(time, 6.91, 8.06);
    const focusReply = at(time, 9.63, 10.66);
    const returnToInput = at(time, 18.84, 19.63) * (1 - at(time, 20.63, 21.78));
    let current = camera(cameraOnTrigger, chatWide, at(time, 5.99, 7.0));
    current = camera(current, chatInput, focusInput);
    current = camera(current, chatRead, focusReply);
    current = camera(current, chatInput, returnToInput);
    current = camera(current, chatFinal, at(time, 21.05, 22.07));
    const focusRegion = rectangle(rectangle(composeArea, readArea, focusReply), composeArea, returnToInput);
    const matte = rectangle(dialog, focusRegion, focusInput);
    const firstSend = 9.4;
    const secondSend = 20.55;
    const isTyping1 = time < firstSend;
    const isTyping2 = time >= 19.0 && time < secondSend;
    const firstScroll = mix(0, 94, at(time, 12.12, 13.15));
    const tailScroll = mix(firstScroll, scrollLimit("reply1"), at(time, 16.85, 18.65));
    const waiting2Scroll = mix(tailScroll, scrollLimit("waiting2"), at(time, secondSend, 21.36));
    const secondScroll = mix(waiting2Scroll, scrollLimit("reply2"), at(time, 21.35, 22.22));

    world(current, () => {
      drawViewport("entry");
      layer(at(time, 5.99, 6.53), () => solid("#1b302d70", 0, 0, viewport.width, viewport.height));
      layer(focusInput, () => {
        const background = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
        background.addColorStop(0, "#d8e5dd");
        background.addColorStop(1, "#dbe0ed");
        solid(background, 0, 0, viewport.width, viewport.height);
      });
      layer(ease(opening), () => {
        const center = point(dialog);
        ctx.translate(center.x, center.y + (1 - spring(opening)) * 17);
        const scale = 0.957 + spring(opening) * 0.043;
        ctx.scale(scale, scale);
        ctx.translate(-center.x, -center.y);
        ctx.beginPath();
        ctx.roundRect(matte.x, matte.y, matte.width, matte.height, 24 - 12 * focusInput);
        ctx.fillStyle = palette.reading;
        ctx.shadowColor = "#142d2940";
        ctx.shadowBlur = 52;
        ctx.shadowOffsetY = 16;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.clip();
        const stage = isTyping1 ? "empty" : time < 12 ? "waiting1"
          : time < secondSend ? "reply1" : time < 21.35 ? "waiting2" : "reply2";
        crop(stage, dialog);
        if (stage === "waiting1") {
          layer(1 - at(time, firstSend, firstSend + 0.30), () => crop("empty", history));
        } else if (stage === "reply1") {
          log("reply1", tailScroll, at(time, 12.84, 13.49) * (1 - at(time, 17.44, 18.25)));
          layer(1 - at(time, 12, 12.53), () => log("waiting1", 0));
        } else if (stage === "waiting2") {
          log("waiting2", waiting2Scroll);
        } else if (stage === "reply2") {
          log("reply2", secondScroll, at(time, 22.16, 22.91));
          layer(1 - at(time, 21.35, 21.67), () => log("waiting2", waiting2Scroll));
        }
        if (isTyping1) typing(1, progress(time, 7.35, 8.69));
        if (isTyping2) typing(2, progress(time, 19.04, 20.39));
      });
      if (time < 7.05) {
        cursor(trigger, 1 - at(time, 6.30, 6.88), (time - 5.99) / 0.42);
      } else if (time < 10.05) {
        const position = cursorPath({ x: 810, y: 556 }, input, at(time, 7.03, 7.35), 33);
        const target = cursorPath(position, send, at(time, 8.77, 9.37), 42);
        cursor(target, at(time, 7.04, 7.21) * (1 - at(time, 9.49, 9.77)), (time - firstSend) / 0.35);
      } else if (time >= 19.66 && time < 21.09) {
        const target = cursorPath({ x: 1049, y: 673 }, send, at(time, 19.91, 20.51), 24);
        cursor(target, at(time, 19.69, 19.95) * (1 - at(time, 20.72, 21.07)), (time - secondSend) / 0.34);
      }
    });
  }

  return {
    canvas,
    draw(frame) {
      const time = frame / FPS;
      solid(palette.white);
      if (time < 3.42) opening(time);
      if (time >= 2.94 && time < 6.55) {
        layer(at(time, 2.94, 3.42), () => landing(time < 5.99 ? time : 5.99));
      }
      if (time >= 5.99 && time < 27.19) {
        layer(at(time, 5.99, 6.14), () => chat(time));
      }
      if (time >= 26) closing(time, at(time, 26, 27.16));
    },
  };
}
