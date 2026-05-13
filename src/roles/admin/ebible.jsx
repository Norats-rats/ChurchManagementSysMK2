import { useState } from 'react';

const EBible = () => {
  const [view, setView] = useState('toc'); 
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const books = Object.keys(bookData);

  const fetchScripture = async (book, chapter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://bible-api.com/${book}+${chapter}?translation=web`);
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

  const resetToTOC = () => {
    setView('toc');
    setSelectedBook('');
    setSelectedChapter('');
    setContent(null);
  };

  const styles = {
    container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'serif' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '20px' },
    bookBtn: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: '#fff', textAlign: 'center' },
    chapterBtn: { padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    header: { borderBottom: '2px solid #053476', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    verse: { marginBottom: '15px', lineHeight: '1.6', fontSize: '18px' },
    verseNum: { fontWeight: 'bold', marginRight: '8px', color: '#64748b', fontSize: '14px' }
  };

  if (loading) return <div style={styles.container}>Loading Word...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{ color: '#053476', margin: 0 }}>📖 eBible</h2>
        {view === 'reading' && (
          <button onClick={resetToTOC} style={{ padding: '8px 16px', cursor: 'pointer' }}>Back to Books</button>
        )}
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {view === 'toc' && (
        <div>
          {!selectedBook ? (
            <>
              <h3>Select a Book</h3>
              <div style={styles.grid}>
                {books.map(book => (
                  <div key={book} style={styles.bookBtn} onClick={() => handleBookSelect(book)}>
                    {book}
                  </div>
                ))}
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
        <div>
          <h3 style={{ textAlign: 'center', fontSize: '24px' }}>{content.reference}</h3>
          <div style={{ marginTop: '30px' }}>
            {content.verses.map((v) => (
              <p key={v.verse} style={styles.verse}>
                <span style={styles.verseNum}>{v.verse}</span>
                {v.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EBible;