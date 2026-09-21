import { useEffect, useMemo, useState } from 'react';

const DEFAULT_READER_PREFERENCES = {
  fontSize: 18,
  textAlign: 'left',
  textColor: '#1e293b'
};

const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#fef08a', label: 'Yellow' },
  { id: 'green', hex: '#bbf7d0', label: 'Green' },
  { id: 'blue', hex: '#bfdbfe', label: 'Blue' },
  { id: 'pink', hex: '#fbcfe8', label: 'Pink' },
  { id: 'red', hex: '#f87171', label: 'Red' },
];

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

const formatWebToNivText = (text) => {
  if (!text) return '';
  return text
    .replace(/\bYahweh’s\b/g, "the LORD’s")
    .replace(/\bYahweh's\b/g, "the LORD's")
    .replace(/\bYahweh\b/g, "LORD")
    .replace(/\bYah\b/g, "LORD")
    .replace(/\bYeshua\b/gi, "Jesus");
};

const EBible = ({ userId }) => {
  const currentUserId = userId || 'guest';

  const [view, setView] = useState('toc'); 
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [version] = useState('web');
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [readerMenuOpen, setReaderMenuOpen] = useState(false);

  const preferenceKey = `ebiblePreferences:${currentUserId}`;
  const notesKey = `ebibleChapterNotes:${currentUserId}`;
  const highlightsKey = `ebibleHighlights:${currentUserId}`;

  const [readerPreferences, setReaderPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      return saved ? { ...DEFAULT_READER_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_READER_PREFERENCES;
    } catch {
      return DEFAULT_READER_PREFERENCES;
    }
  });

  const [chapterNotes, setChapterNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(notesKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [highlights, setHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem(highlightsKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentNoteText, setCurrentNoteText] = useState('');
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a');

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

  const versions = [{ id: 'web', label: 'New International Version' }];
  const versionLabel = versions.find(v => v.id === version)?.label || 'New International Version';

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

  useEffect(() => {
    localStorage.setItem(notesKey, JSON.stringify(chapterNotes));
  }, [notesKey, chapterNotes]);

  useEffect(() => {
    localStorage.setItem(highlightsKey, JSON.stringify(highlights));
  }, [highlightsKey, highlights]);

  useEffect(() => {
    if (selectedBook && selectedChapter) {
      const chapterKey = `${selectedBook}:${selectedChapter}`;
      setCurrentNoteText(chapterNotes[chapterKey] || '');
    }
  }, [selectedBook, selectedChapter, chapterNotes]);

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

      const adaptedVerses = (data.verses || []).map(v => ({
        ...v,
        text: formatWebToNivText(v.text)
      }));

      setContent({ ...data, verses: adaptedVerses });
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

  const handleChapterSelect = (book, chapter) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    fetchScripture(book, chapter);
  };

  const handleNextChapter = () => {
    if (!selectedBook || !selectedChapter || selectedChapter >= bookData[selectedBook]) return;
    handleChapterSelect(selectedBook, Number(selectedChapter) + 1);
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
    handleChapterSelect(selectedBook, Number(chapter));
    setReaderMenuOpen(false);
  };

  const resetToTOC = () => {
    setView('toc');
    setSelectedBook('');
    setSelectedChapter('');
    setContent(null);
  };

  const toggleHighlight = (verseNum) => {
    if (!selectedBook || !selectedChapter) return;
    const verseKey = `${selectedBook}:${selectedChapter}:${verseNum}`;

    setHighlights(prev => {
      const copy = { ...prev };
      if (copy[verseKey]) {
        delete copy[verseKey];
      } else {
        copy[verseKey] = activeHighlightColor;
      }
      return copy;
    });
  };

  const handleSaveNote = () => {
    if (!selectedBook || !selectedChapter) return;
    const chapterKey = `${selectedBook}:${selectedChapter}`;
    setChapterNotes(prev => ({
      ...prev,
      [chapterKey]: currentNoteText.trim()
    }));
  };

  const getNotesForBook = (bookName) => {
    const results = [];
    Object.keys(chapterNotes).forEach(key => {
      const [b, c] = key.split(':');
      if (b === bookName && chapterNotes[key]) {
        results.push({ chapter: c, note: chapterNotes[key] });
      }
    });
    return results.sort((a, b) => Number(a.chapter) - Number(b.chapter));
  };

  const allSavedNotes = useMemo(() => {
    const list = [];
    Object.keys(chapterNotes).forEach(key => {
      if (chapterNotes[key]) {
        const [book, chapter] = key.split(':');
        list.push({ book, chapter, note: chapterNotes[key] });
      }
    });
    return list;
  }, [chapterNotes]);

  const allSavedHighlights = useMemo(() => {
    const list = [];
    Object.keys(highlights).forEach(key => {
      const [book, chapter, verse] = key.split(':');
      list.push({ book, chapter, verse, color: highlights[key] });
    });
    return list;
  }, [highlights]);

  const styles = {
    container: { padding: '20px', maxWidth: '1120px', margin: '0 auto', fontFamily: 'serif' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '20px' },
    bookBtn: { minHeight: '58px', padding: '12px 8px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#fff', color: '#1e293b', textAlign: 'center', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', lineHeight: '1.25' },
    chapterBtn: { padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    header: { borderBottom: '2px solid #053476', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    verse: { marginBottom: '15px', lineHeight: '1.6', fontSize: '18px', padding: '6px', borderRadius: '4px', cursor: 'pointer' },
    verseNum: { fontWeight: 'bold', marginRight: '8px', color: '#64748b', fontSize: '14px' },
    noteSection: { marginTop: '30px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' },
    dashboardBox: { marginTop: '30px', padding: '20px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  };

  if (loading) return <div style={styles.container}>Loading Word...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 className="ebible-title" style={{ margin: 0 }}>eBible</h2>
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
                    {oldTestament.map((book) => {
                      const bookNotes = getNotesForBook(book);
                      return (
                        <div key={book} style={{ display: 'flex', flexDirection: 'column' }}>
                          <button type="button" style={styles.bookBtn} onClick={() => handleBookSelect(book)}>
                            {book} {bookNotes.length > 0 && `📝 (${bookNotes.length})`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="ebible-testament-panel" style={{ marginTop: '20px' }}>
                  <h4>New Testament</h4>
                  <div className="ebible-book-grid" style={styles.grid}>
                    {newTestament.map((book) => {
                      const bookNotes = getNotesForBook(book);
                      return (
                        <div key={book} style={{ display: 'flex', flexDirection: 'column' }}>
                          <button type="button" style={styles.bookBtn} onClick={() => handleBookSelect(book)}>
                            {book} {bookNotes.length > 0 && `📝 (${bookNotes.length})`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div style={styles.dashboardBox}>
                <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  📖 Saved Notes & Highlights
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Saved Notes ({allSavedNotes.length})</h4>
                    {allSavedNotes.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '14px' }}>No chapter notes saved yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {allSavedNotes.map(({ book, chapter, note }) => (
                          <div key={`${book}:${chapter}`} style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <strong>{book} {chapter}:</strong>
                            <p style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#334155' }}>{note}</p>
                            <button
                              style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => handleChapterSelect(book, chapter)}
                            >
                              Go to Chapter →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Highlighted Verses ({allSavedHighlights.length})</h4>
                    {allSavedHighlights.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '14px' }}>No highlighted verses yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {allSavedHighlights.map(({ book, chapter, verse, color }) => (
                          <div key={`${book}:${chapter}:${verse}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: color, border: '1px solid #cbd5e1', display: 'inline-block' }} />
                              <strong style={{ fontSize: '14px' }}>{book} {chapter}:{verse}</strong>
                            </div>
                            <button
                              style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => handleChapterSelect(book, chapter)}
                            >
                              Go to Chapter →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                    onClick={() => handleChapterSelect(selectedBook, n + 1)}
                  >
                    {n + 1}
                  </button>
                ))}
                <button onClick={() => setSelectedBook('')} style={{ ...styles.chapterBtn, background: '#64748b' }}>Back</button>
              </div>

              <div style={{ ...styles.noteSection, marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Personal Notes for {selectedBook}</h4>
                {getNotesForBook(selectedBook).length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No personal notes saved for chapters in {selectedBook} yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getNotesForBook(selectedBook).map(({ chapter, note }) => (
                      <div key={chapter} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        <strong>Chapter {chapter}:</strong> {note}
                        <button 
                          style={{ marginLeft: '12px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handleChapterSelect(selectedBook, chapter)}
                        >
                          Go to Chapter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {view === 'reading' && content && (
        <div className="ebible-reading-shell">
          <h3 style={{ textAlign: 'center', fontSize: '24px', margin: '0 0 4px 0' }}>{content.reference}</h3>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#475569', marginTop: '6px' }}>Translation: {versionLabel}</p>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Highlight Color:</span>
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveHighlightColor(c.hex)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: c.hex,
                  border: activeHighlightColor === c.hex ? '2px solid #0f172a' : '1px solid #cbd5e1',
                  cursor: 'pointer'
                }}
                title={c.label}
              />
            ))}
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>(Click any verse to highlight or remove highlight)</span>
          </div>

          <div className="ebible-verse-scroll" style={{ marginTop: '18px' }}>
            {content.verses.map((v) => {
              const highlightKey = `${selectedBook}:${selectedChapter}:${v.verse}`;
              const highlightedBg = highlights[highlightKey];

              return (
                <p 
                  key={v.verse} 
                  onClick={() => toggleHighlight(v.verse)}
                  style={{ 
                    ...styles.verse, 
                    fontSize: `${readerPreferences.fontSize}px`, 
                    textAlign: readerPreferences.textAlign, 
                    color: readerPreferences.textColor,
                    backgroundColor: highlightedBg || 'transparent'
                  }}
                >
                  <span style={styles.verseNum}>{v.verse}</span>
                  {v.text}
                </p>
              );
            })}
          </div>

          <div style={styles.noteSection}>
            <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Personal Note for {selectedBook} Chapter {selectedChapter}</h4>
            <textarea
              rows={4}
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              placeholder="Write your personal study notes or reflections for this chapter..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'sans-serif', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleSaveNote}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#053476', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Save Note
            </button>
          </div>

          <div className="ebible-reading-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
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