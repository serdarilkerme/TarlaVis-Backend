const Groq = require('groq-sdk');
const axios = require('axios');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function tcmbKonutEndeksi() {
  try {
    const url = 'https://evds2.tcmb.gov.tr/service/evds/' +
      'series=TP.HKFE01&startDate=01-01-2024&endDate=31-12-2024' +
      '&type=json&key=' + (process.env.TCMB_API_KEY || '');
    const res = await axios.get(url, { timeout: 5000 });
    const items = res.data?.items;
    if (items && items.length > 0) {
      const son = items[items.length - 1];
      return parseFloat(son['TP_HKFE01']) || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function iklimVerisi(koordinat) {
  try {
    const [lon, lat] = koordinat;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,sunshine_duration&timezone=Europe/Istanbul&forecast_days=7`;
    const res = await axios.get(url, { timeout: 5000 });
    const daily = res.data?.daily;
    if (!daily) return null;
    const ortSicaklik = daily.temperature_2m_max.reduce((a, b) => a + b, 0) / daily.temperature_2m_max.length;
    const toplamYagis = daily.precipitation_sum.reduce((a, b) => a + b, 0);
    const ortGunes = daily.sunshine_duration.reduce((a, b) => a + b, 0) / daily.sunshine_duration.length / 3600;
    return {
      ortSicaklik: ortSicaklik.toFixed(1),
      toplamYagis: toplamYagis.toFixed(1),
      ortGunes: ortGunes.toFixed(1)
    };
  } catch (e) {
    console.error('İklim hatası:', e.message);
    return null;
  }
}

async function depremRiski(koordinat) {
  try {
    const [lon, lat] = koordinat;
    const bitis = new Date().toISOString();
    const baslangic = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const url = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${baslangic}&end=${bitis}&minmag=3&minlat=${lat - 1.5}&maxlat=${lat + 1.5}&minlon=${lon - 1.5}&maxlon=${lon + 1.5}&limit=100&orderby=timedesc`;
    const res = await axios.get(url, { timeout: 8000 });
    const depremler = res.data;
    if (!Array.isArray(depremler)) return null;
    const buyuk = depremler.filter(d => parseFloat(d.magnitude) >= 5).length;
    const orta = depremler.filter(d => parseFloat(d.magnitude) >= 4).length;
    return { toplamDeprem: depremler.length, buyukDeprem: buyuk, ortaDeprem: orta };
  } catch (e) {
    console.error('Deprem hatası:', e.message);
    return null;
  }
}

async function bölgeAnaliz(veri) {
  const konutEndeksi = await tcmbKonutEndeksi();
  const endeksYazi = konutEndeksi
    ? `Türkiye Konut Fiyat Endeksi (2024 ort.): ${konutEndeksi.toFixed(1)}`
    : '';

  const iklim = veri.koordinat ? await iklimVerisi(veri.koordinat) : null;
  const iklimYazi = iklim
    ? `Haftalık hava: Ort. ${iklim.ortSicaklik}°C, Yağış ${iklim.toplamYagis}mm, Güneş ${iklim.ortGunes}sa/gün`
    : '';

  const deprem = veri.koordinat ? await depremRiski(veri.koordinat) : null;
  const depremYazi = deprem
    ? `Son 1 yıl deprem (bölge 150km): ${deprem.toplamDeprem} adet (M≥4: ${deprem.ortaDeprem}, M≥5: ${deprem.buyukDeprem})`
    : '';

  const prompt = `
Sen bir gayrimenkul ve arsa yatırım uzmanısın. Aşağıdaki çok boyutlu analiz verilerine göre bu bölge için net bir yatırım değerlendirmesi yap:

Bölge: ${veri.sehir || veri.isim || 'Bilinmiyor'}
Nüfus: ${veri.nufus?.toLocaleString('tr-TR') || 'Bilinmiyor'}
Yıllık Nüfus Artış Hızı: ${veri.artisHizi > 0 ? '+' : ''}${veri.artisHizi}‰
Gelişim Skoru: ${veri.gelisimSkoru}/100

Gelişim skoru şu 5 faktörden hesaplandı:
- Nüfus artış hızı (TÜİK 2024)
- Ulaşım altyapısı (otoyol, hızlı tren, havalimanı)
- Sanayi/OSB yakınlığı
- Turizm ve kıyı potansiyeli
- Büyükşehir yakınlığı
${endeksYazi}
${iklimYazi}
${depremYazi}

Lütfen şunları belirt:
1. Genel yatırım uygunluğu (Evet/Hayır/Şartlı)
2. En güçlü yatırım gerekçesi
3. Başlıca risk faktörü
4. 5 yıllık değer artış tahmini (%)
5. Net tavsiye

Türkçe, kısa ve net yaz. Maksimum 150 kelime.
  `;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
  });

  return response.choices[0].message.content;
}

module.exports = { bölgeAnaliz };