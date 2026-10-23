// Mirrors the open dataset published at https://fuelpricetoday.co.uk/data
// into ./data, then regenerates the README tables, datapackage.json and the
// Kaggle metadata from the site's manifest. No dependencies: Node 20 or later.
//
//   node sync.mjs
//
// Only closed months of station history are mirrored. The current month is
// rewritten on the site after every collection; committing it here would add
// a few megabytes to the git history every week for data that is a click away.

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// SITE can point at a local build for testing.
const SITE = process.env.SITE ?? "https://fuelpricetoday.co.uk";
const DATA = new URL("./data/", import.meta.url).pathname;
const ROOT = new URL("./", import.meta.url).pathname;
const MONTH = /^history-(\d{4}-\d{2})\.csv\.gz$/;
const ATTRIBUTION =
  "Contains public sector information licensed under the Open Government Licence v3.0. Data via fuelpricetoday.co.uk.";

async function get(path) {
  const res = await fetch(`${SITE}${path}`, { headers: { "user-agent": "uk-fuel-prices-history sync (github)" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res;
}

async function size(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return -1;
  }
}

function lastDayOfMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const fmt = (n) => n.toLocaleString("en-GB");
const mb = (b) => (b < 1_000_000 ? `${Math.max(1, Math.round(b / 1000))} KB` : `${(b / 1_000_000).toFixed(1)} MB`);

const manifest = await (await get("/data/manifest.json")).json();
if (!manifest.colonnes) throw new Error("manifest without column dictionary: the site is older than this script");

// A month is closed when the site's history reaches its last day.
const kept = manifest.fichiers.filter((f) => {
  const m = MONTH.exec(f.nom);
  return !m || f.au === lastDayOfMonth(m[1]);
});

await mkdir(DATA, { recursive: true });
const changed = [];
for (const f of kept) {
  const target = join(DATA, f.nom);
  if ((await size(target)) === f.octets) continue;
  const body = Buffer.from(await (await get(`/data/${f.nom}`)).arrayBuffer());
  if (body.length !== f.octets) throw new Error(`${f.nom}: ${body.length} bytes, manifest says ${f.octets}`);
  await writeFile(`${target}.tmp`, body);
  await rename(`${target}.tmp`, target);
  changed.push(f.nom);
}

const months = kept.filter((f) => MONTH.test(f.nom));
const daily = kept.find((f) => f.nom === "uk-daily.csv");
const stations = kept.find((f) => f.nom === "stations.csv");
const prices = months.reduce((t, f) => t + f.lignes, 0);
const dictionary = (name) => manifest.colonnes[MONTH.test(name) ? "history-YYYY-MM.csv.gz" : name] ?? [];

// --- README: only the block between the markers is generated.
const table = [
  "| File | Rows | Size | Period |",
  "|---|---:|---:|---|",
  ...kept.map((f) => `| [\`${f.nom}\`](data/${f.nom}) | ${fmt(f.lignes)} | ${mb(f.octets)} | ${f.du && f.au ? `${f.du} to ${f.au}` : "current"} |`),
].join("\n");
const columns = ["uk-daily.csv", "towns-daily.csv", "stations.csv", "history-YYYY-MM.csv.gz"]
  .map((name) => [`### \`${name}\``, "", "| Column | Meaning |", "|---|---|",
    ...dictionary(name).map(([c, d]) => `| \`${c}\` | ${d} |`)].join("\n"))
  .join("\n\n");
const generated = [
  `As of ${manifest.reference}: ${fmt(prices)} daily station prices in ${months.length} closed month${months.length > 1 ? "s" : ""}, ` +
    `${fmt(stations?.lignes ?? 0)} filling stations, ${fmt(daily?.lignes ?? 0)} days of UK averages since ${daily?.du}.`,
  "",
  table,
  "",
  "The current month, updated every three hours, is on [fuelpricetoday.co.uk/data](https://fuelpricetoday.co.uk/data).",
  "",
  "## How the averages are calculated",
  "",
  "The averages are the ones drawn on fuelpricetoday.co.uk. They leave out motorway services, which charge their own prices, " +
    `and prices unchanged for more than ${manifest.fenetre_jours} days: a price that has not moved is still the price on the pump, ` +
    "since any change must be reported within 30 minutes, but a long silence suggests a station that has stopped reporting. " +
    `A price more than ${manifest.ecart_aberrant}p from the day's median is left out of the average as a reporting error. ` +
    "Each average carries the number of stations behind it.",
  "",
  "`price_last_updated` in the history files is when the retailer last **changed** the price, not when it was last confirmed.",
  "",
  "## Columns",
  "",
  columns,
].join("\n");
const readmePath = join(ROOT, "README.md");
const readme = await readFile(readmePath, "utf8");
const START = "<!-- generated:start -->", END = "<!-- generated:end -->";
const i = readme.indexOf(START), j = readme.indexOf(END);
if (i < 0 || j < i) throw new Error("README.md: generated markers missing");
await writeFile(readmePath, `${readme.slice(0, i + START.length)}\n${generated}\n${readme.slice(j)}`);

// --- Frictionless Data Package, read by data portals and pandas tooling.
const schema = (name) => ({ fields: dictionary(name).map(([c, d]) => ({ name: c, description: d })) });
const datapackage = {
  name: "uk-fuel-prices-history",
  title: "UK fuel prices by filling station, daily",
  homepage: `${SITE}/data`,
  version: manifest.reference,
  licenses: [{ name: "OGL-UK-3.0", path: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/", title: "Open Government Licence v3.0" }],
  sources: [{ title: "Fuel Finder (Department for Energy Security and Net Zero)", path: "https://www.gov.uk/guidance/access-fuel-price-data" }],
  resources: kept.map((f) => ({
    name: f.nom.replace(/\.csv(\.gz)?$/, ""),
    path: `data/${f.nom}`,
    format: "csv",
    mediatype: "text/csv",
    ...(f.nom.endsWith(".gz") ? { compression: "gz" } : {}),
    bytes: f.octets,
    schema: schema(f.nom),
  })),
};
await writeFile(join(ROOT, "datapackage.json"), `${JSON.stringify(datapackage, null, 2)}\n`);

// --- Kaggle reads its metadata from the uploaded folder itself.
const kaggle = {
  id: process.env.KAGGLE_DATASET ?? "fuelpricetoday/uk-fuel-prices-history",
  title: "UK Fuel Prices by Station, Daily",
  subtitle: "Every petrol and diesel price at UK filling stations, from the Fuel Finder feed",
  description: `${readme.slice(0, i).trim()}\n\n${generated}\n\n${ATTRIBUTION}`,
  licenses: [{ name: "other" }],
  keywords: ["energy", "transportation", "time series analysis", "geospatial analysis"],
  resources: kept.map((f) => ({
    path: f.nom,
    description: `${fmt(f.lignes)} rows. Columns are described in the dataset description.`,
    schema: { fields: dictionary(f.nom).map(([c, d]) => ({ name: c, description: d })) },
  })),
};
await writeFile(join(DATA, "dataset-metadata.json"), `${JSON.stringify(kaggle, null, 2)}\n`);

console.log(`${manifest.reference}: ${kept.length} files, ${changed.length ? `updated ${changed.join(", ")}` : "nothing new"}`);
