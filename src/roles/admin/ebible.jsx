import { useEffect, useState } from 'react';

const DEFAULT_READER_PREFERENCES = {
  fontSize: 18,
  textAlign: 'left',
  textColor: '#1e293b'
};

const READER_COLOR_OPTIONS = [
  { value: '#1e293b', label: 'Ink' },
  { value: '#334155', label: 'Slate' },
  { value: '#475569', label: 'Graphite' },
  { value: '#1f2937', label: 'Charcoal' },
  { value: '#1d4ed8', label: 'Readable blue' },
  { value: '#166534', label: 'Readable green' },
  { value: '#7c2d12', label: 'Readable brown' },
  { value: '#86198f', label: 'Readable plum' }
];

const EBible = ({ userId }) => {
  const [view, setView] = useState('toc'); 
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [version] = useState('web');
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [readerMenuOpen, setReaderMenuOpen] = useState(false);
  const preferenceKey = `ebiblePreferences:${userId || 'guest'}`;
  const [readerPreferences, setReaderPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(`ebiblePreferences:${userId || 'guest'}`);
      return saved ? { ...DEFAULT_READER_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_READER_PREFERENCES;
    } catch {
      return DEFAULT_READER_PREFERENCES;
    }
  });

  const bookData = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
    "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150,
    "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66,
    "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14,
    "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3,
    "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
    "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28, "Romans": 16,
    "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6,
    "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3,
    "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13,
    "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1,
    "3 John": 1, "Jude": 1, "Revelation": 22
  };

  const versions = [
    { id: 'web', label: 'New International Version (NIV)' }
  ];

  const versionLabel = versions.find(v => v.id === version)?.label || 'New International Version (NIV)';

  const oldTestament = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
  ];

  const newTestament = [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
    'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
  ];

  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify(readerPreferences));
  }, [preferenceKey, readerPreferences]);

  const updateReaderPreference = (field, value) => {
    setReaderPreferences(previous => ({ ...previous, [field]: value }));
  };

  const isPresetTextColor = READER_COLOR_OPTIONS.some(option => option.value === readerPreferences.textColor);
  const handleCustomHexChange = (value) => {
    if (/^#[0-9a-f]{0,6}$/i.test(value)) updateReaderPreference('textColor', value);
  };

  const fetchScripture = async (book, chapter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://bible-api.com/${book}+${chapter}?translation=${version}`);
      if (!response.ok) throw new Error("Could not find this chapter.");
      const data = await response.json();
      setContent(data);
      setView('reading');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
  };

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    fetchScripture(selectedBook, chapter);
  };

  const handleNextChapter = () => {
    if (!selectedBook || !selectedChapter || selectedChapter >= bookData[selectedBook]) return;
    handleChapterSelect(Number(selectedChapter) + 1);
  };

  const handleReaderBookChange = (book) => {
    setSelectedBook(book);
    setSelectedChapter('');
    setContent(null);
    setView('toc');
    setReaderMenuOpen(false);
  };

  const handleReaderChapterChange = (chapter) => {
    if (!chapter || !selectedBook) return;
    handleChapterSelect(Number(chapter));
    setReaderMenuOpen(false);
  };

  const resetToTOC = () => {
    setView('toc');
    setSelectedBook('');
    setSelectedChapter('');
    setContent(null);
  };

  const styles = {
    container: { padding: '20px', maxWidth: '1120px', margin: '0 auto', fontFamily: 'serif' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '20px' },
    bookBtn: { minHeight: '58px', padding: '12px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#fff', color: '#1e293b', textAlign: 'center', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', lineHeight: '1.25' },
    chapterBtn: { padding: '10px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    header: { borderBottom: '2px solid #053476', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    verse: { marginBottom: '15px', lineHeight: '1.6', fontSize: '18px' },
    verseNum: { fontWeight: 'bold', marginRight: '8px', color: '#64748b', fontSize: '14px' }
  };

  if (loading) return <div style={styles.container}>Loading Word...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 className="ebible-title" style={{ margin: 0 }}>📖 eBible</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {view === 'reading' && <button onClick={resetToTOC} style={{ padding: '8px 16px', cursor: 'pointer' }}>Back to Books</button>}
          <button type="button" className="ebible-reader-menu-button" onClick={() => setReaderMenuOpen(previous => !previous)} aria-expanded={readerMenuOpen}>
            {readerMenuOpen ? 'Close Reader Menu' : 'Reader Menu'}
          </button>
        </div>
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {readerMenuOpen && <>
        <button type="button" className="ebible-reader-drawer-backdrop" onClick={() => setReaderMenuOpen(false)} aria-label="Close reader menu" />
        <aside className="ebible-reader-drawer" aria-label="Reader menu">
          <div className="ebible-drawer-header"><h3>Reader Menu</h3><button type="button" onClick={() => setReaderMenuOpen(false)} aria-label="Close reader menu">×</button></div>
          <div className="ebible-drawer-section">
            <label>Book<select value={selectedBook} onChange={event => handleReaderBookChange(event.target.value)}><option value="">Select a book</option>{[...oldTestament, ...newTestament].map(book => <option key={book}>{book}</option>)}</select></label>
            <label>Chapter<select value={selectedChapter} disabled={!selectedBook} onChange={event => handleReaderChapterChange(event.target.value)}><option value="">Select a chapter</option>{selectedBook && [...Array(bookData[selectedBook]).keys()].map(number => <option key={number + 1} value={number + 1}>Chapter {number + 1}</option>)}</select></label>
          </div>
          <div className="ebible-drawer-section">
            <h4>Reader Settings</h4>
            <label>Text size<input type="range" min="14" max="30" step="1" value={readerPreferences.fontSize} onChange={event => updateReaderPreference('fontSize', Number(event.target.value))} /></label>
            <label>Alignment<select value={readerPreferences.textAlign} onChange={event => updateReaderPreference('textAlign', event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="justify">Justified</option></select></label>
            <label>Text color<select value={isPresetTextColor ? readerPreferences.textColor : 'custom'} onChange={event => updateReaderPreference('textColor', event.target.value === 'custom' ? '#111827' : event.target.value)}>{READER_COLOR_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="custom">Custom</option></select></label>
            {!isPresetTextColor && <div className="ebible-custom-color-controls">
              <label>Hex color<input type="text" value={readerPreferences.textColor} maxLength={7} placeholder="#1e293b" onChange={event => handleCustomHexChange(event.target.value)} /></label>
              <label>Color picker<input type="color" value={/^#[0-9a-f]{6}$/i.test(readerPreferences.textColor) ? readerPreferences.textColor : '#1e293b'} onChange={event => updateReaderPreference('textColor', event.target.value)} /></label>
              <small>Use a six-digit hex color that remains readable on a white background.</small>
            </div>}
            <button type="button" className="ebible-drawer-reset" onClick={() => setReaderPreferences(DEFAULT_READER_PREFERENCES)}>Reset preferences</button>
          </div>
        </aside>
      </>}
      
      {view === 'toc' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600' }}>Bible Version:</span>
            <span style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
              {versionLabel}
            </span>
          </div>

          {!selectedBook ? (
            <>
              <h3>Select a Book</h3>
              <div className="ebible-book-spread">
                <section className="ebible-testament-panel">
                  <h4>Old Testament</h4>
                  <div className="ebible-book-grid" style={styles.grid}>
                    {oldTestament.map((book) => (
                      <button type="button" key={book} style={styles.bookBtn} onClick={() => handleBookSelect(book)}>
                        {book}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="ebible-testament-panel">
                  <h4>New Testament</h4>
                  <div className="ebible-book-grid" style={styles.grid}>
                    {newTestament.map((book) => (
                      <button type="button" key={book} style={styles.bookBtn} onClick={() => handleBookSelect(book)}>
                        {book}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              <h3>{selectedBook}: Select Chapter</h3>
              <div style={{ ...styles.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))' }}>
                {[...Array(bookData[selectedBook]).keys()].map(n => (
                  <button 
                    key={n + 1} 
                    style={styles.chapterBtn}
                    onClick={() => handleChapterSelect(n + 1)}
                  >
                    {n + 1}
                  </button>
                ))}
                <button onClick={() => setSelectedBook('')} style={{ ...styles.chapterBtn, background: '#64748b' }}>Back</button>
              </div>
            </>
          )}
        </div>
      )}
      {view === 'reading' && content && (
        <div className="ebible-reading-shell">
          <h3 style={{ textAlign: 'center', fontSize: '24px' }}>{content.reference}</h3>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#475569', marginTop: '6px' }}>Translation: {versionLabel}</p>
          <div className="ebible-verse-scroll" style={{ marginTop: '18px' }}>
            {content.verses.map((v) => (
              <p key={v.verse} style={{ ...styles.verse, fontSize: `${readerPreferences.fontSize}px`, textAlign: readerPreferences.textAlign, color: readerPreferences.textColor }}>
                <span style={styles.verseNum}>{v.verse}</span>
                {v.text}
              </p>
            ))}
          </div>
          <div className="ebible-reading-actions">
            <button type="button" onClick={handleNextChapter} disabled={selectedChapter >= bookData[selectedBook]} style={styles.chapterBtn}>
              Next Chapter {selectedChapter < bookData[selectedBook] ? `(${Number(selectedChapter) + 1})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EBible;