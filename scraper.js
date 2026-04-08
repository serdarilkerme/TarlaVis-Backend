const axios = require('axios');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function ulasimSkoru(lat, lon) {
  const query = `
    [out:json][timeout:10];
    (
      way["highway"~"motorway|trunk"](around:50000,${lat},${lon});
      node["aeroway"="aerodrome"](around:100000,${lat},${lon});
      way["railway"~"rail"](around:30000,${lat},${lon});
    );
    out count;
  `;
  try {
    const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      timeout: 12000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const count = res.data?.elements?.[0]?.tags?.total || 0;
    if (count > 20) return 90;
    if (count > 10) return 70;
    if (count > 3)  return 50;
    return 25;
  } catch (e) {
    return null;
  }
}

async function osbSkoru(lat, lon) {
  const query = `
    [out:json][timeout:10];
    (
      node["landuse"="industrial"](around:30000,${lat},${lon});
      way["landuse"="industrial"](around:30000,${lat},${lon});
    );
    out count;
  `;
  try {
    const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      timeout: 12000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const count = res.data?.elements?.[0]?.tags?.total || 0;
    if (count > 15) return 90;
    if (count > 5)  return 65;
    if (count > 1)  return 40;
    return 20;
  } catch (e) {
    return null;
  }
}

function sehirFiyatCek(sehir) {
  return {
    sehir,
    ortalamaM2: 0,
    minFiyat: 0,
    maxFiyat: 0,
    gelisimSkoru: 50,
    trend: 'bilinmiyor',
    ilanSayisi: 0,
  };
}

function skorRenk(skor) {
  if (skor >= 70) return '#52B788';
  if (skor >= 50) return '#FFB703';
  return '#E63946';
}

module.exports = { sehirFiyatCek, skorRenk, ulasimSkoru, osbSkoru };