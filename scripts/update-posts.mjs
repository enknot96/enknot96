// Fetches the latest dev.to posts and renders them as cards between
// <!-- BLOG-POST-LIST:START --> and <!-- BLOG-POST-LIST:END --> in README.md.
import { readFile, writeFile } from "node:fs/promises";

const USER = "enknot96";
const MAX_POSTS = 4;
const README = new URL("../README.md", import.meta.url);

async function loadPosts() {
  if (process.env.POSTS_FILE) return JSON.parse(await readFile(process.env.POSTS_FILE, "utf8"));
  const res = await fetch(`https://dev.to/api/articles?username=${USER}&per_page=${MAX_POSTS}`, {
    headers: { "User-Agent": `${USER}-profile-readme` },
  });
  if (!res.ok) throw new Error(`dev.to API responded ${res.status}`);
  return res.json();
}

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const date = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });

function card(p) {
  const url = esc(p.url);
  const title = esc(p.title);
  const cover = p.cover_image ? `<a href="${url}"><img src="${esc(p.cover_image)}" alt="${title}" width="100%" /></a><br />\n      ` : "";
  const tags = (p.tag_list ?? []).slice(0, 3).map((t) => `#${esc(t)}`).join(" ");
  const meta = [date(p.published_at), `${p.reading_time_minutes} min read`, tags].filter(Boolean).join(" · ");
  return `    <td width="50%" valign="top">
      ${cover}<a href="${url}"><b>${title}</b></a><br />
      <sub>${meta}</sub>
    </td>`;
}

function render(posts) {
  if (posts.length === 0) return "";
  const rows = [];
  for (let i = 0; i < posts.length; i += 2) {
    const cells = posts.slice(i, i + 2).map(card);
    if (cells.length === 1) cells.push(`    <td width="50%"></td>`);
    rows.push(`  <tr>\n${cells.join("\n")}\n  </tr>`);
  }
  return `<table>\n${rows.join("\n")}\n</table>`;
}

const posts = (await loadPosts()).slice(0, MAX_POSTS);
const readme = await readFile(README, "utf8");
const updated = readme.replace(
  /(<!-- BLOG-POST-LIST:START -->)[\s\S]*?(<!-- BLOG-POST-LIST:END -->)/,
  `$1\n${render(posts)}\n$2`,
);
if (updated === readme) {
  console.log("No changes.");
} else {
  await writeFile(README, updated);
  console.log(`Rendered ${posts.length} post(s).`);
}
