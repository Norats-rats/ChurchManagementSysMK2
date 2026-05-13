import { useState } from 'react';

const EBible = () => {
  const [view, setView] = useState('toc'); 
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const books = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
  ];

  const fetchScripture = async (book, chapter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://bible-api.com/${book}+${chapter}`);
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
                {[...Array(50).keys()].map(n => (
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

      {/* READING VIEW */}
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