import { useState, useRef, useCallback, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './App.css'

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  noteSize: 12, // mm cinsinden nota başı genişliği
  noteHeight: 7, // mm cinsinden nota başı yüksekliği
  stemLength: 20, // mm cinsinden sap uzunluğu
  stemWidth: 2, // px cinsinden sap kalınlığı
  staffHeight: 48, // mm cinsinden porte yüksekliği
  staffSpacing: 8, // mm cinsinden porteler arası boşluk
  lineThickness: 2, // px cinsinden çizgi kalınlığı
  borderWidth: 3, // px cinsinden nota border kalınlığı
}

// Nota renkleri
const NOTE_COLORS = [
  { name: 'Siyah', value: '#212121' },
  { name: 'Kırmızı', value: '#e53935' },
  { name: 'Yeşil', value: '#43a047' },
  { name: 'Mavi', value: '#1e88e5' },
  { name: 'Sarı', value: '#fdd835' },
  { name: 'Mor', value: '#8e24aa' },
  { name: 'Pembe', value: '#ec407a' },
  { name: 'Turuncu', value: '#ff9800' },
  { name: 'Turkuaz', value: '#00bcd4' },
]

// Nota türleri
const NOTE_TYPES = [
  { name: 'Tam Nota (4 vuruş)', value: 'whole', beats: 4 },
  { name: 'Yarım Nota (2 vuruş)', value: 'half', beats: 2 },
  { name: 'Dörtlük Nota (1 vuruş)', value: 'quarter', beats: 1 },
  { name: 'Sekizlik Nota (1/2 vuruş)', value: 'eighth', beats: 0.5, beamCount: 1 },
  { name: 'Onaltılık Nota (1/4 vuruş)', value: 'sixteenth', beats: 0.25, beamCount: 2 },
]

// Sus işaretleri
const REST_TYPES = [
  { name: 'Tam Sus', value: 'whole-rest', symbol: '𝄻', beats: 4 },
  { name: 'Yarım Sus', value: 'half-rest', symbol: '𝄼', beats: 2 },
  { name: 'Dörtlük Sus', value: 'quarter-rest', symbol: '𝄽', beats: 1 },
  { name: 'Sekizlik Sus', value: 'eighth-rest', symbol: '𝄾', beats: 0.5 },
  { name: 'Onaltılık Sus', value: 'sixteenth-rest', symbol: '𝄿', beats: 0.25 },
]

// Değiştirici işaretler
const ACCIDENTALS = [
  { name: 'Yok', value: 'none', symbol: '' },
  { name: 'Diyez (#)', value: 'sharp', symbol: '#' },
  { name: 'Bemol (b)', value: 'flat', symbol: 'b' },
  { name: 'Natürel', value: 'natural', symbol: '♮' },
]

// Nota pozisyonları - porte çizgilerine göre (0 = orta çizgi Si4)
// Pozitif değerler yukarı, negatif değerler aşağı
const NOTE_POSITIONS = [
  { name: 'Do6', position: -8, ledgerLines: [-6, -8] },
  { name: 'Si5', position: -7, ledgerLines: [-6] },
  { name: 'La5', position: -6, ledgerLines: [-6] },
  { name: 'Sol5', position: -5, ledgerLines: [] },
  { name: 'Fa5', position: -4, ledgerLines: [] },
  { name: 'Mi5', position: -3, ledgerLines: [] },
  { name: 'Re5', position: -2, ledgerLines: [] },
  { name: 'Do5', position: -1, ledgerLines: [] },
  { name: 'Si4', position: 0, ledgerLines: [] },
  { name: 'La4', position: 1, ledgerLines: [] },
  { name: 'Sol4', position: 2, ledgerLines: [] },
  { name: 'Fa4', position: 3, ledgerLines: [] },
  { name: 'Mi4', position: 4, ledgerLines: [] },
  { name: 'Re4', position: 5, ledgerLines: [] },
  { name: 'Do4', position: 6, ledgerLines: [6] },
  { name: 'Si3', position: 7, ledgerLines: [6] },
  { name: 'La3', position: 8, ledgerLines: [6, 8] },
]

// Ölçü işaretleri
const TIME_SIGNATURES = [
  { top: 4, bottom: 4 },
  { top: 3, bottom: 4 },
  { top: 2, bottom: 4 },
  { top: 6, bottom: 8 },
]

// localStorage anahtarı
const STORAGE_KEY = 'muzik-nota-editoru-ayarlar'

// Her portede kaç ölçü var
const MEASURES_PER_STAFF = 2

function App() {
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (e) {
      console.error('Ayarlar yüklenemedi:', e)
    }
    return DEFAULT_SETTINGS
  }

  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [pages, setPages] = useState(() => {
    // Başlangıçta ayarlara göre porte sayısını hesapla
    const initSettings = loadSettings()
    const pageHeight = 297
    const padding = 16
    const headerHeight = 20
    const footerHeight = 8
    const availableHeight = pageHeight - padding - headerHeight - footerHeight
    const staffTotalHeight = initSettings.staffHeight + initSettings.staffSpacing
    const initStaffsPerPage = Math.max(1, Math.floor(availableHeight / staffTotalHeight))
    return [createNewPage(initStaffsPerPage)]
  })
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState('#212121')
  const [selectedNoteType, setSelectedNoteType] = useState('quarter')
  const [selectedTool, setSelectedTool] = useState('note')
  const [selectedRestType, setSelectedRestType] = useState('quarter-rest')
  const [selectedAccidental, setSelectedAccidental] = useState('none')
  const [timeSignature, setTimeSignature] = useState({ top: 4, bottom: 4 })
  const [title, setTitle] = useState('Şarkı Başlığı')
  const [composer, setComposer] = useState('Besteci Adı')
  const [hoverPosition, setHoverPosition] = useState(null)
  const pagesRef = useRef([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Ayarlar kaydedilemedi:', e)
    }
  }, [settings])

  // Dinamik porte sayısıyla yeni sayfa oluştur
  function createNewPage(numStaffs) {
    const staffs = []
    for (let i = 0; i < numStaffs; i++) {
      staffs.push({ id: i + 1, elements: [] })
    }
    return {
      id: Date.now(),
      staffs
    }
  }

  // Sayfa porte sayısını ayarla (eleman kaybetmeden)
  const adjustPageStaffs = (page, targetStaffCount) => {
    const currentStaffs = [...page.staffs]

    if (currentStaffs.length === targetStaffCount) {
      return page
    }

    if (currentStaffs.length < targetStaffCount) {
      // Porte ekle
      for (let i = currentStaffs.length; i < targetStaffCount; i++) {
        currentStaffs.push({ id: i + 1, elements: [] })
      }
    } else {
      // Porte azalt (sondan)
      currentStaffs.length = targetStaffCount
    }

    return { ...page, staffs: currentStaffs }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  // Porte yüksekliğine göre maksimum nota yüksekliğini hesapla
  // Çizgiler arası mesafe = porte yüksekliği * 0.60 / 4
  const getMaxNoteHeight = (staffHeight) => {
    return Math.floor((staffHeight * 0.60) / 4 * 0.95) // %95'i kullan, biraz boşluk bırak
  }

  const maxNoteHeight = getMaxNoteHeight(settings.staffHeight)

  // A4 sayfasına sığacak porte sayısını hesapla
  // A4 = 297mm, padding azaltıldı
  const calculateStaffsPerPage = (isFirstPage = false) => {
    const pageHeight = 297 // A4 yüksekliği mm
    const padding = 16 // üst + alt padding (8mm + 8mm)
    const headerHeight = isFirstPage ? 20 : 0 // başlık alanı (sadece ilk sayfa)
    const footerHeight = 8 // sayfa numarası alanı
    const availableHeight = pageHeight - padding - headerHeight - footerHeight
    const staffTotalHeight = settings.staffHeight + settings.staffSpacing
    return Math.max(1, Math.floor(availableHeight / staffTotalHeight))
  }

  const staffsPerPage = calculateStaffsPerPage(true)
  const staffsPerPageOther = calculateStaffsPerPage(false)

  // Ayarlar değiştiğinde sayfa porte sayılarını güncelle
  useEffect(() => {
    setPages(prevPages => {
      return prevPages.map((page, index) => {
        const targetCount = index === 0 ? staffsPerPage : staffsPerPageOther
        return adjustPageStaffs(page, targetCount)
      })
    })
  }, [staffsPerPage, staffsPerPageOther])

  // Grid pozisyonunu hesapla
  const getGridPosition = (beatIndex, notePosition) => {
    return `${beatIndex}-${notePosition}`
  }

  // Element var mı kontrol et
  const hasElementAt = (staff, beatIndex, notePosition) => {
    return staff.elements.some(el =>
      el.beatIndex === beatIndex && el.notePosition === notePosition
    )
  }

  const handleCellClick = (staffIndex, beatIndex, notePosition) => {
    const currentPage = pages[currentPageIndex]
    const staff = currentPage.staffs[staffIndex]

    // Eğer bu pozisyonda eleman varsa, sil
    const existingElement = staff.elements.find(el =>
      el.beatIndex === beatIndex && el.notePosition === notePosition
    )

    if (existingElement) {
      handleDeleteElement(staffIndex, existingElement.id)
      return
    }

    const noteInfo = NOTE_POSITIONS.find(n => n.position === notePosition)

    const newElement = {
      id: Date.now() + Math.random(),
      beatIndex,
      notePosition,
      noteName: noteInfo?.name || 'Do4',
      ledgerLines: noteInfo?.ledgerLines || [],
    }

    if (selectedTool === 'note') {
      newElement.type = 'note'
      newElement.noteType = selectedNoteType
      newElement.color = selectedColor
      newElement.accidental = selectedAccidental
    } else if (selectedTool === 'rest') {
      newElement.type = 'rest'
      newElement.restType = selectedRestType
    }

    setPages(prevPages => {
      const newPages = [...prevPages]
      const newStaffs = [...newPages[currentPageIndex].staffs]
      newStaffs[staffIndex] = {
        ...newStaffs[staffIndex],
        elements: [...newStaffs[staffIndex].elements, newElement]
      }
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        staffs: newStaffs
      }
      return newPages
    })
  }

  const handleDeleteElement = (staffIndex, elementId) => {
    setPages(prevPages => {
      const newPages = [...prevPages]
      const newStaffs = [...newPages[currentPageIndex].staffs]
      newStaffs[staffIndex] = {
        ...newStaffs[staffIndex],
        elements: newStaffs[staffIndex].elements.filter(el => el.id !== elementId)
      }
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        staffs: newStaffs
      }
      return newPages
    })
  }

  const addNewPage = () => {
    setPages(prev => [...prev, createNewPage(staffsPerPageOther)])
    setCurrentPageIndex(pages.length)
  }

  const deletePage = (index) => {
    if (pages.length === 1) return
    setPages(prev => prev.filter((_, i) => i !== index))
    if (currentPageIndex >= pages.length - 1) {
      setCurrentPageIndex(Math.max(0, currentPageIndex - 1))
    }
  }

  const clearCurrentPage = () => {
    setPages(prevPages => {
      const newPages = [...prevPages]
      const targetCount = currentPageIndex === 0 ? staffsPerPage : staffsPerPageOther
      newPages[currentPageIndex] = createNewPage(targetCount)
      return newPages
    })
  }

  // Beam gruplarını bul - ardışık sekizlik/onaltılık notaları grupla
  const findBeamGroups = (elements) => {
    const beamableTypes = ['eighth', 'sixteenth']
    const groups = []
    let currentGroup = []

    // Notaları beatIndex'e göre sırala
    const sortedElements = elements
      .filter(el => el.type === 'note' && beamableTypes.includes(el.noteType))
      .sort((a, b) => a.beatIndex - b.beatIndex)

    sortedElements.forEach((element, index) => {
      if (currentGroup.length === 0) {
        currentGroup.push(element)
      } else {
        const lastElement = currentGroup[currentGroup.length - 1]
        // Ardışık beat'lerde mi kontrol et
        const isConsecutive = element.beatIndex === lastElement.beatIndex + 1
        if (isConsecutive) {
          currentGroup.push(element)
        } else {
          // Grubu kaydet ve yeni grup başlat
          if (currentGroup.length >= 2) {
            groups.push([...currentGroup])
          }
          currentGroup = [element]
        }
      }
    })

    // Son grubu kontrol et
    if (currentGroup.length >= 2) {
      groups.push(currentGroup)
    }

    return groups
  }

  // Beam bilgisini hesapla - her nota için stem uzunluğu dahil
  const calculateBeamInfo = (group) => {
    if (group.length < 2) return null

    // Stem yönünü belirle (grubun ortalama pozisyonuna göre)
    const avgPosition = group.reduce((sum, n) => sum + n.notePosition, 0) / group.length
    const isStemDown = avgPosition < 0

    const positions = group.map(n => n.notePosition)
    const minPos = Math.min(...positions)
    const maxPos = Math.max(...positions)

    // Stem uzunluğunun yüzde cinsinden değeri
    const stemLengthPercent = (settings.stemLength / settings.staffHeight) * 100

    // Beam Y pozisyonu (% cinsinden)
    let beamYPercent
    if (isStemDown) {
      // Saplar aşağı - beam en alttaki notanın altında
      beamYPercent = 50 + maxPos * 7.5 + stemLengthPercent
    } else {
      // Saplar yukarı - beam en üstteki notanın üstünde
      beamYPercent = 50 + minPos * 7.5 - stemLengthPercent
    }

    // Her nota için stem uzunluğunu hesapla
    const noteInfoMap = new Map()
    group.forEach(note => {
      const noteYPercent = 50 + note.notePosition * 7.5
      const stemLengthMm = isStemDown
        ? (beamYPercent - noteYPercent) / 100 * settings.staffHeight
        : (noteYPercent - beamYPercent) / 100 * settings.staffHeight
      noteInfoMap.set(note.id, {
        isStemDown,
        stemLengthMm: Math.max(stemLengthMm, settings.stemLength * 0.5), // Minimum stem
        beamYPercent
      })
    })

    // Kaç beam çizgisi gerekiyor?
    const beamCount = Math.min(...group.map(n => {
      const noteInfo = NOTE_TYPES.find(t => t.value === n.noteType)
      return noteInfo?.beamCount || 1
    }))

    return {
      isStemDown,
      beamYPercent,
      beamCount,
      noteInfoMap
    }
  }

  // Beam çiz
  const renderBeam = (group, beamInfo, clefAreaPercent, notesAreaPercent, totalBeats, beatsPerMeasure) => {
    if (group.length < 2 || !beamInfo) return null

    const firstNote = group[0]
    const lastNote = group[group.length - 1]

    // Beat hücresinin genişliği (%)
    const cellWidthPercent = notesAreaPercent / totalBeats

    // Nota genişliğinin yüzde olarak değeri (sayfa genişliğine göre)
    // 210mm sayfa genişliği varsayımıyla
    const noteWidthPercent = (settings.noteSize / 210) * 100

    // Beat pozisyonlarını hesapla - hücrenin sol kenarı
    const getXPercent = (beatIndex) => {
      const measureIndex = Math.floor(beatIndex / beatsPerMeasure)
      const beatInMeasure = beatIndex % beatsPerMeasure
      return clefAreaPercent + (measureIndex * (notesAreaPercent / MEASURES_PER_STAFF)) +
             (beatInMeasure * (notesAreaPercent / MEASURES_PER_STAFF / beatsPerMeasure))
    }

    // Stem offset - sapın nota merkezinden ne kadar uzakta olduğu
    // Yukarı saplar sağda (+), aşağı saplar solda (-)
    const stemOffset = beamInfo.isStemDown ? -noteWidthPercent / 2 : noteWidthPercent / 2

    // Beam başlangıç ve bitiş X pozisyonları (hücre ortası + stem offset)
    const startX = getXPercent(firstNote.beatIndex) + cellWidthPercent / 2 + stemOffset
    const endX = getXPercent(lastNote.beatIndex) + cellWidthPercent / 2 + stemOffset
    const beamWidth = endX - startX

    // Beam kalınlığı
    const beamHeight = 3

    return (
      <div className="beam-container" key={`beam-${firstNote.id}`}>
        {Array.from({ length: beamInfo.beamCount }).map((_, beamIndex) => (
          <div
            key={beamIndex}
            className="beam-line"
            style={{
              position: 'absolute',
              left: `${startX}%`,
              width: beamWidth > 0 ? `${beamWidth}%` : '2px',
              top: `${beamInfo.beamYPercent + (beamInfo.isStemDown ? beamIndex * 4 : -beamIndex * 4)}%`,
              height: `${beamHeight}px`,
              background: '#000',
              zIndex: 25,
            }}
          />
        ))}
      </div>
    )
  }

  const exportToPDF = async () => {
    setIsExporting(true)
    setHoverPosition(null)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      for (let i = 0; i < pages.length; i++) {
        const pageElement = pagesRef.current[i]
        if (!pageElement) continue

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })

        const imgData = canvas.toDataURL('image/png')

        if (i > 0) {
          pdf.addPage()
        }

        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
      }

      pdf.save(`${title || 'muzik-notasi'}.pdf`)
    } catch (error) {
      console.error('PDF oluşturma hatası:', error)
      alert('PDF oluşturulurken bir hata oluştu.')
    } finally {
      setIsExporting(false)
    }
  }

  const renderNote = (element, isPreview = false, isBeamed = false, beamInfo = null) => {
    const { noteType, color, accidental, ledgerLines } = element
    const needsStem = noteType !== 'whole'
    const needsFlag = (noteType === 'eighth' || noteType === 'sixteenth') && !isBeamed
    const isHollow = noteType === 'whole' || noteType === 'half'

    // Beam grubunda ise ortalama pozisyona göre, değilse kendi pozisyonuna göre
    const isStemDown = beamInfo ? beamInfo.isStemDown : element.notePosition < 0

    const flagCount = noteType === 'sixteenth' ? 2 : 1

    // Beamed nota için stem uzunluğunu hesapla
    let stemLength = settings.stemLength
    if (isBeamed && beamInfo) {
      // Stem, beam çizgisine kadar uzanmalı
      // beamInfo.beamYMm = beam'in nota merkezinden mm cinsinden mesafesi
      stemLength = beamInfo.stemLengthMm || settings.stemLength
    }

    return (
      <div className={`note-cell-content ${isPreview ? 'preview' : ''}`}>
        {/* Ledger lines */}
        {ledgerLines && ledgerLines.map((line, idx) => (
          <div
            key={idx}
            className="ledger-line-indicator"
            style={{
              top: `${50 + (line - element.notePosition) * 50}%`,
            }}
          />
        ))}

        {accidental && accidental !== 'none' && (
          <span className="note-accidental">
            {ACCIDENTALS.find(a => a.value === accidental)?.symbol}
          </span>
        )}
        <div
          className={`note-head-grid ${noteType}`}
          style={{
            width: `${settings.noteSize}mm`,
            height: `${settings.noteHeight}mm`,
            borderWidth: `${settings.borderWidth}px`,
            borderColor: '#000000',
            backgroundColor: isHollow ? 'transparent' : color,
            borderStyle: 'solid',
          }}
        />
        {needsStem && (
          <div
            className={`note-stem-grid ${isStemDown ? 'down' : ''}`}
            style={{
              width: `${settings.stemWidth}px`,
              height: `${stemLength}mm`,
            }}
          />
        )}
        {needsFlag && (
          <div className={`note-flag-grid ${isStemDown ? 'down' : ''}`}>
            {flagCount === 2 ? '𝅘𝅥𝅯' : '♪'}
          </div>
        )}
      </div>
    )
  }

  const renderRest = (element, isPreview = false) => {
    const { restType } = element
    const restInfo = REST_TYPES.find(r => r.value === restType)

    return (
      <div className={`rest-cell-content ${isPreview ? 'preview' : ''}`}>
        {restInfo?.symbol || '𝄽'}
      </div>
    )
  }

  const renderStaff = (staff, staffIndex, showTimeSignature) => {
    // Her ölçüde timeSignature.top kadar beat pozisyonu
    const beatsPerMeasure = timeSignature.top
    const totalBeats = MEASURES_PER_STAFF * beatsPerMeasure

    // Sol anahtarı ve ölçü işareti için ayrılan alan (yüzde olarak)
    const clefAreaPercent = showTimeSignature ? 12 : 8
    const notesAreaPercent = 100 - clefAreaPercent

    // Beam gruplarını bul ve beam bilgilerini hesapla
    const beamGroups = findBeamGroups(staff.elements)
    const beamInfos = beamGroups.map(group => ({
      group,
      info: calculateBeamInfo(group)
    }))

    // Beam grubunda olan notaların bilgilerini map'e ekle
    const beamedNoteInfoMap = new Map()
    beamInfos.forEach(({ group, info }) => {
      if (info) {
        group.forEach(note => {
          beamedNoteInfoMap.set(note.id, info.noteInfoMap.get(note.id))
        })
      }
    })

    return (
      <div
        key={staff.id}
        className="staff-system-grid"
        style={{
          height: `${settings.staffHeight}mm`,
          marginBottom: `${settings.staffSpacing}mm`,
        }}
      >
        {/* Porte çizgileri - tam genişlik */}
        <div className="staff-lines-grid">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="staff-line-grid"
              style={{
                top: `${20 + i * 15}%`,
                height: `${settings.lineThickness}px`,
              }}
            />
          ))}
        </div>

        {/* Sol anahtarı - porte üzerinde */}
        <div className="clef-overlay" style={{ width: `${clefAreaPercent}%` }}>
          <div className="treble-clef-overlay">𝄞</div>
          {showTimeSignature && (
            <div className="time-signature-overlay">
              <span>{timeSignature.top}</span>
              <span>{timeSignature.bottom}</span>
            </div>
          )}
        </div>

        {/* Ölçü çizgileri */}
        {Array.from({ length: MEASURES_PER_STAFF }).map((_, i) => (
          <div
            key={i}
            className="measure-line-grid"
            style={{
              left: `${clefAreaPercent + (i + 1) * (notesAreaPercent / MEASURES_PER_STAFF)}%`,
              width: `${settings.lineThickness}px`,
            }}
          />
        ))}

        {/* Baş çizgisi */}
        <div
          className="measure-line-grid"
          style={{
            left: `${clefAreaPercent}%`,
            width: `${settings.lineThickness}px`,
          }}
        />

        {/* Beam çizgileri */}
        {beamInfos.map(({ group, info }) => renderBeam(group, info, clefAreaPercent, notesAreaPercent, totalBeats, beatsPerMeasure))}

        {/* Beat pozisyonları - grid hücreleri */}
        <div className="beat-grid" style={{ left: `${clefAreaPercent}%`, width: `${notesAreaPercent}%` }}>
          {Array.from({ length: totalBeats }).map((_, beatIndex) => {
            const measureIndex = Math.floor(beatIndex / beatsPerMeasure)
            const beatInMeasure = beatIndex % beatsPerMeasure

            return (
              <div
                key={beatIndex}
                className="beat-column"
                style={{
                  left: `${(measureIndex * (100 / MEASURES_PER_STAFF)) + (beatInMeasure * (100 / MEASURES_PER_STAFF / beatsPerMeasure))}%`,
                  width: `${100 / totalBeats}%`,
                }}
              >
                {NOTE_POSITIONS.map((notePos) => {
                  const element = staff.elements.find(el =>
                    el.beatIndex === beatIndex && el.notePosition === notePos.position
                  )
                  const isHovered = hoverPosition?.staffIndex === staffIndex &&
                                   hoverPosition?.beatIndex === beatIndex &&
                                   hoverPosition?.notePosition === notePos.position

                  // Bu nota beam grubunda mı?
                  const beamInfo = element && beamedNoteInfoMap.get(element.id)
                  const isBeamed = !!beamInfo

                  return (
                    <div
                      key={notePos.position}
                      className={`note-cell ${element ? 'has-note' : ''} ${isHovered ? 'hovered' : ''}`}
                      style={{
                        top: `${50 + notePos.position * 7.5}%`,
                      }}
                      onMouseEnter={() => !element && setHoverPosition({
                        staffIndex,
                        beatIndex,
                        notePosition: notePos.position
                      })}
                      onMouseLeave={() => setHoverPosition(null)}
                      onClick={() => handleCellClick(staffIndex, beatIndex, notePos.position)}
                    >
                      {element && element.type === 'note' && renderNote(element, false, isBeamed, beamInfo)}
                      {element && element.type === 'rest' && renderRest(element)}

                      {/* Hover önizleme */}
                      {isHovered && !element && selectedTool === 'note' && renderNote({
                        noteType: selectedNoteType,
                        color: selectedColor,
                        accidental: selectedAccidental,
                        notePosition: notePos.position,
                        ledgerLines: notePos.ledgerLines,
                      }, true)}
                      {isHovered && !element && selectedTool === 'rest' && renderRest({
                        restType: selectedRestType,
                      }, true)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderSettingsModal = () => {
    if (!showSettings) return null

    return (
      <div className="settings-overlay" onClick={() => setShowSettings(false)}>
        <div className="settings-modal" onClick={e => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Ayarlar</h2>
            <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
          </div>

          <div className="settings-content">
            <div className="settings-section">
              <h3>Nota Boyutları</h3>

              <div className="setting-item">
                <label>Nota Genişliği: {settings.noteSize}mm</label>
                <input
                  type="range"
                  min="8"
                  max="30"
                  value={settings.noteSize}
                  onChange={(e) => updateSetting('noteSize', Number(e.target.value))}
                />
              </div>

              <div className="setting-item">
                <label>
                  Nota Yüksekliği: {settings.noteHeight}mm
                  {settings.noteHeight > maxNoteHeight && (
                    <span style={{ color: '#f44336', marginLeft: '8px', fontSize: '0.85rem' }}>
                      (Maks: {maxNoteHeight}mm)
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min="4"
                  max={Math.max(maxNoteHeight + 5, 15)}
                  value={settings.noteHeight}
                  onChange={(e) => updateSetting('noteHeight', Number(e.target.value))}
                />
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  Önerilen maks: {maxNoteHeight}mm (porte yüksekliğine göre)
                </div>
              </div>

              <div className="setting-item">
                <label>Nota Kenar Kalınlığı: {settings.borderWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={settings.borderWidth}
                  onChange={(e) => updateSetting('borderWidth', Number(e.target.value))}
                />
              </div>

              <div className="setting-item">
                <label>Sap Uzunluğu: {settings.stemLength}mm</label>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={settings.stemLength}
                  onChange={(e) => updateSetting('stemLength', Number(e.target.value))}
                />
              </div>

              <div className="setting-item">
                <label>Sap Kalınlığı: {settings.stemWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={settings.stemWidth}
                  onChange={(e) => updateSetting('stemWidth', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="settings-section">
              <h3>Porte Ayarları</h3>

              <div className="setting-item">
                <label>Porte Yüksekliği: {settings.staffHeight}mm</label>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={settings.staffHeight}
                  onChange={(e) => {
                    const newStaffHeight = Number(e.target.value)
                    const newMaxNoteHeight = getMaxNoteHeight(newStaffHeight)
                    setSettings(prev => ({
                      ...prev,
                      staffHeight: newStaffHeight,
                      // Nota yüksekliği maksimumu aşıyorsa otomatik ayarla
                      noteHeight: prev.noteHeight > newMaxNoteHeight ? newMaxNoteHeight : prev.noteHeight
                    }))
                  }}
                />
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  Maks nota yüksekliği: {getMaxNoteHeight(settings.staffHeight)}mm |
                  Sayfaya sığan porte: {staffsPerPage} (ilk sayfa), {staffsPerPageOther} (diğer)
                </div>
              </div>

              <div className="setting-item">
                <label>Porteler Arası Boşluk: {settings.staffSpacing}mm</label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={settings.staffSpacing}
                  onChange={(e) => updateSetting('staffSpacing', Number(e.target.value))}
                />
              </div>

              <div className="setting-item">
                <label>Çizgi Kalınlığı: {settings.lineThickness}px</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={settings.lineThickness}
                  onChange={(e) => updateSetting('lineThickness', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button className="toolbar-btn secondary" onClick={resetSettings}>
                Varsayılana Sıfırla
              </button>
              <button className="toolbar-btn primary" onClick={() => setShowSettings(false)}>
                Tamam
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Araç Çubuğu */}
      <div className="toolbar">
        <h1>Nota Editörü</h1>

        <div className="tool-group">
          <label>Araç:</label>
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
          >
            <option value="note">Nota</option>
            <option value="rest">Sus İşareti</option>
          </select>
        </div>

        {selectedTool === 'note' && (
          <>
            <div className="tool-group">
              <label>Nota:</label>
              <select
                value={selectedNoteType}
                onChange={(e) => setSelectedNoteType(e.target.value)}
              >
                {NOTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-group">
              <label>Renk:</label>
              <div className="color-buttons">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value}
                    className={`color-btn ${selectedColor === color.value ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setSelectedColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="tool-group">
              <label>İşaret:</label>
              <select
                value={selectedAccidental}
                onChange={(e) => setSelectedAccidental(e.target.value)}
              >
                {ACCIDENTALS.map(acc => (
                  <option key={acc.value} value={acc.value}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {selectedTool === 'rest' && (
          <div className="tool-group">
            <label>Sus:</label>
            <select
              value={selectedRestType}
              onChange={(e) => setSelectedRestType(e.target.value)}
            >
              {REST_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="toolbar-btn secondary"
          onClick={() => setShowSettings(true)}
        >
          Ayarlar
        </button>

        <button
          className="toolbar-btn primary"
          onClick={exportToPDF}
          disabled={isExporting}
        >
          {isExporting ? 'PDF Oluşturuluyor...' : 'PDF İndir'}
        </button>

        <button
          className="toolbar-btn danger"
          onClick={clearCurrentPage}
        >
          Sayfayı Temizle
        </button>
      </div>

      {/* Kullanım talimatları */}
      <div className="instructions">
        <h3>Kullanım Kılavuzu</h3>
        <ul>
          <li><strong>Nota eklemek için:</strong> Araç olarak "Nota" seçin, porte üzerinde istediğiniz pozisyona gelin (önizleme görünür) ve tıklayın.</li>
          <li><strong>Nota silmek için:</strong> Var olan bir notaya tıklayın.</li>
          <li><strong>Sus işareti için:</strong> Araç olarak "Sus İşareti" seçin ve istediğiniz pozisyona tıklayın.</li>
          <li><strong>Ayarlar:</strong> Nota boyutlarını ve porte ayarlarını "Ayarlar" butonundan değiştirebilirsiniz.</li>
        </ul>
      </div>

      {/* Editör Alanı */}
      <div className="editor-area">
        <div style={{
          maxWidth: '210mm',
          margin: '0 auto 20px auto',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div className="tool-group" style={{ background: '#e3f2fd' }}>
            <label style={{ color: '#333' }}>Başlık:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Şarkı başlığı"
            />
          </div>
          <div className="tool-group" style={{ background: '#e3f2fd' }}>
            <label style={{ color: '#333' }}>Besteci:</label>
            <input
              type="text"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Söz-Müzik"
            />
          </div>
          <div className="tool-group" style={{ background: '#e3f2fd' }}>
            <label style={{ color: '#333' }}>Ölçü:</label>
            <select
              value={`${timeSignature.top}/${timeSignature.bottom}`}
              onChange={(e) => {
                const [top, bottom] = e.target.value.split('/').map(Number)
                setTimeSignature({ top, bottom })
              }}
            >
              {TIME_SIGNATURES.map(ts => (
                <option key={`${ts.top}/${ts.bottom}`} value={`${ts.top}/${ts.bottom}`}>
                  {ts.top}/{ts.bottom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pages.map((page, pageIndex) => (
          <div
            key={page.id}
            ref={el => pagesRef.current[pageIndex] = el}
            className="page-container"
            style={{ display: pageIndex === currentPageIndex ? 'block' : 'none' }}
          >
            {pageIndex === 0 && (
              <div className="page-header">
                <div className="page-title">{title}</div>
                <div className="page-composer">Söz-Müzik: {composer}</div>
              </div>
            )}

            {page.staffs.map((staff, staffIndex) => (
              renderStaff(staff, staffIndex, staffIndex === 0 && pageIndex === 0)
            ))}

            <div style={{
              position: 'absolute',
              bottom: '10mm',
              right: '15mm',
              fontSize: '12pt',
              color: '#666'
            }}>
              Sayfa {pageIndex + 1} / {pages.length}
            </div>
          </div>
        ))}

        <div className="page-controls">
          {pages.map((page, index) => (
            <button
              key={page.id}
              className={`toolbar-btn ${index === currentPageIndex ? 'primary' : 'secondary'}`}
              onClick={() => setCurrentPageIndex(index)}
            >
              Sayfa {index + 1}
            </button>
          ))}
          <button
            className="toolbar-btn secondary"
            onClick={addNewPage}
          >
            + Yeni Sayfa
          </button>
          {pages.length > 1 && (
            <button
              className="toolbar-btn danger"
              onClick={() => deletePage(currentPageIndex)}
            >
              Bu Sayfayı Sil
            </button>
          )}
        </div>
      </div>

      {renderSettingsModal()}
    </div>
  )
}

export default App
