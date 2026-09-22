import { useEffect, useState } from 'react';

const LandingPage = ({ onOpenAuth, eventsData = [], contactInfo = {} }) => {
  const [bgImage, setBgImage] = useState('');
  const [timeGreeting, setTimeGreeting] = useState('');

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
          <h1 style={styles.heroTitle}>A Place to Belong, Believe, and Become</h1>
          <div style={styles.heroActionBtns}>
            <button style={styles.primaryHeroBtn} onClick={onOpenAuth}>Join Us Now</button>
            <button style={styles.secondaryHeroBtn} onClick={() => scrollToSection('events')}>View Events</button>
          </div>
        </div>
      </header>

      <section id="events" style={styles.section}>
        <h2 style={styles.sectionTitle}>Upcoming Events</h2>
        <div style={styles.eventsGrid}>
          {displayEvents.map((event) => (
            <div key={event.id || event._id} style={styles.eventCard}>
              <img src={event.image || event.imageUrl} alt={event.title} style={styles.eventImage} />
              <div style={styles.eventDetails}>
                <h3>{event.title}</h3>
                <p>{event.date || event.description}</p>
              </div>
            </div>
          ))}
        </div>
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