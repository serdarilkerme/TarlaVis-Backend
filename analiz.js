const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function bölgeAnaliz(veri) {
  const prompt = `
Sen bir gayrimenkul ve arsa yatırım uzmanısın. Aşağıdaki verilere göre bu bölge için kısa ve net bir yatırım analizi yap:

Şehir: ${veri.sehir}
Ortalama m² Fiyatı: ${veri.ortalamaM2} TL
Gelişim Skoru: ${veri.gelisimSkoru}/100
Fiyat Aralığı: ${veri.minFiyat} TL - ${veri.maxFiyat} TL
Trend: ${veri.trend}
İlan Sayısı: ${veri.ilanSayisi}

Lütfen şunları belirt:
1. Bu bölge yatırım için uygun mu?
2. 5 yıllık potansiyel değer artışı tahmini
3. Riskler neler?
4. Tavsiye

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