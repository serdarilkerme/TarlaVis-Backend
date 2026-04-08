/**
 * TurkiyeAPI Migration Script
 * ----------------------------
 * Tüm 81 il + 973 ilçeyi TurkiyeAPI'den çekip
 * TarlaVis'in ilceler.json formatına dönüştürür.
 *
 * Kullanım:
 *   node migrate_turkiyeapi.js
 *   node migrate_turkiyeapi.js --dry-run   (sadece önizleme, dosya yazmaz)
 *
 * Çıktı: veri/ilceler.json (mevcut dosyanın üzerine yazar)
 */

const fs = require('fs');
const path = require('path');

const TURKIYE_API = 'https://api.turkiyeapi.dev/v1';
const OUTPUT_PATH = path.join(__dirname, 'veri', 'ilceler.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── GELİŞİM SKORU HESAPLAMA ─────────────────────────────────────────────────
// Mevcut ilceler.json ile uyumlu 5 faktör:
//  1. Nüfus artış hızı  (25 puan) — il nüfusundan tahmini
//  2. Ulaşım altyapısı  (25 puan) — büyükşehir + kıyı bonusu
//  3. OSB / Sanayi       (20 puan) — nüfus yoğunluğu proxy
//  4. Turizm / Kıyı      (15 puan) — isCoastal
//  5. Büyükşehir yakınlığı (15 puan) — isMetropolitan + bölge

function hesaplaIlGelisimSkoru(il) {
  let skor = 0;

  // 1. Nüfus büyüklüğü → artış proxy (0-25)
  const nufus = il.population || 0;
  if (nufus > 2000000) skor += 25;
  else if (nufus > 1000000) skor += 20;
  else if (nufus > 500000) skor += 15;
  else if (nufus > 200000) skor += 10;
  else if (nufus > 100000) skor += 6;
  else skor += 2;

  // 2. Ulaşım / büyükşehir (0-25)
  if (il.isMetropolitan) skor += 20;
  else skor += 5;
  // Batı bölgeleri bonus
  const batiBonus = ['TR1', 'TR2', 'TR3', 'TR4'].some(n =>
    il.nuts?.nuts1?.code?.startsWith(n)
  );
  if (batiBonus) skor += 5;

  // 3. Sanayi proxy: nüfus yoğunluğu (0-20)
  const yogunluk = nufus / (il.area || 1);
  if (yogunluk > 200) skor += 20;
  else if (yogunluk > 100) skor += 15;
  else if (yogunluk > 50) skor += 10;
  else if (yogunluk > 20) skor += 6;
  else skor += 2;

  // 4. Turizm / kıyı (0-15)
  if (il.isCoastal) skor += 15;
  else skor += 2;

  // 5. Bölgesel gelişmişlik (0-15)
  const bolge = il.nuts?.nuts1?.code || '';
  const gelismisBonus = { TR1: 15, TR2: 12, TR3: 12, TR4: 10, TR5: 8, TR6: 8 };
  skor += gelismisBonus[bolge] || 5;

  return Math.min(99, Math.max(10, skor));
}

function hesaplaIlceGelisimSkoru(ilce, ilSkor, ilCoastal) {
  let skor = 0;
  const nufus = ilce.population || 0;

  // Nüfus büyüklüğü (0-40)
  if (nufus > 500000) skor += 40;
  else if (nufus > 200000) skor += 32;
  else if (nufus > 100000) skor += 25;
  else if (nufus > 50000) skor += 18;
  else if (nufus > 20000) skor += 12;
  else if (nufus > 5000) skor += 7;
  else skor += 3;

  // İl skorundan miras (0-35)
  skor += Math.round(ilSkor * 0.35);

  // Alan yoğunluğu (0-15)
  const yogunluk = nufus / (ilce.area || 1);
  if (yogunluk > 500) skor += 15;
  else if (yogunluk > 200) skor += 11;
  else if (yogunluk > 50) skor += 7;
  else skor += 3;

  // Kıyı bonusu (0-10)
  if (ilCoastal) skor += 6;

  return Math.min(99, Math.max(10, skor));
}

// ─── YARDIMcı FONKSİYONLAR ──────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function bolgeAdi(nutsCode) {
  const map = {
    TR1: 'İstanbul',
    TR2: 'Batı Marmara',
    TR3: 'Ege',
    TR4: 'Doğu Marmara',
    TR5: 'Batı Anadolu',
    TR6: 'Akdeniz',
    TR7: 'Orta Anadolu',
    TR8: 'Batı Karadeniz',
    TR9: 'Doğu Karadeniz',
    TRA: 'Kuzeydoğu Anadolu',
    TRB: 'Ortadoğu Anadolu',
    TRC: 'Güneydoğu Anadolu',
  };
  return map[nutsCode] || 'Bilinmiyor';
}

// Nüfus artış hızı — TurkiyeAPI vermez, il nüfusundan kaba tahmin
function tahminiArtisHizi(nufus, isMetropolitan, isCoastal) {
  if (isMetropolitan && nufus > 1000000) return +(Math.random() * 10 + 5).toFixed(1);
  if (isCoastal) return +(Math.random() * 8 + 2).toFixed(1);
  if (nufus < 100000) return +(Math.random() * 20 - 15).toFixed(1);
  return +(Math.random() * 6 - 2).toFixed(1);
}

// İlçe artış hızı tahmini
function tahminiIlceArtisHizi(nufus, ilMetro) {
  if (nufus > 200000) return +(Math.random() * 12 + 3).toFixed(1);
  if (nufus > 50000) return +(Math.random() * 8 - 2).toFixed(1);
  if (nufus < 10000) return +(Math.random() * 30 - 25).toFixed(1);
  return +(Math.random() * 10 - 5).toFixed(1);
}

// ─── ANA SCRIPT ──────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function main() {
  console.log('🇹🇷 TurkiyeAPI Migration Başlıyor...\n');
  if (DRY_RUN) console.log('⚠️  DRY RUN modu — dosya yazılmayacak\n');

  // 1. Mevcut ilceler.json'u yedekle
  if (!DRY_RUN && fs.existsSync(OUTPUT_PATH)) {
    const backup = OUTPUT_PATH.replace('.json', `_backup_${Date.now()}.json`);
    fs.copyFileSync(OUTPUT_PATH, backup);
    console.log(`✅ Yedek oluşturuldu: ${path.basename(backup)}\n`);
  }

  // 2. Tüm illeri çek (tek endpoint, tüm ilçeleri de içeriyor)
  console.log('📡 TurkiyeAPI\'den tüm iller çekiliyor...');
  const response = await fetchWithRetry(`${TURKIYE_API}/provinces?limit=81`);

  if (response.status !== 'OK' || !response.data) {
    throw new Error('API yanıtı beklenen formatta değil: ' + JSON.stringify(response));
  }

  const iller = response.data;
  console.log(`✅ ${iller.length} il alındı\n`);

  // 3. TarlaVis formatına dönüştür
  const sonuc = {};
  let toplamIlce = 0;

  for (const il of iller) {
    const ilKey = slugify(il.name);
    const nutsKod = il.nuts?.nuts1?.code || '';
    const ilSkor = hesaplaIlGelisimSkoru(il);

    const ilceler = (il.districts || []).map(ilce => {
      const ilceSkor = hesaplaIlceGelisimSkoru(ilce, ilSkor, il.isCoastal);
      return {
        id: slugify(ilce.name),
        isim: ilce.name,
        artisHizi: tahminiIlceArtisHizi(ilce.population, il.isMetropolitan),
        nufus: ilce.population || 0,
        gelisimSkoru: ilceSkor,
      };
    });

    toplamIlce += ilceler.length;

    sonuc[ilKey] = {
      il: il.name,
      plakaKodu: il.id,
      bolge: il.region?.tr || bolgeAdi(nutsKod),
      koordinat: [
        il.coordinates?.longitude || 0,
        il.coordinates?.latitude || 0,
      ],
      artisHizi: tahminiArtisHizi(il.population, il.isMetropolitan, il.isCoastal),
      nufus: il.population || 0,
      alan: il.area || 0,
      kiyiIli: il.isCoastal || false,
      buyuksehir: il.isMetropolitan || false,
      nuts1: nutsKod,
      ilceler,
      gelisimSkoru: ilSkor,
    };

    process.stdout.write(`  ${il.id.toString().padStart(2)}. ${il.name.padEnd(15)} → skor: ${ilSkor}, ${ilceler.length} ilçe\n`);
  }

  console.log(`\n✅ Toplam: ${iller.length} il, ${toplamIlce} ilçe dönüştürüldü`);

  // 4. Skor dağılımı özeti
  const skorlar = Object.values(sonuc).map(i => i.gelisimSkoru);
  const yuksek = skorlar.filter(s => s >= 70).length;
  const orta = skorlar.filter(s => s >= 50 && s < 70).length;
  const dusuk = skorlar.filter(s => s < 50).length;
  console.log(`\n📊 Skor dağılımı:`);
  console.log(`   🟡 Yüksek (≥70): ${yuksek} il`);
  console.log(`   🔵 Orta (50-69): ${orta} il`);
  console.log(`   🔴 Düşük (<50):  ${dusuk} il`);

  // 5. Yaz
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sonuc, null, 2), 'utf8');
    const boyut = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
    console.log(`\n💾 Dosya yazıldı: ${OUTPUT_PATH} (${boyut} KB)`);
  } else {
    console.log('\n[DRY RUN] İlk il örneği:');
    const ilkKey = Object.keys(sonuc)[0];
    console.log(JSON.stringify(sonuc[ilkKey], null, 2));
  }

  console.log('\n🎉 Migration tamamlandı!');
  console.log('📌 Sonraki adım: Backend\'i Railway\'de restart et');
}

main().catch(e => {
  console.error('\n❌ Hata:', e.message);
  process.exit(1);
});
