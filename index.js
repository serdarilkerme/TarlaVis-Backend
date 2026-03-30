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
  res.json(sehirFiyatCek(sehir));
});

app.get('/analiz/:ilId', async (req, res) => {
  const { ilId } = req.params;
  const kullaniciId = req.query.uid || 'anonim';
  if (!analizHakkiKontrol(kullaniciId)) return res.status(429).json({ hata: 'Günlük analiz limitine ulaştınız', kalanHak: 0, mesaj: 'Premium\'a geçerek sınırsız analiz yapabilirsiniz' });
  const veri = ilcelerData[ilId] ? { sehir: ilcelerData[ilId].il, ...ilcelerData[ilId] } : sehirFiyatCek(ilId);
  const analiz = await bölgeAnaliz(veri);
  res.json({ sehir: veri.sehir || ilId, analiz, kalanHak: kalanHak(kullaniciId) });
});

app.get('/analiz/:ilId/:ilceId', async (req, res) => {
  const { ilId, ilceId } = req.params;
  const kullaniciId = req.query.uid || 'anonim';
  if (!analizHakkiKontrol(kullaniciId)) return res.status(429).json({ hata: 'Günlük analiz limitine ulaştınız', kalanHak: 0, mesaj: 'Premium\'a geçerek sınırsız analiz yapabilirsiniz' });
  const il = ilcelerData[ilId];
  const ilce = il?.ilceler.find(i => i.id === ilceId);
  const veri = ilce ? { sehir: `${il.il} - ${ilce.isim}`, ...ilce } : sehirFiyatCek(ilId);
  const analiz = await bölgeAnaliz(veri);
  res.json({ sehir: veri.sehir || ilId, analiz, kalanHak: kalanHak(kullaniciId) });
});

app.get('/sehirler', (req, res) => {
  res.json(Object.keys(ilcelerData).map(id => ({
    id, isim: ilcelerData[id].il, bolge: ilcelerData[id].bolge,
    koordinat: ilcelerData[id].koordinat, gelisimSkoru: ilcelerData[id].gelisimSkoru,
    renk: skorRenk(ilcelerData[id].gelisimSkoru), nufus: ilcelerData[id].nufus
  })));
});

app.get('/iller', (req, res) => {
  res.json(Object.keys(ilcelerData).map(id => ({
    id, isim: ilcelerData[id].il, bolge: ilcelerData[id].bolge,
    koordinat: ilcelerData[id].koordinat, gelisimSkoru: ilcelerData[id].gelisimSkoru,
    nufus: ilcelerData[id].nufus, ilceSayisi: ilcelerData[id].ilceler.length
  })));
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

app.listen(PORT, () => {
  console.log(`TarlaVis Backend ${PORT} portunda çalışıyor`);
});