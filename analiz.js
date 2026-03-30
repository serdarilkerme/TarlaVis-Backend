require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function bölgeAnaliz(veri) {
  const prompt = `
Sen bir gayrimenkul ve arsa yatırım uzmanısın. Aşağıdaki TÜİK 2024 verilerine göre bu bölge için kısa ve net bir yatırım analizi yap:

Bölge: ${veri.sehir || veri.isim || 'Bilinmiyor'}
Nüfus: ${veri.nufus?.toLocaleString('tr-TR') || 'Bilinmiyor'}
Yıllık Nüfus Artış Hızı: ${veri.artisHizi > 0 ? '+' : ''}${veri.artisHizi}‰ (binde)
Gelişim Skoru: ${veri.gelisimSkoru}/100

Lütfen şunları belirt:
1. Bu bölge arsa/tarla yatırımı için uygun mu?
2. Nüfus artış hızına göre 5 yıllık potansiyel
3. Riskler neler?
4. Net tavsiye

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