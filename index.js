require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sehirFiyatCek, skorRenk } = require('./scraper');
const { bölgeAnaliz } = require('./analiz');
const { analizHakkiKontrol, kalanHak } = require('./limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mesaj: 'TarlaVis Backend çalışıyor!' });
});

app.get('/fiyatlar/:sehir', (req, res) => {
  const { sehir } = req.params;
  const fiyatlar = sehirFiyatCek(sehir);
  res.json(fiyatlar);
});

app.get('/analiz/:sehir', async (req, res) => {
  const { sehir } = req.params;
  const kullaniciId = req.query.uid || 'anonim';

  const hakVar = analizHakkiKontrol(kullaniciId);

  if (!hakVar) {
    return res.status(429).json({
      hata: 'Günlük analiz limitine ulaştınız',
      kalanHak: 0,
      mesaj: 'Premium\'a geçerek sınırsız analiz yapabilirsiniz'
    });
  }

  const veri = sehirFiyatCek(sehir);
  const analiz = await bölgeAnaliz(veri);
  
  res.json({ 
    sehir, 
    analiz,
    kalanHak: kalanHak(kullaniciId)
  });
});
app.get('/sehirler', (req, res) => {
  const sehirler = [
    { id: 'istanbul', isim: 'İstanbul', bolge: 'Marmara', koordinat: [28.9784, 41.0082] },
    { id: 'ankara', isim: 'Ankara', bolge: 'İç Anadolu', koordinat: [32.8597, 39.9334] },
    { id: 'izmir', isim: 'İzmir', bolge: 'Ege', koordinat: [27.1428, 38.4237] },
    { id: 'balikesir', isim: 'Balıkesir', bolge: 'Marmara', koordinat: [27.8826, 39.6484] },
    { id: 'bursa', isim: 'Bursa', bolge: 'Marmara', koordinat: [29.0610, 40.1885] },
    { id: 'antalya', isim: 'Antalya', bolge: 'Akdeniz', koordinat: [30.7133, 36.8969] },
    { id: 'konya', isim: 'Konya', bolge: 'İç Anadolu', koordinat: [32.4846, 37.8746] },
    { id: 'trabzon', isim: 'Trabzon', bolge: 'Karadeniz', koordinat: [39.7178, 41.0015] },
    { id: 'adana', isim: 'Adana', bolge: 'Akdeniz', koordinat: [35.3213, 37.0000] },
    { id: 'gaziantep', isim: 'Gaziantep', bolge: 'Güneydoğu', koordinat: [37.3825, 37.0662] },
    { id: 'mersin', isim: 'Mersin', bolge: 'Akdeniz', koordinat: [34.6415, 36.8121] },
    { id: 'kayseri', isim: 'Kayseri', bolge: 'İç Anadolu', koordinat: [35.4826, 38.7312] },
    { id: 'eskisehir', isim: 'Eskişehir', bolge: 'İç Anadolu', koordinat: [30.5206, 39.7767] },
    { id: 'diyarbakir', isim: 'Diyarbakır', bolge: 'Güneydoğu', koordinat: [40.2312, 37.9144] },
    { id: 'samsun', isim: 'Samsun', bolge: 'Karadeniz', koordinat: [36.3313, 41.2867] },
    { id: 'denizli', isim: 'Denizli', bolge: 'Ege', koordinat: [29.0875, 37.7765] },
    { id: 'sanliurfa', isim: 'Şanlıurfa', bolge: 'Güneydoğu', koordinat: [38.7955, 37.1591] },
    { id: 'adapazari', isim: 'Sakarya', bolge: 'Marmara', koordinat: [30.4028, 40.7569] },
    { id: 'tekirdag', isim: 'Tekirdağ', bolge: 'Marmara', koordinat: [27.5153, 40.9781] },
    { id: 'kocaeli', isim: 'Kocaeli', bolge: 'Marmara', koordinat: [29.9187, 40.8533] },
    { id: 'malatya', isim: 'Malatya', bolge: 'Doğu Anadolu', koordinat: [38.3552, 38.3552] },
    { id: 'erzurum', isim: 'Erzurum', bolge: 'Doğu Anadolu', koordinat: [41.2797, 39.9055] },
    { id: 'van', isim: 'Van', bolge: 'Doğu Anadolu', koordinat: [43.3800, 38.4891] },
    { id: 'canakkale', isim: 'Çanakkale', bolge: 'Marmara', koordinat: [26.4142, 40.1553] },
    { id: 'mugla', isim: 'Muğla', bolge: 'Ege', koordinat: [28.3665, 37.2153] },
    { id: 'aydin', isim: 'Aydın', bolge: 'Ege', koordinat: [27.8396, 37.8444] },
    { id: 'manisa', isim: 'Manisa', bolge: 'Ege', koordinat: [27.4289, 38.6191] },
    { id: 'afyon', isim: 'Afyonkarahisar', bolge: 'Ege', koordinat: [30.5387, 38.7507] },
    { id: 'kutahya', isim: 'Kütahya', bolge: 'Ege', koordinat: [29.9833, 39.4167] },
    { id: 'bolu', isim: 'Bolu', bolge: 'Karadeniz', koordinat: [31.6058, 40.7359] },
  ].map(s => {
    const veri = sehirFiyatCek(s.id);
    return { ...s, gelisimSkoru: veri.gelisimSkoru, renk: skorRenk(veri.gelisimSkoru) };
  });
  res.json(sehirler);
});
app.listen(PORT, () => {
  console.log(`TarlaVis Backend ${PORT} portunda çalışıyor`);
});