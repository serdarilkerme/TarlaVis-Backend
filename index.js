// dotenv kaldırıldı - Railway env vars kullanılıyor
const express = require('express');
const cors = require('cors');
const { sehirFiyatCek, skorRenk } = require('./scraper');
const { bölgeAnaliz } = require('./analiz');
const { analizHakkiKontrol, kalanHak, premiumKontrol } = require('./limit');
const ilcelerData = require('./veri/ilceler.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mesaj: 'TarlaVis Backend çalışıyor!' });
});

app.get('/analiz/:ilId', async (req, res) => {
  const { ilId } = req.params;
  const kullaniciId = req.query.uid || 'anonim';

  const premium = await premiumKontrol(kullaniciId);

  if (!premium) {
    const hakVar = await analizHakkiKontrol(kullaniciId);
    if (!hakVar) {
      return res.status(429).json({
        hata: true,
        mesaj: 'Günlük analiz limitine ulaştınız. Premium\'a geçerek sınırsız analiz yapabilirsiniz.',
        kalanHak: 0
      });
    }
  }

  const veri = ilcelerData[ilId]
    ? { sehir: ilcelerData[ilId].il, ...ilcelerData[ilId] }
    : sehirFiyatCek(ilId);

  const analiz = await bölgeAnaliz(veri);
  const kalan = premium ? 999 : await kalanHak(kullaniciId);

  res.json({ sehir: veri.sehir || ilId, analiz, kalanHak: kalan, premium, gelisimSkoru: veri.gelisimSkoru || null });
});

app.get('/analiz/:ilId/:ilceId', async (req, res) => {
  const { ilId, ilceId } = req.params;
  const kullaniciId = req.query.uid || 'anonim';

  const premium = await premiumKontrol(kullaniciId);

  if (!premium) {
    const hakVar = await analizHakkiKontrol(kullaniciId);
    if (!hakVar) {
      return res.status(429).json({
        hata: true,
        mesaj: 'Günlük analiz limitine ulaştınız. Premium\'a geçerek sınırsız analiz yapabilirsiniz.',
        kalanHak: 0
      });
    }
  }

  const il = ilcelerData[ilId];
  const ilce = il?.ilceler.find(i => i.id === ilceId);
  const veri = ilce
    ? { sehir: `${il.il} - ${ilce.isim}`, ...ilce }
    : sehirFiyatCek(ilId);

  const analiz = await bölgeAnaliz(veri);
  const kalan = premium ? 999 : await kalanHak(kullaniciId);

  res.json({ sehir: veri.sehir || ilId, analiz, kalanHak: kalan, premium, gelisimSkoru: veri.gelisimSkoru || null });
});

app.get('/fiyatlar/:sehir', (req, res) => {
  res.json(sehirFiyatCek(req.params.sehir));
});

app.get('/sehirler', (req, res) => {
  res.json(Object.keys(ilcelerData).map(id => ({
    id, isim: ilcelerData[id].il, bolge: ilcelerData[id].bolge,
    koordinat: ilcelerData[id].koordinat, gelisimSkoru: ilcelerData[id].gelisimSkoru,
    renk: skorRenk(ilcelerData[id].gelisimSkoru), nufus: ilcelerData[id].nufus
  })));
});

app.get('/iller', (req, res) => {
  res.json(Object.keys(ilcelerData).map(id => {
    const il = ilcelerData[id];
    return {
      id,
      isim: il.il,
      bolge: il.bolge,
      koordinat: il.koordinat,
      gelisimSkoru: il.gelisimSkoru,
      nufus: il.nufus,
      ilceSayisi: il.ilceler.length,
      // TurkiyeAPI'den gelen yeni alanlar (geriye dönük uyumlu)
      plakaKodu: il.plakaKodu || null,
      alan: il.alan || null,
      kiyiIli: il.kiyiIli || false,
      buyuksehir: il.buyuksehir || false,
    };
  }));
});

app.get('/ilceler/:ilId', (req, res) => {
  const il = ilcelerData[req.params.ilId];
  if (!il) return res.status(404).json({ hata: 'İl bulunamadı' });
  res.json(il);
});

app.get('/ilceler/:ilId/:ilceId', (req, res) => {
  const il = ilcelerData[req.params.ilId];
  if (!il) return res.status(404).json({ hata: 'İl bulunamadı' });
  const ilce = il.ilceler.find(i => i.id === req.params.ilceId);
  if (!ilce) return res.status(404).json({ hata: 'İlçe bulunamadı' });
  res.json({ il: il.il, ...ilce });
});
app.get('/kullanici/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const premium = await premiumKontrol(uid);
    const kalan = premium ? 999 : await kalanHak(uid);
    res.json({ uid, premium, kalanHak: kalan });
  } catch (e) {
    res.json({ uid, premium: false, kalanHak: 3 });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TarlaVis Backend ${PORT} portunda çalışıyor`);
});