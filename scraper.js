function sehirFiyatCek(sehir) {
  const veriler = {
    istanbul: {
      ortalamaM2: 8500,
      minFiyat: 3000,
      maxFiyat: 25000,
      gelisimSkoru: 72,
      trend: 'yukseliyor',
      ilanSayisi: 1243,
    },
    ankara: {
      ortalamaM2: 4200,
      minFiyat: 1500,
      maxFiyat: 12000,
      gelisimSkoru: 65,
      trend: 'yukseliyor',
      ilanSayisi: 876,
    },
    izmir: {
      ortalamaM2: 6800,
      minFiyat: 2500,
      maxFiyat: 18000,
      gelisimSkoru: 78,
      trend: 'yukseliyor',
      ilanSayisi: 654,
    },
    balikesir: {
      ortalamaM2: 2100,
      minFiyat: 800,
      maxFiyat: 6000,
      gelisimSkoru: 81,
      trend: 'hizli_yukseliyor',
      ilanSayisi: 423,
    },
    bursa: {
      ortalamaM2: 3800,
      minFiyat: 1200,
      maxFiyat: 9000,
      gelisimSkoru: 69,
      trend: 'yukseliyor',
      ilanSayisi: 534,
    },
  };

  const veri = veriler[sehir.toLowerCase()] || {
    ortalamaM2: 1500,
    minFiyat: 500,
    maxFiyat: 4000,
    gelisimSkoru: 50,
    trend: 'duragan',
    ilanSayisi: 120,
  };
 

  return { sehir, ...veri };
}
function skorRenk(skor) {
  if (skor >= 75) return '#52B788'; // yeşil - yüksek potansiyel
  if (skor >= 50) return '#FFB703'; // sarı - orta potansiyel
  return '#E63946'; // kırmızı - düşük potansiyel
}

 module.exports = { sehirFiyatCek, skorRenk };