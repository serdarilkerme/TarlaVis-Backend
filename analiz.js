require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function bölgeAnaliz(veri) {
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