/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const SOURCE_PATH = path.resolve(__dirname, '../data/airports.dat');
const OUTPUT_PATH = path.resolve(__dirname, '../shared/src/data/airports.generated.json');
const METRO_MAP_PATH = path.resolve(__dirname, '../data/airport-metro-map.json');

function normalize(value) {
  return (value || '').trim();
}

function loadMetroMap() {
  if (!fs.existsSync(METRO_MAP_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(METRO_MAP_PATH, 'utf-8'));
}

function buildAirportRecords(rawData, metroMap) {
  const records = [];

  for (const row of rawData) {
    if (!row || row.length < 13) continue;
    const [id, name, city, country, iata, icao, lat, lon, altitude, tzOffset, dst, tz, type, source, region] = row;
    if (!iata || iata === '\\N') continue;

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      continue;
    }

    const record = {
      id: Number(id),
      name: normalize(name),
      city: normalize(city),
      country: normalize(country),
      isoCountry: normalize(country),
      iata: normalize(iata).toUpperCase(),
      icao: icao && icao !== '\\N' ? normalize(icao).toUpperCase() : undefined,
      latitude,
      longitude,
      elevationFt: altitude && altitude !== '\\N' ? Number(altitude) : undefined,
      timezone: tz && tz !== '\\N' ? normalize(tz) : undefined,
      tzOffsetHours: tzOffset && tzOffset !== '\\N' ? Number(tzOffset) : undefined,
      dst: dst && dst !== '\\N' ? normalize(dst) : undefined,
      type: normalize(type) || 'airport',
      source: source && source !== '\\N' ? normalize(source) : undefined,
      region: region && region !== '\\N' ? normalize(region) : undefined,
      metroCode: undefined
    };

    const metroCode = metroMap[record.iata];
    if (metroCode) {
      record.metroCode = metroCode;
    }

    records.push(record);
  }

  return records;
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Unable to find airports.dat at ${SOURCE_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE_PATH, 'utf-8');
  const metroMap = loadMetroMap();
  const parsed = Papa.parse(raw, {
    delimiter: ',',
    quoteChar: '"',
    skipEmptyLines: true
  });

  const airports = buildAirportRecords(parsed.data, metroMap)
    .filter((airport) => airport.iata)
    .sort((a, b) => a.city.localeCompare(b.city) || a.iata.localeCompare(b.iata));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(airports, null, 2));
  console.log(`Generated ${airports.length} airport records -> ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
