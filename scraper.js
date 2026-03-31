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

module.exports = { sehirFiyatCek, skorRenk };