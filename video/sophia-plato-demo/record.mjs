import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { directory, withPrivateChat } from "./dialogue.mjs";

const assets = join(directory, "captures");
const screenshotOptions = { animations: "disabled", caret: "hide" };
const output = name => join(assets, `${name}.png`);
const transcript = join(directory, "transcript.json");
const replay = process.argv.includes("--replay") ? JSON.parse(await readFile(transcript, "utf8")).turns : null;

function followUp(answer) {
  if (/(?:оружи|меч).{0,90}(?:друг|безум)|(?:друг|безум).{0,90}(?:оружи|меч)/isu.test(answer)) {
    return "Долги надо возвращать всегда, но оружие другу в ярости я бы не отдал.";
  }
  if (/равенств|поровну|равные доли/iu.test(answer)) {
    return "Справедливо делить поровну. Но если один сделал вдвое больше, ему полагается больше.";
  }
  return "Мне кажется, справедливо всегда возвращать то, что взял.";
}

await mkdir(assets, { recursive: true });
await withPrivateChat(async ({ page, trigger, dialog, input, send, history, firstQuestion, turns, turn }) => {
  const box = async locator => {
    const bounds = await locator.boundingBox();
    if (!bounds) throw new Error("A capture target is outside the layout.");
    return bounds;
  };
  const labels = {
    intro: "Философия становится диалогом",
    outro: "Не просто изучай философию. Философствуй",
  };
  const meta = { viewport: page.viewportSize(), scale: 2, labels, stages: {}, turns };
  const still = (name, options = {}) => page.screenshot({ path: output(name), ...screenshotOptions, ...options });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".site-header").waitFor();
  meta.header = await box(page.locator(".site-header"));
  await still("home", { fullPage: true });
  const target = await box(trigger);
  const homeScroll = await page.evaluate(y => {
    window.scrollTo({ top: Math.max(0, y - innerHeight * 0.63), behavior: "instant" });
    return scrollY;
  }, target.y);
  meta.homeScroll = homeScroll;
  meta.trigger = await box(trigger);
  await still("entry");
  await trigger.click();
  await input.waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll("dialog img")].map(image => image.decode()));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  meta.dialog = await box(dialog);
  meta.history = await box(history);
  meta.input = await box(input);
  meta.send = await box(send);
  meta.composer = await box(input.locator("xpath=ancestor::form"));
  await still("empty");

  async function typeSamples(id, question) {
    const characters = [...question];
    const values = Array.from({ length: 16 }, (_, index) =>
      characters.slice(0, Math.round((index + 1) * characters.length / 16)).join(""));
    await input.focus();
    for (const [index, value] of values.entries()) {
      await input.fill(value);
      await input.locator("xpath=ancestor::form").screenshot({ path: output(`type-${id}-${index}`), ...screenshotOptions });
    }
    return values.length;
  }

  async function stage(name) {
    await history.evaluate(element => { element.scrollTop = 0; });
    await still(name);
    const viewport = page.viewportSize();
    const contentHeight = await history.evaluate(element => {
      const last = element.querySelector('[role="log"]')?.lastElementChild;
      return Math.ceil(last.getBoundingClientRect().bottom - element.getBoundingClientRect().top + 20);
    });
    const height = Math.max(contentHeight, Math.ceil(meta.history.height));
    await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 32) });
    const clone = dialog.locator("[data-film-log]");
    await history.evaluate((element, { width, size }) => {
      const copy = element.cloneNode(true);
      copy.dataset.filmLog = "";
      Object.assign(copy.style, {
        position: "fixed", top: "12px", left: "12px", width: `${width}px`,
        height: `${size}px`, flex: "none", overflow: "hidden", zIndex: "2",
        backgroundColor: "#fafcf9",
      });
      element.closest("dialog").append(copy);
    }, { width: meta.history.width, size: height });
    try {
      const region = await box(clone);
      const items = await clone.evaluate(element => {
        const root = element.getBoundingClientRect();
        function relative(rect) {
          return { x: rect.x - root.x, y: rect.y - root.y, width: rect.width, height: rect.height };
        }
        return [...element.querySelectorAll('[class*="essageAuthor"], [role="status"]')].map(author => {
          const bubble = author.parentElement;
          const text = bubble === element.firstElementChild ? null : bubble.querySelector("p");
          if (!text) return { author: author.textContent, bounds: relative(author.getBoundingClientRect()) };
          const lines = [];
          const node = text.firstChild;
          const value = text.textContent;
          const emphasis = [
            ...value.matchAll(/каждому отводится своё/gu),
            ...value.matchAll(/«[^»]+»/gu),
            ...[...value.matchAll(/[^.!?\n]+\?/gu)].slice(-1),
          ];
          for (const match of emphasis) {
            const line = document.createRange();
            const start = match.index + (match[0].length - match[0].trimStart().length);
            line.setStart(node, start);
            line.setEnd(node, match.index + match[0].length);
            lines.push({ text: match[0].trim(), rects: [...line.getClientRects()].map(relative) });
          }
          return { author: author.textContent, bounds: relative(bubble.getBoundingClientRect()), lines };
        });
      });
      if (region.height < height) throw new Error(`Incomplete history capture: ${name} (${region.height}/${height})`);
      await clone.screenshot({ path: output(`log-${name}`), ...screenshotOptions });
      meta.stages[name] = { height: region.height, items };
    } finally {
      await clone.evaluate(element => element.remove());
      await page.setViewportSize(viewport);
    }
  }

  meta.samples1 = await typeSamples(1, firstQuestion);
  const first = await turn(firstQuestion, async () => {
    await history.getByText("Платон размышляет…").waitFor();
    await stage("waiting1");
  });
  console.log(`Turn 1 captured: ${first.answer}`);
  await stage("reply1");
  const secondQuestion = replay?.[1].question ?? (process.env.SOPHIA_DEMO_FOLLOWUP || followUp(first.answer));
  meta.samples2 = await typeSamples(2, secondQuestion);
  const second = await turn(secondQuestion, async () => {
    await history.getByText("Платон размышляет…").waitFor();
    await stage("waiting2");
  });
  console.log(`Turn 2 captured: ${second.answer}`);
  await stage("reply2");
  await writeFile(join(assets, "recording.json"), JSON.stringify(meta, null, 2) + "\n");
  if (!replay) {
    await writeFile(transcript, JSON.stringify({ origin: "Sophia /api/philosopher-chat, private live session", turns }, null, 2) + "\n");
  }
}, replay);
