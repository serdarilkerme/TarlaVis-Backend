require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sehirFiyatCek, skorRenk } = require('./scraper');
const { bölgeAnaliz } = require('./analiz');
const { analizHakkiKontrol, kalanHak } = require('./limit');
const ilcelerData = require('./veri/ilceler.json');

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

app.get('/analiz/:ilId/:ilceId?', async (req, res) => {
  const { ilId, ilceId } = req.params;
  const kullaniciId = req.query.uid || 'anonim';

  const hakVar = analizHakkiKontrol(kullaniciId);

  if (!hakVar) {
    return res.status(429).json({
      hata: 'Günlük analiz limitine ulaştınız',
      kalanHak: 0,
      mesaj: 'Premium\'a geçerek sınırsız analiz yapabilirsiniz'
    });
  }

  let veri;
  if (ilceId && ilcelerData[ilId]) {
    const ilce = ilcelerData[ilId].ilceler.find(i => i.id === ilceId);
    veri = ilce ? { sehir: `${ilcelerData[ilId].il} - ${ilce.isim}`, ...ilce } : sehirFiyatCek(ilId);
  } else if (ilcelerData[ilId]) {
    veri = { sehir: ilcelerData[ilId].il, ...ilcelerData[ilId] };
  } else {
    veri = sehirFiyatCek(ilId);
  }

  const analiz = await bölgeAnaliz(veri);

  res.json({
    sehir: veri.sehir || ilId,
    analiz,
    kalanHak: kalanHak(kullaniciId)
  });
});

app.get('/sehirler', (req, res) => {
  const iller = Object.keys(ilcelerData).map(id => ({
    id,
    isim: ilcelerData[id].il,
    bolge: ilcelerData[id].bolge,
    koordinat: ilcelerData[id].koordinat,
    gelisimSkoru: ilcelerData[id].gelisimSkoru,
    renk: skorRenk(ilcelerData[id].gelisimSkoru),
    nufus: ilcelerData[id].nufus
  }));
  res.json(iller);
});

app.get('/iller', (req, res) => {
  const iller = Object.keys(ilcelerData).map(id => ({
    id,
    isim: ilcelerData[id].il,
    bolge: ilcelerData[id].bolge,
    koordinat: ilcelerData[id].koordinat,
    gelisimSkoru: ilcelerData[id].gelisimSkoru,
    nufus: ilcelerData[id].nufus,
    ilceSayisi: ilcelerData[id].ilceler.length
  }));
  res.json(iller);
});

app.get('/ilceler/:ilId', (req, res) => {
  const { ilId } = req.params;
  const il = ilcelerData[ilId];
  if (!il) return res.status(404).json({ hata: 'İl bulunamadı' });
  res.json(il);
});

app.get('/ilceler/:ilId/:ilceId', (req, res) => {
  const { ilId, ilceId } = req.params;
  const il = ilcelerData[ilId];
  if (!il) return res.status(404).json({ hata: 'İl bulunamadı' });
  const ilce = il.ilceler.find(i => i.id === ilceId);
  if (!ilce) return res.status(404).json({ hata: 'İlçe bulunamadı' });
  res.json({ il: il.il, ...ilce });
});

app.listen(PORT, () => {
  console.log(`TarlaVis Backend ${PORT} portunda çalışıyor`);
});