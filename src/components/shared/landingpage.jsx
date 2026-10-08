import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api';
import bgMorning from '../../assets/bgpics/churchmorn.jpg';
import bgNight from '../../assets/bgpics/churchnight.jpg';
import bgNoon from '../../assets/bgpics/churchnoon.jpg';
import { formatPhDateObject, getPhDateString, getPhTodayDateObject, normalizeDateString } from '../../utils/philippinesTime';

const galleryModules = import.meta.glob('../../assets/landingpvents/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default'
});


const SLIDE_LABELS = {
  'IMG_2567.JPG': 'Music Ministry',
  'IMG_3198.JPG': 'Marshall Ministry',
  'IMG_3201.JPG': 'Marshall Ministry',
  'IMG_3219.JPG': 'Multimedia Ministry',
  'IMG_3313.JPG': 'Kitchen Ministry Outdoor Cooking',
  'IMG_3325.JPG': 'Marshall Ministry Member',
  'IMG_3465.JPG': 'Multimedia Ministry Staff',
  'IMG_3545.JPG': 'Kitchen Ministry Outdoor Cooking',
  'IMG_3592.JPG': 'Kitchen Ministry Staff',
  'IMG_3758.JPG': 'Multimedia Ministry',
  'IMG_3762.JPG': 'Technical Ministry',
  'IMG_5072.JPG': 'Usher Ministry',
  'IMG_5118.JPG': 'Youth Camp Retreat',
  'IMG_8414.JPG': 'Kitchen Ministry',
  'IMG_8530.JPG': 'Children\'s Ministry Event',
  'IMG_8531.JPG': 'Children\'s Ministry Event',
  'IMG_8546.JPG': 'Multimedia Ministry',
  'IMG_8781.JPG': 'Kitchen Ministry Distribution',
  'IMG_8796.JPG': 'Kitchen Ministry Distribution',
  'IMG_8935.JPG': 'Multimedia Ministry Staff',
  'IMG_9227.JPG': 'Multimedia Ministry Staff',
  '825310055_1617566113141805_1993782545261584226_n.jpg': 'Anniversary Celebration',
  'BG for Log In': 'Gathering for Worship',
  'Musc.jpg': 'Music Ministry'
};

const SLIDE_DEFAULT_LABEL = 'Church Event';
const SLIDE_INTERVAL = 5000;

const STOCK_IMAGES = {
  morning: bgMorning,
  afternoon: bgNoon,
  evening: bgNight
};

const SERVICES = [
  { name: 'Worship Service', description: 'Our main gathering to worship God together through praise and the Word.' },
  { name: 'Jail Preaching', description: 'Sharing the gospel with those in prison and bringing hope and encouragement.' },
  { name: 'Wedding', description: 'Celebrating the union of two families before God and the congregation.' },
  { name: 'Dedication', description: 'Dedicating a new home, vehicle, or blessing to the Lord.' },
  { name: 'Anniversary', description: 'Marking a special milestone of thanksgiving with the whole family.' },
  { name: 'Healing Crusade', description: 'A time of prayer and faith for the healing of the sick and the brokenhearted.' },
  { name: 'Feeding Program', description: 'Serving meals to families in need within our community.' },
  { name: 'Baptism', description: 'Public immersion as a declaration of faith in Jesus Christ.' },
  { name: 'Bible Study', description: 'Going deeper into the Word through study, discussion, and prayer.' },
  { name: 'Prayer Meeting', description: 'Coming together in prayer for the church, our community, and the nation.' },
  { name: 'Youth Camp', description: 'A retreat for young people to grow in faith and fellowship.' }
];

const GALLERY_IMAGES = Object.keys(galleryModules)
  .sort()
  .map((key) => {
    const fileName = key.split('/').pop();
    const baseName = fileName.replace(/\.[^.]+$/, '');
    return {
      src: galleryModules[key],
      label: SLIDE_LABELS[fileName] || SLIDE_LABELS[baseName] || SLIDE_DEFAULT_LABEL
    };
  });

const LandingPage = ({ onOpenAuth, contactInfo = {} }) => {
  const [bgImage, setBgImage] = useState('');
  const [timeGreeting, setTimeGreeting] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => getPhTodayDateObject());
  const [selectedDate, setSelectedDate] = useState(() => getPhDateString());
  const [agendaPage, setAgendaPage] = useState(1);
  const touchStartX = useRef(null);

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

  useEffect(() => {
    let isMounted = true;

    api.getEvents()
      .then((response) => {
        if (isMounted) setEvents(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error('Failed to fetch public events:', error);
        if (isMounted) setEventsError(true);
      })
      .finally(() => {
        if (isMounted) setEventsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const totalSlides = GALLERY_IMAGES.length;

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

  const currentYear = currentCalendarDate.getFullYear();
  const currentMonth = currentCalendarDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
  const makeDateString = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const addOneDay = (dateText) => {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return makeDateString(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const activeEvents = events.filter((event) => event.status !== 'archived');
  const hasEventsOnDate = (day) => {
    if (!day) return false;
    const dateText = makeDateString(currentYear, currentMonth, day);
    return activeEvents.some((event) => {
      const eventDate = normalizeDateString(event.date);
      if (!eventDate) return false;
      const overnight = event.timeStart && event.timeEnd && event.timeEnd < event.timeStart;
      return eventDate === dateText || (overnight && addOneDay(eventDate) === dateText);
    });
  };
  const selectedEvents = activeEvents
    .filter((event) => {
      const eventDate = normalizeDateString(event.date);
      if (!eventDate) return false;
      const overnight = event.timeStart && event.timeEnd && event.timeEnd < event.timeStart;
      return eventDate === selectedDate || (overnight && addOneDay(eventDate) === selectedDate);
    })
    .sort((first, second) => (first.timeStart || first.time || '').localeCompare(second.timeStart || second.time || ''));

  const eventsPerPage = 4;
  const agendaPageCount = Math.max(1, Math.ceil(selectedEvents.length / eventsPerPage));
  const safeAgendaPage = Math.min(agendaPage, agendaPageCount);
  const paginatedSelectedEvents = selectedEvents.slice((safeAgendaPage - 1) * eventsPerPage, safeAgendaPage * eventsPerPage);

  useEffect(() => {
    setAgendaPage(1);
  }, [selectedDate]);

  const selectCalendarDate = (day) => {
    if (day) setSelectedDate(makeDateString(currentYear, currentMonth, day));
  };

  const goToToday = () => {
    const today = getPhTodayDateObject();
    setCurrentCalendarDate(today);
    setSelectedDate(getPhDateString());
  };

  useEffect(() => {
    if (isPaused || totalSlides < 2) return undefined;
    const timer = setInterval(nextSlide, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, totalSlides]);

  return (
    <div className="landing-page">
      <nav className="landing-nav" style={styles.nav}>
        <div style={styles.logo}>Free Believers in Christ Fellowship Inc. Taguig City</div>
        <div style={styles.navLinks}>
          <button style={styles.navBtn} onClick={() => scrollToSection('events')}>Events</button>
          <button style={styles.navBtn} onClick={() => scrollToSection('services')}>Our Services</button>
          <button style={styles.navBtn} onClick={() => scrollToSection('event-calendar')}>Calendar</button>
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
          <h1 style={styles.heroTitle}>A Home for FBCFI</h1>
          <div style={styles.heroActionBtns}>
            <button style={styles.primaryHeroBtn} onClick={onOpenAuth}>Join Us Now</button>
            <button style={styles.secondaryHeroBtn} onClick={() => scrollToSection('events')}>View Events</button>
          </div>
        </div>
      </header>

      <section id="events" style={styles.section}>
        <h2 style={styles.sectionTitle}>Our Previous Events</h2>
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
            {GALLERY_IMAGES.map((slide, index) => (
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
                {GALLERY_IMAGES.map((slide, index) => (
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
      </section>

      <section id="services" style={styles.section}>
        <h2 style={styles.sectionTitle}>Our Services</h2>
        <div style={styles.servicesGrid}>
          {SERVICES.map((service) => (
            <article key={service.name} style={styles.serviceCard}>
              <h3 style={styles.serviceTitle}>{service.name}</h3>
              <p style={styles.serviceDescription}>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="event-calendar" style={styles.section}>
        <h2 style={styles.sectionTitle}>Upcoming Events</h2>
        <div style={styles.publicCalendar}>
          <div style={styles.calendarPanel}>
            <div style={styles.calendarHeader}>
              <button
                type="button"
                style={styles.calendarNavButton}
                onClick={() => setCurrentCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                aria-label="Previous month"
              >
                &#10094;
              </button>
              <h3 style={styles.calendarMonth}>
                {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                type="button"
                style={styles.calendarNavButton}
                onClick={() => setCurrentCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                aria-label="Next month"
              >
                &#10095;
              </button>
              <button type="button" style={styles.todayButton} onClick={goToToday}>Today</button>
            </div>
            <div style={styles.calendarGrid}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} style={styles.calendarDayHeader}>{day}</div>
              ))}
              {calendarDays.map((day, index) => {
                const dateText = day ? makeDateString(currentYear, currentMonth, day) : '';
                const isSelected = dateText === selectedDate;
                const hasEvents = hasEventsOnDate(day);
                return day ? (
                  <button
                    key={dateText}
                    type="button"
                    onClick={() => selectCalendarDate(day)}
                    aria-label={`${formatPhDateObject(new Date(`${dateText}T00:00:00`))}${hasEvents ? ', events scheduled' : ''}`}
                    aria-pressed={isSelected}
                    style={{
                      ...styles.calendarDay,
                      ...(isSelected ? styles.calendarDaySelected : {})
                    }}
                  >
                    {day}
                    {hasEvents && <span style={{ ...styles.calendarEventDot, ...(isSelected ? styles.calendarEventDotSelected : {}) }} />}
                  </button>
                ) : <div key={`blank-${index}`} />;
              })}
            </div>
          </div>

          <div style={styles.agendaPanel}>
            <div style={styles.agendaHeader}>
              <div>
                <h3 style={styles.agendaTitle}>Day View</h3>
                <p style={styles.agendaDate}>{formatPhDateObject(new Date(`${selectedDate}T00:00:00`))}</p>
              </div>
              <span style={styles.timezoneLabel}>View events from throughout the days</span>
            </div>
            {eventsLoading ? (
              <p style={styles.agendaMessage}>Loading events...</p>
            ) : eventsError ? (
              <p style={styles.agendaMessage}>Events are temporarily unavailable.</p>
            ) : selectedEvents.length === 0 ? (
              <p style={styles.agendaMessage}>No events scheduled for this day.</p>
            ) : (
              <div>
                {paginatedSelectedEvents.map((event) => {
                  const isOvernightCarryover = normalizeDateString(event.date) !== selectedDate;
                  return (
                    <article key={event._id} style={styles.agendaEvent}>
                      <div style={styles.agendaEventAccent} />
                      <div>
                        <h4 style={styles.agendaEventTitle}>{event.title || event.titleSelection || 'Church Event'}</h4>
                        <p style={styles.agendaEventDetail}>
                          {event.time || `${event.timeStart || 'Time TBA'} - ${event.timeEnd || ''}`}
                          {isOvernightCarryover ? ' (continues overnight)' : ''}
                        </p>
                        <p style={styles.agendaEventDetail}>{event.room || 'Location to be announced'}</p>
                      </div>
                    </article>
                  );
                })}

                {selectedEvents.length > eventsPerPage && (
                  <div style={styles.paginationRow}>
                    <button
                      type="button"
                      style={{ ...styles.paginationButton, ...(safeAgendaPage === 1 ? styles.paginationButtonDisabled : {}) }}
                      onClick={() => setAgendaPage((page) => Math.max(1, page - 1))}
                      disabled={safeAgendaPage === 1}
                    >
                      Previous
                    </button>
                    <span style={styles.paginationLabel}>Page {safeAgendaPage} of {agendaPageCount}</span>
                    <button
                      type="button"
                      style={{ ...styles.paginationButton, ...(safeAgendaPage === agendaPageCount ? styles.paginationButtonDisabled : {}) }}
                      onClick={() => setAgendaPage((page) => Math.min(agendaPageCount, page + 1))}
                      disabled={safeAgendaPage === agendaPageCount}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer id="contact" style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerCol}>
            <h3>Contact Us</h3>
            <p><strong>Address:</strong> {contactInfo.address || 'Taguig City '}</p>
            <p><strong>Phone:</strong> {contactInfo.phone || '09498405383'}</p>
            <p><strong>Email:</strong> {contactInfo.email || 'taguigfbcfi@gmail.com'}</p>
          </div>
        </div>
        <div style={styles.copyright}>
          <p>&copy; {new Date().getFullYear()} Free Believers in Christ Fellowship Inc.</p>
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
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem'
  },
  publicCalendar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: '2rem',
    alignItems: 'start'
  },
  calendarPanel: {
    padding: '1.25rem',
    border: '1px solid #dbe3e8',
    borderRadius: '8px',
    background: '#f8faf9'
  },
  calendarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  calendarMonth: {
    margin: 0,
    color: '#173b36',
    fontSize: '1.1rem',
    flex: 1,
    textAlign: 'center'
  },
  calendarNavButton: {
    width: '36px',
    height: '36px',
    border: '1px solid #cbd5d1',
    borderRadius: '6px',
    background: '#fff',
    color: '#174c42',
    cursor: 'pointer'
  },
  todayButton: {
    minHeight: '36px',
    padding: '0 0.7rem',
    border: '1px solid #176b55',
    borderRadius: '6px',
    background: '#176b55',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: '4px',
    textAlign: 'center'
  },
  calendarDayHeader: {
    padding: '0.4rem 0',
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 700
  },
  calendarDay: {
    position: 'relative',
    aspectRatio: '1',
    border: '0',
    borderRadius: '6px',
    background: 'transparent',
    color: '#263b36',
    cursor: 'pointer',
    font: 'inherit'
  },
  calendarDaySelected: {
    background: '#176b55',
    color: '#fff'
  },
  calendarEventDot: {
    position: 'absolute',
    left: '50%',
    bottom: '5px',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#d97706',
    transform: 'translateX(-50%)'
  },
  calendarEventDotSelected: {
    background: '#fff'
  },
  agendaPanel: {
    minHeight: '300px',
    padding: '1.25rem',
    border: '1px solid #dbe3e8',
    borderRadius: '8px',
    background: 'rgba(248, 250, 252, 0.98)'
  },
  agendaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #dbe3e8'
  },
  agendaTitle: {
    margin: 0,
    color: '#173b36',
    fontSize: '1.25rem'
  },
  agendaDate: {
    marginTop: '0.25rem',
    color: '#64748b',
    fontSize: '0.9rem'
  },
  timezoneLabel: {
    color: '#64748b',
    fontSize: '0.75rem',
    textAlign: 'right'
  },
  agendaMessage: {
    padding: '1.5rem 0',
    color: '#64748b'
  },
  agendaEvent: {
    display: 'flex',
    gap: '0.9rem',
    padding: '1rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  agendaEventAccent: {
    width: '4px',
    flex: '0 0 4px',
    borderRadius: '4px',
    background: '#176b55'
  },
  agendaEventTitle: {
    margin: 0,
    color: '#1f2937',
    fontSize: '1rem'
  },
  agendaEventDetail: {
    marginTop: '0.25rem',
    color: '#64748b',
    fontSize: '0.85rem'
  },
  paginationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '18px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  paginationButton: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: 600
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  paginationLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600
  },
  serviceCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #4f46e5',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  serviceTitle: {
    margin: 0,
    fontSize: '1.05rem',
    color: '#0f172a'
  },
  serviceDescription: {
    margin: 0,
    fontSize: '0.92rem',
    lineHeight: 1.5,
    color: '#475569'
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