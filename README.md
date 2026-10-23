# UK fuel prices by filling station, daily

The price of petrol and diesel at every filling station in the United Kingdom,
one reading per station, fuel and day, from the government's
[Fuel Finder](https://www.gov.uk/guidance/access-fuel-price-data) scheme.

Since 2025, [The Motor Fuel Price (Open Data) Regulations 2025](https://www.legislation.gov.uk/uksi/2025/1356/introduction/made)
require every forecourt to report each price change within 30 minutes. The
official feed only shows the current price and keeps no history. These files
are that history, collected every three hours by
[fuelpricetoday.co.uk](https://fuelpricetoday.co.uk/data), cleaned, and
published under the Open Government Licence.

What the cleaning does:

- **Stable identifiers.** `node_id` is the Fuel Finder identifier, the key
  between the station list and the history files.
- **One spelling per brand.** Raw brand strings, with their variants and
  typos, are mapped to the major brands; the raw value is kept in `brand_raw`.
- **Pence per litre everywhere.** Some retailers type a price in pounds or in
  tenths of a penny; an implausible price is dropped rather than guessed.
- **Nation from the postcode.** The feed's own country field is unusable.
- **Arrivals and departures.** `first_seen` and `last_seen` show when a
  station entered or left the feed.

## Files

<!-- generated:start -->
As of 2026-10-23: 631,357 daily station prices in 1 closed month, 8,143 filling stations, 47 days of UK averages since 2026-09-07.

| File | Rows | Size | Period |
|---|---:|---:|---|
| [`uk-daily.csv`](data/uk-daily.csv) | 47 | 2 KB | 2026-09-07 to 2026-10-23 |
| [`towns-daily.csv`](data/towns-daily.csv) | 34,203 | 2.3 MB | 2026-09-07 to 2026-10-23 |
| [`stations.csv`](data/stations.csv) | 8,143 | 3.3 MB | current |
| [`stations-changes.csv`](data/stations-changes.csv) | 123 | 25 KB | 2026-09-07 to 2026-10-23 |
| [`history-2026-09.csv.gz`](data/history-2026-09.csv.gz) | 631,357 | 3.2 MB | 2026-09-07 to 2026-09-30 |

The current month, updated every three hours, is on [fuelpricetoday.co.uk/data](https://fuelpricetoday.co.uk/data).

## How the averages are calculated

The averages are the ones drawn on fuelpricetoday.co.uk. They leave out motorway services, which charge their own prices, and prices unchanged for more than 30 days: a price that has not moved is still the price on the pump, since any change must be reported within 30 minutes, but a long silence suggests a station that has stopped reporting. A price more than 25p from the day's median is left out of the average as a reporting error. Each average carries the number of stations behind it.

`price_last_updated` in the history files is when the retailer last **changed** the price, not when it was last confirmed.

## Columns

### `uk-daily.csv`

| Column | Meaning |
|---|---|
| `date` | Day of observation, YYYY-MM-DD. |
| `unleaded_avg_ppl` | Average unleaded (E10) price, pence per litre, one decimal. |
| `unleaded_stations` | Number of stations behind that average. |
| `diesel_avg_ppl` | Average diesel (B7) price, pence per litre, one decimal. |
| `diesel_stations` | Number of stations behind that average. |
| `price_changes` | Station prices, all fuels and all stations, that differ from the day before. Blank on the first day. |

### `towns-daily.csv`

| Column | Meaning |
|---|---|
| `date` | Day of observation, YYYY-MM-DD. |
| `town` | Town name as shown on this site. |
| `town_slug` | Identifier of the town, as in /petrol-prices/<town_slug>. |
| `nation` | England, Scotland, Wales or Northern Ireland. |
| `unleaded_avg_ppl` | Average unleaded (E10) price in the town, pence per litre. |
| `unleaded_min_ppl` | Lowest unleaded price at a station in the town that day. |
| `unleaded_stations` | Number of stations behind the unleaded figures. |
| `diesel_avg_ppl` | Average diesel (B7) price in the town, pence per litre. |
| `diesel_min_ppl` | Lowest diesel price at a station in the town that day. |
| `diesel_stations` | Number of stations behind the diesel figures. |

### `stations.csv`

| Column | Meaning |
|---|---|
| `node_id` | Fuel Finder identifier of the station. Stable, and the key into the history files. |
| `name` | Station name, with consistent capitalisation. |
| `brand` | Brand, one spelling per brand. Blank for independents. |
| `brand_raw` | Brand exactly as the retailer reported it. |
| `address` | Address lines as reported, with consistent capitalisation. |
| `town` | Town as shown on this site. |
| `postcode` | Full postcode. |
| `postcode_district` | Outward code, for example BA1. |
| `postcode_area` | Postcode area, for example BA. |
| `nation` | Derived from the postcode, as the feed's own country field is unreliable. |
| `latitude` | WGS84 latitude. |
| `longitude` | WGS84 longitude. |
| `motorway` | 1 for motorway services. |
| `supermarket` | 1 for a supermarket forecourt. |
| `members_only` | 1 where only members can buy fuel (Costco). |
| `services` | Services reported by the station, separated by semicolons. |
| `temporarily_closed` | 1 if the feed marks the station temporarily closed. |
| `first_seen` | First day we recorded a price for the station. |
| `last_seen` | Last day we recorded a price for the station. |
| `page_url` | The station's page on this site. |
| `fuels` | Fuel grades the station declares it sells, separated by semicolons (E10, E5, B7_STANDARD, B7_PREMIUM, B10, HVO). A grade missing here proves nothing. |
| `opening_hours` | Opening hours in OpenStreetMap opening_hours syntax, converted from the feed. Blank when any day is not reported. |
| `phone` | Public phone number, as reported. |
| `coordinates_fix` | Blank when the position is as reported. swapped: latitude and longitude were inverted; longitude_sign: the sign was lost; both were corrected because only the corrected point falls in the UK. outside_uk: left as reported, and wrong. |

### `stations-changes.csv`

| Column | Meaning |
|---|---|
| `change` | arrival (first price reported), departure (no price for 7 days or more) or return (reporting again after such a gap). |
| `date` | Arrival: first day with a price. Departure: last day with a price. Return: day it came back. |
| `node_id` | Fuel Finder identifier, as in stations.csv. |
| `name` | Station name. |
| `brand` | Brand, one spelling per brand. Blank for independents. |
| `town` | Town as shown on this site. |
| `postcode` | Full postcode. |
| `nation` | England, Scotland, Wales or Northern Ireland. |
| `days` | Departure: days since the last price. Return: length of the absence, in days. |
| `permanently_closed_on` | Departure: the date the feed gives for a permanent closure, when it gives one. |
| `temporarily_closed` | Departure: 1 if the feed marked the station temporarily closed the last time we saw it. |
| `page_url` | The station's page on this site, while it is in the feed. |

### `history-YYYY-MM.csv.gz`

| Column | Meaning |
|---|---|
| `node_id` | Fuel Finder identifier, as in stations.csv. |
| `fuel` | E10, E5, B7_STANDARD, B7_PREMIUM, B10 or HVO. |
| `date` | Day of observation, YYYY-MM-DD. One reading per station, fuel and day: the last one we saw. |
| `price_ppl` | Price in pence per litre. |
| `price_last_updated` | When the retailer last changed this price, as reported by the feed (UTC). |
<!-- generated:end -->

## Licence and attribution

The data is published under the
[Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
Please include this attribution and a link to
[fuelpricetoday.co.uk/data](https://fuelpricetoday.co.uk/data):

> Contains public sector information licensed under the Open Government Licence v3.0. Data via fuelpricetoday.co.uk.

The sync script in this repository is under the MIT licence.

A dated snapshot of the files as of 23 October 2026 is archived on Zenodo
with a DOI, for citations that need a fixed version:
[10.5281/zenodo.23588864](https://doi.org/10.5281/zenodo.23588864).

## Updates

`sync.mjs` mirrors the site every week through GitHub Actions and regenerates
this README, `datapackage.json` and the Kaggle metadata from the site's
manifest. To refresh locally: `node sync.mjs` (Node 20 or later, no
dependencies).

Questions or a figure for a specific area: contact@fuelpricetoday.co.uk.
