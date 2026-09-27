import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const galleryModules = import.meta.glob('../../assets/landingpvents/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default'
});

// Keyed by file name (e.g. 'IMG_2567.JPG'). Add or edit a key to change that
// slide's label; anything not listed falls back to SLIDE_DEFAULT_LABEL.
const SLIDE_LABELS = {
  'IMG_2567.JPG': 'Church Event',
  'IMG_3198.JPG': 'Church Event',
  'IMG_3201.JPG': 'Church Event',
  'IMG_3219.JPG': 'Church Event',
  'IMG_3313.JPG': 'Church Event',
  'IMG_3325.JPG': 'Church Event',
  'IMG_3465.JPG': 'Church Event',
  'IMG_3545.JPG': 'Church Event',
  'IMG_3592.JPG': 'Church Event',
  'IMG_3758.JPG': 'Church Event',
  'IMG_3762.JPG': 'Church Event',
  'IMG_5072.JPG': 'Church Event',
  'IMG_5118.JPG': 'Church Event',
  'IMG_8414.JPG': 'Church Event',
  'IMG_8530.JPG': 'Church Event',
  'IMG_8531.JPG': 'Church Event',
  'IMG_8546.JPG': 'Church Event',
  'IMG_8781.JPG': 'Church Event',
  'IMG_8796.JPG': 'Church Event',
  'IMG_8935.JPG': 'Church Event',
  'IMG_9227.JPG': 'Church Event',
  '825310055_1617566113141805_1993782545261584226_n.jpg': 'Church Event',
  'BG for Log In': 'Church Event',
  Musc: 'Church Event'
};

const SLIDE_DEFAULT_LABEL = 'Church Event';
const SLIDE_INTERVAL = 5000;

const GALLERY_IMAGES = Object.keys(galleryModules)
  .sort()
  .map((key) => {
    const fileName = key.split('/').pop().replace(/\.[^.]+$/, '');
    return {
      src: galleryModules[key],
      label: SLIDE_LABELS[fileName] || SLIDE_DEFAULT_LABEL
    };
  });

const LandingPage = ({ onOpenAuth, eventsData = [], contactInfo = {} }) => {
  const [bgImage, setBgImage] = useState('');
  const [timeGreeting, setTimeGreeting] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  const STOCK_IMAGES = {
    morning: 'https://images.unsplash.com/photo-1548625361-180a373be5c6?auto=format&fit=crop&w=1920&q=80',
    afternoon: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1920&q=80',
    evening: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1920&q=80'
  };

  useEffect(() => {
    const updateTimeBasedTheme = () => {
      const currentHour = new Date().getHours();

      if (currentHour >= 5 && currentHour < 12) {
        setBgImage(STOCK_IMAGES.morning);
        setTimeGreeting('Good Morning & Welcome');
      } else if (currentHour >= 12 && currentHour < 18) {
        setBgImage(STOCK_IMAGES.afternoon);
        setTimeGreeting('Good Afternoon & Welcome');
      } else {
        setBgImage(STOCK_IMAGES.evening);
        setTimeGreeting('Good Evening & Welcome');
      }
    };

    updateTimeBasedTheme();
    const interval = setInterval(updateTimeBasedTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const defaultEvents = [
    { id: 1, title: 'Sunday Worship Service', image: 'https://images.unsplash.com/photo-1510519138161-58441082695c?auto=format&fit=crop&w=600&q=80', date: 'Every Sunday at 9:00 AM' },
    { id: 2, title: 'Community Fellowship', image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80', date: 'Wednesdays at 6:30 PM' },
    { id: 3, title: 'Youth & Family Gathering', image: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=600&q=80', date: 'Saturdays at 4:00 PM' }
  ];

  const displayEvents = eventsData.length > 0 ? eventsData : defaultEvents;

  const normalizedEvents = useMemo(
    () =>
      displayEvents.map((event, index) => ({
        key: event.id ?? event._id ?? `${event.title}-${index}`,
        image: event.image || event.imageUrl || '',
        title: event.title || 'Church Event',
        date: event.date || event.description || ''
      })),
    [displayEvents]
  );

  const slides = GALLERY_IMAGES;

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index) => {
      if (totalSlides === 0) return;
      setSlideIndex(((index % totalSlides) + totalSlides) % totalSlides);
    },
    [totalSlides]
  );

  const nextSlide = useCallback(
    () => setSlideIndex((current) => (current + 1) % Math.max(totalSlides, 1)),
    [totalSlides]
  );

  const prevSlide = useCallback(
    () => setSlideIndex((current) => (current - 1 + Math.max(totalSlides, 1)) % Math.max(totalSlides, 1)),
    [totalSlides]
  );

  useEffect(() => {
    if (isPaused || totalSlides < 2) return undefined;
    const timer = setInterval(nextSlide, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, totalSlides]);

  return (
    <div className="landing-page">
      <nav className="landing-nav" style={styles.nav}>
        <div style={styles.logo}>Free Believers in Christ Fellowship Taguig</div>
        <div style={styles.navLinks}>
          <button style={styles.navBtn} onClick={() => scrollToSection('events')}>Events</button>
          <button style={styles.navBtn} onClick={() => scrollToSection('contact')}>Contact Us</button>
          <button style={styles.joinBtn} onClick={onOpenAuth}>Join Us Now</button>
        </div>
      </nav>

      <header
        style={{
          ...styles.hero,
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${bgImage})`
        }}
      >
        <div style={styles.heroContent}>
          <p style={styles.greeting}>{timeGreeting}</p>
          <h1 style={styles.heroTitle}>A church for FBCFI</h1>
          <div style={styles.heroActionBtns}>
            <button style={styles.primaryHeroBtn} onClick={onOpenAuth}>Join Us Now</button>
            <button style={styles.secondaryHeroBtn} onClick={() => scrollToSection('events')}>View Events</button>
          </div>
        </div>
      </header>

      <section id="events" style={styles.section}>
        <h2 style={styles.sectionTitle}>Our Previous Events</h2>
        {totalSlides > 0 ? (
          <div
            style={styles.carousel}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (delta > 50) prevSlide();
              if (delta < -50) nextSlide();
            }}
            role="region"
            aria-roledescription="carousel"
            aria-label="Church events photo slideshow"
          >
            <div style={styles.carouselViewport}>
              {slides.map((slide, index) => (
                <figure
                  key={slide.src}
                  style={{
                    ...styles.slide,
                    opacity: index === slideIndex ? 1 : 0,
                    zIndex: index === slideIndex ? 2 : 1
                  }}
                  aria-hidden={index !== slideIndex}
                >
                  <img
                    src={slide.src}
                    alt={slide.label}
                    style={styles.slideImage}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <figcaption style={styles.slideCaption}>{slide.label}</figcaption>
                </figure>
              ))}
            </div>

            {totalSlides > 1 && (
              <>
                <button
                  type="button"
                  style={{ ...styles.carouselArrow, ...styles.carouselArrowPrev }}
                  onClick={prevSlide}
                  aria-label="Previous slide"
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  style={{ ...styles.carouselArrow, ...styles.carouselArrowNext }}
                  onClick={nextSlide}
                  aria-label="Next slide"
                >
                  &#10095;
                </button>

                <div style={styles.carouselDots}>
                  {slides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      style={{
                        ...styles.carouselDot,
                        ...(index === slideIndex ? styles.carouselDotActive : {})
                      }}
                      onClick={() => goToSlide(index)}
                      aria-label={`Go to slide ${index + 1}`}
                      aria-current={index === slideIndex}
                    />
                  ))}
                </div>

                <div style={styles.carouselCounter}>
                  {slideIndex + 1} / {totalSlides}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={styles.eventsGrid}>
            {normalizedEvents.map((event) => (
              <div key={event.key} style={styles.eventCard}>
                <img src={event.image} alt={event.title} style={styles.eventImage} />
                <div style={styles.eventDetails}>
                  <h3>{event.title}</h3>
                  <p>{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer id="contact" style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerCol}>
            <h3>Contact Us</h3>
            <p><strong>Address:</strong> {contactInfo.address || '123 Faith Street, Cityville'}</p>
            <p><strong>Phone:</strong> {contactInfo.phone || '(555) 019-2834'}</p>
            <p><strong>Email:</strong> {contactInfo.email || 'info@gracechurch.org'}</p>
          </div>
          <div style={styles.footerCol}>
            <h3>Service Times</h3>
            <p>{contactInfo.serviceTimes || 'Sunday Worship: 9:00 AM & 11:00 AM'}</p>
            <p>{contactInfo.midweekTimes || 'Wednesday Prayer: 7:00 PM'}</p>
          </div>
        </div>
        <div style={styles.copyright}>
          <p>&copy; {new Date().getFullYear()} Free Believers in Christ Fellowship Taguig. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    zIndex: 1000,
    boxSizing: 'border-box'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  navLinks: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  joinBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  hero: {
    height: '100vh',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    textAlign: 'center',
    transition: 'background-image 1s ease-in-out'
  },
  heroContent: {
    maxWidth: '800px',
    padding: '0 1rem'
  },
  greeting: {
    fontSize: '1.25rem',
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  heroTitle: {
    fontSize: '3rem',
    margin: '1rem 0 2rem'
  },
  heroActionBtns: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center'
  },
  primaryHeroBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    fontSize: '1.1rem',
    cursor: 'pointer'
  },
  secondaryHeroBtn: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: '2px solid #fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    fontSize: '1.1rem',
    cursor: 'pointer'
  },
  section: {
    padding: '4rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '2rem'
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem'
  },
  carousel: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
    backgroundColor: '#0b1220'
  },
  carouselViewport: {
    position: 'relative',
    width: '100%',
    height: 'clamp(240px, 45vw, 520px)'
  },
  slide: {
    position: 'absolute',
    inset: 0,
    margin: 0,
    transition: 'opacity 0.6s ease-in-out'
  },
  slideImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block'
  },
  slideCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '2.5rem 1.25rem 1.25rem',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.75))',
    color: '#fff',
    fontSize: '1.15rem',
    fontWeight: 700,
    textAlign: 'left'
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 3,
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0, 0, 0, 0.55)',
    color: '#fff',
    fontSize: '1.1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease'
  },
  carouselArrowPrev: {
    left: '12px'
  },
  carouselArrowNext: {
    right: '12px'
  },
  carouselDots: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 3,
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '80%',
    padding: '0 2.5rem'
  },
  carouselDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    background: 'rgba(255, 255, 255, 0.55)',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.2s ease'
  },
  carouselDotActive: {
    background: '#ffffff',
    transform: 'scale(1.25)'
  },
  carouselCounter: {
    position: 'absolute',
    top: '12px',
    right: '14px',
    zIndex: 3,
    padding: '0.3rem 0.6rem',
    borderRadius: '999px',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    fontSize: '0.8rem',
    letterSpacing: '0.5px'
  },
  eventCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  eventImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  },
  eventDetails: {
    padding: '1rem'
  },
  footer: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '3rem 2rem 1rem',
    boxSizing: 'border-box'
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem'
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  copyright: {
    textAlign: 'center',
    marginTop: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #333'
  }
};

export default LandingPage;