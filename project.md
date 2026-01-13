# 🎵 Müzik Nota Editörü - Proje Dokümantasyonu

## 📋 Genel Bakış

**Müzik Nota Editörü**, kullanıcıların müzik notalarını görsel olarak oluşturabilmelerini ve PDF formatında dışa aktarabilmelerini sağlayan bir web uygulamasıdır. Proje, React + Vite altyapısı üzerine kurulmuştur.

### Proje Amacı
- Özellikle çocuklar için **büyük, renkli notalarla** müzik yazımı
- A4 kağıda yazdırılabilir nota kağıdı oluşturma
- PDF formatında dışa aktarma

---

## 🛠️ Teknoloji Stack

| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool / Dev Server |
| jsPDF | 4.0.0 | PDF Oluşturma |
| html2canvas | 1.4.1 | HTML'i Canvas'a Dönüştürme |
| ESLint | 9.39.1 | Kod Kalitesi |

---

## 📁 Proje Yapısı

```
music-note/
├── .claude/                    # Claude AI ayarları
├── dist/                       # Build çıktısı
├── node_modules/               # Bağımlılıklar
├── public/
│   └── vite.svg               # Vite logosu
├── src/
│   ├── App.css                # Ana stil dosyası (525 satır)
│   ├── App.jsx                # Ana bileşen (1088 satır)
│   ├── index.css              # Global stiller
│   └── main.jsx               # Uygulama giriş noktası
├── index.html                 # HTML şablonu
├── package.json               # Proje yapılandırması
├── vite.config.js             # Vite yapılandırması
├── eslint.config.js           # ESLint yapılandırması
└── README.md                  # Temel bilgiler
```

---

## 🎼 Temel Özellikler

### 1. Nota Sistemi

#### Nota Türleri (`NOTE_TYPES`)
| Türkçe Adı | İngilizce | Vuruş | Beam Sayısı |
|------------|-----------|-------|-------------|
| Tam Nota | whole | 4 | - |
| Yarım Nota | half | 2 | - |
| Dörtlük Nota | quarter | 1 | - |
| Sekizlik Nota | eighth | 0.5 | 1 |
| Onaltılık Nota | sixteenth | 0.25 | 2 |

#### Sus İşaretleri (`REST_TYPES`)
| Tür | Sembol | Vuruş |
|-----|--------|-------|
| Tam Sus | 𝄻 | 4 |
| Yarım Sus | 𝄼 | 2 |
| Dörtlük Sus | 𝄽 | 1 |
| Sekizlik Sus | 𝄾 | 0.5 |
| Onaltılık Sus | 𝄿 | 0.25 |

#### Değiştirici İşaretler (`ACCIDENTALS`)
- Diyez (#)
- Bemol (b)
- Natürel (♮)

### 2. Nota Renkleri
9 farklı renk seçeneği:
- Siyah (#212121)
- Kırmızı (#e53935)
- Yeşil (#43a047)
- Mavi (#1e88e5)
- Sarı (#fdd835)
- Mor (#8e24aa)
- Pembe (#ec407a)
- Turuncu (#ff9800)
- Turkuaz (#00bcd4)

### 3. Nota Pozisyonları
Do6'dan La3'e kadar 17 nota pozisyonu desteklenir:
- **Üst ek çizgiler:** Do6, Si5, La5
- **Porte içi:** Sol5 - Re4
- **Alt ek çizgiler:** Do4, Si3, La3

### 4. Ölçü İşaretleri
Desteklenen zaman işaretleri:
- 4/4, 3/4, 2/4, 6/8

---

## ⚙️ Ayarlar Sistemi

### Varsayılan Ayarlar (`DEFAULT_SETTINGS`)

```javascript
{
  noteSize: 12,        // mm - Nota başı genişliği
  noteHeight: 7,       // mm - Nota başı yüksekliği
  stemLength: 20,      // mm - Sap uzunluğu
  stemWidth: 2,        // px - Sap kalınlığı
  staffHeight: 48,     // mm - Porte yüksekliği
  staffSpacing: 8,     // mm - Porteler arası boşluk
  lineThickness: 2,    // px - Çizgi kalınlığı
  borderWidth: 3       // px - Nota border kalınlığı
}
```

### Ayar Aralıkları
| Ayar | Min | Max | Birim |
|------|-----|-----|-------|
| Nota Genişliği | 8 | 30 | mm |
| Nota Yüksekliği | 4 | ~15 | mm |
| Sap Uzunluğu | 10 | 40 | mm |
| Sap Kalınlığı | 1 | 6 | px |
| Porte Yüksekliği | 30 | 80 | mm |
| Porteler Arası Boşluk | 2 | 20 | mm |
| Çizgi Kalınlığı | 1 | 5 | px |
| Nota Kenar Kalınlığı | 1 | 8 | px |

### Veri Kalıcılığı
- Ayarlar `localStorage`'da saklanır
- Anahtar: `muzik-nota-editoru-ayarlar`

---

## 📄 Sayfa Sistemi

### A4 Boyutları
- Genişlik: 210mm
- Yükseklik: 297mm
- Padding: 8mm (her kenar)

### Dinamik Porte Hesaplama
Sayfa başına porte sayısı dinamik olarak hesaplanır:
- İlk sayfa: Başlık alanı (~20mm) düşülür
- Diğer sayfalar: Tam alan kullanılır
- Her portede 2 ölçü bulunur (`MEASURES_PER_STAFF = 2`)

---

## 🎯 Beam (Bağ) Sistemi

### Beam Gruplaması
Ardışık sekizlik ve onaltılık notalar otomatik olarak gruplanır:
- En az 2 ardışık nota gerekir
- Beam yönü grubun ortalama pozisyonuna göre belirlenir
- Her nota için stem uzunluğu dinamik olarak hesaplanır

### Beam Çizim Mantığı
```javascript
findBeamGroups(elements)      // Grupları bul
calculateBeamInfo(group)      // Beam bilgilerini hesapla
renderBeam(group, info, ...)  // Beam'i çiz
```

---

## 🖥️ Kullanıcı Arayüzü

### Toolbar Bileşenleri
1. **Araç Seçimi:** Nota / Sus İşareti
2. **Nota Türü:** Tam, Yarım, Dörtlük, Sekizlik, Onaltılık
3. **Renk Seçimi:** 9 renk butonu
4. **Değiştirici İşaret:** Yok, Diyez, Bemol, Natürel
5. **Ayarlar Butonu:** Modal açar
6. **PDF İndir:** PDF olarak dışa aktarır
7. **Sayfayı Temizle:** Aktif sayfayı sıfırlar

### Editör Kontrolleri
- **Başlık:** Şarkı adı
- **Besteci:** Söz-Müzik bilgisi
- **Ölçü:** Zaman işareti seçimi

### Hover Önizleme
- Nota eklenecek pozisyonda önizleme gösterilir
- Opacity: 0.4 (yarı saydam)

---

## 📤 PDF Dışa Aktarma

### İşlem Akışı
1. `isExporting` durumu aktif edilir
2. Her sayfa için `html2canvas` ile canvas oluşturulur
3. Canvas, PNG formatında jsPDF'e eklenir
4. PDF dosyası indirilir

### Ayarlar
- Ölçek: 2x (yüksek kalite)
- Arka plan: Beyaz (#ffffff)
- Format: A4 (210x297mm)

---

## 🧩 State Yönetimi

### Ana State'ler

```javascript
const [settings, setSettings]           // Ayarlar objesi
const [showSettings, setShowSettings]   // Ayar modalı görünürlüğü
const [pages, setPages]                 // Sayfa listesi
const [currentPageIndex, setCurrentPageIndex]  // Aktif sayfa
const [selectedColor, setSelectedColor] // Seçili renk
const [selectedNoteType, setSelectedNoteType]  // Seçili nota türü
const [selectedTool, setSelectedTool]   // Aktif araç (note/rest)
const [selectedRestType, setSelectedRestType]  // Seçili sus türü
const [selectedAccidental, setSelectedAccidental]  // Değiştirici
const [timeSignature, setTimeSignature] // Ölçü işareti
const [title, setTitle]                 // Şarkı başlığı
const [composer, setComposer]           // Besteci adı
const [hoverPosition, setHoverPosition] // Hover pozisyonu
const [isExporting, setIsExporting]     // PDF oluşturma durumu
```

### Veri Yapıları

```javascript
// Sayfa yapısı
{
  id: timestamp,
  staffs: [
    {
      id: number,
      elements: [element, ...]
    }
  ]
}

// Element (Nota/Sus) yapısı
{
  id: unique,
  beatIndex: number,       // Hangi beat
  notePosition: number,    // Porte pozisyonu
  noteName: string,        // "Do4", "Re5" vb.
  ledgerLines: [],         // Ek çizgiler
  type: 'note' | 'rest',
  // Nota için:
  noteType: string,
  color: string,
  accidental: string,
  // Sus için:
  restType: string
}
```

---

## 🚀 Çalıştırma Komutları

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Build önizlemesi
npm run preview

# Lint kontrolü
npm run lint
```

---

## 🐛 Bilinen Sınırlamalar

1. **Tek Sol Anahtarı:** Sadece Sol (Treble) anahtarı desteklenir
2. **Sabit Ölçü Sayısı:** Her portede 2 ölçü sabit
3. **Bağlı Notalar:** Legato/tie desteklenmiyor
4. **Dinamik İşaretler:** ff, pp gibi işaretler yok
5. **Tempo İşaretleri:** Desteklenmiyor
6. **Akor Desteği:** Aynı anda çoklu nota yok

---

## 🔮 Geliştirme Önerileri

### Öncelikli İyileştirmeler
1. [ ] Fa anahtarı desteği
2. [ ] Bağlı notalar (tie/legato)
3. [ ] Undo/Redo işlevselliği
4. [ ] Proje kaydetme/yükleme (JSON format)
5. [ ] Ölçü başına dinamik beat sayısı

### Orta Vadeli Geliştirmeler
1. [ ] Dinamik işaretler (ff, pp, crescendo vb.)
2. [ ] Tempo işaretleri
3. [ ] Tekrar işaretleri
4. [ ] Akor desteği
5. [ ] MIDI çalma özelliği

### İleri Düzey Özellikler
1. [ ] MusicXML import/export
2. [ ] Birden fazla enstrüman partisi
3. [ ] Transpose özelliği
4. [ ] Öğretici mod (nota tanıma alıştırmaları)

---

## 📝 Kod Organizasyonu Önerileri

### Mevcut Durum
Tüm kod tek bir `App.jsx` dosyasında (~1088 satır). Bu, büyük bir monolitik yapı.

### Önerilen Yeniden Yapılandırma

```
src/
├── components/
│   ├── Toolbar/
│   │   ├── Toolbar.jsx
│   │   ├── ColorPicker.jsx
│   │   ├── NoteTypeSelector.jsx
│   │   └── Toolbar.css
│   ├── Staff/
│   │   ├── Staff.jsx
│   │   ├── StaffLine.jsx
│   │   ├── NoteCell.jsx
│   │   ├── Beam.jsx
│   │   └── Staff.css
│   ├── Settings/
│   │   ├── SettingsModal.jsx
│   │   └── Settings.css
│   └── Page/
│       ├── Page.jsx
│       ├── PageControls.jsx
│       └── Page.css
├── hooks/
│   ├── useSettings.js
│   ├── usePages.js
│   └── usePDF.js
├── utils/
│   ├── beamCalculations.js
│   ├── staffCalculations.js
│   └── notePositions.js
├── constants/
│   ├── notes.js
│   ├── colors.js
│   └── defaults.js
├── App.jsx
├── App.css
├── index.css
└── main.jsx
```

---

## 🔧 Geliştirici Notları

### CSS Sınıf Yapısı
- `.app-container` - Ana konteyner
- `.toolbar` - Üst araç çubuğu
- `.tool-group` - Araç grubu
- `.editor-area` - Düzenleyici alanı
- `.page-container` - A4 sayfa
- `.staff-system-grid` - Porte sistemi
- `.note-cell` - Nota hücresi
- `.settings-modal` - Ayarlar modalı

### localStorage Kullanımı
```javascript
// Kaydetme
localStorage.setItem('muzik-nota-editoru-ayarlar', JSON.stringify(settings))

// Yükleme
const saved = localStorage.getItem('muzik-nota-editoru-ayarlar')
```

---

## 📚 Kaynaklar

- [Vite Dokümantasyonu](https://vitejs.dev/)
- [React Dokümantasyonu](https://react.dev/)
- [jsPDF Dokümantasyonu](https://rawgit.com/MrRio/jsPDF/master/docs/)
- [html2canvas](https://html2canvas.hertzen.com/)

---

*Son güncelleme: 13 Ocak 2026*
