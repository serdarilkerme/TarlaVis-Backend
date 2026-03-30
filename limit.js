const limitler = {};

function analizHakkiKontrol(kullaniciId) {
  const bugun = new Date().toDateString();
  
  if (!limitler[kullaniciId]) {
    limitler[kullaniciId] = { tarih: bugun, sayi: 0 };
  }

  if (limitler[kullaniciId].tarih !== bugun) {
    limitler[kullaniciId] = { tarih: bugun, sayi: 0 };
  }

  if (limitler[kullaniciId].sayi >= 3) {
    return false;
  }

  limitler[kullaniciId].sayi++;
  return true;
}

function kalanHak(kullaniciId) {
  const bugun = new Date().toDateString();
  if (!limitler[kullaniciId] || limitler[kullaniciId].tarih !== bugun) {
    return 3;
  }
  return Math.max(0, 3 - limitler[kullaniciId].sayi);
}

module.exports = { analizHakkiKontrol, kalanHak };