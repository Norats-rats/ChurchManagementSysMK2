import { useEffect, useState } from 'react';
import api from '../../api';
import Analytics from './analyticz';
import AttendanceTab from './attendancetab';
import EBible from './ebible';
import EventTab from './eventtab';
import MemberForm from './memberform';
import Ministries from './ministries';
import Prayers from './prayers';

const Dashboard = ({ user, role: rawRole, onLogout }) => {
  const role = rawRole?.toLowerCase().includes('member') ? 'Member' : rawRole;
  const isLeader = role === 'Admin' || role === 'Ministry Leader';

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [stats, setStats] = useState({ memberCount: 0, attendanceCount: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [announcement, setAnnouncement] = useState("Loading church updates...");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading scripture...", reference: "" });

  const navigationConfig = [
    { id: 'dashboard', label: role === 'Member' ? '📌 Bulletin Board' : '📊 Dashboard', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'ebible', label: '📖 eBible', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'members', label: '👥 Church Members', roles: ['Admin'] },
    { id: 'events', label: '📅 Events', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'attendance', label: '📋 Attendance', roles: ['Admin', 'Member', 'Staff'] },
    { id: 'ministries', label: '❤️ Ministries', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'prayers', label: '🙏 Prayers', roles: ['Admin', 'Ministry Leader', 'Staff', 'Member'] },
    { id: 'analytics', label: '📈 Analytics', roles: ['Admin', 'Ministry Leader'] },
  ];

  const visibleTabs = navigationConfig.filter(tab => tab.roles.includes(role));

  useEffect(() => {
    fetchDailyVerse();
    if (currentTab === 'dashboard') {
      fetchBulletinData();
    }
  }, [currentTab]);

const fetchBulletinData = async () => {
  try {
    const [membersRes, eventsRes, attendanceRes, announceRes] = await Promise.all([
      api.getMembers(), 
      api.getEvents(), 
      api.getAttendance(),
      api.getAnnouncement().catch(() => ({ data: { text: "Welcome to our Fellowship!" } })) 
    ]);

    const allEvents = eventsRes.data || [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const futureEvents = allEvents
      .filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setStats({
      memberCount: Array.isArray(membersRes.data) ? membersRes.data.length : 0,
      attendanceCount: Array.isArray(attendanceRes.data) ? attendanceRes.data.length : 0,
    });
    setNextEvent(futureEvents[0] || null);
    setAnnouncement(announceRes.data?.text || "Peace be with you!");
  } catch (err) {
    console.error("Data fetch error:", err);
  }
};

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      await api.updateAnnouncement(newAnnouncement);
      setAnnouncement(newAnnouncement);
      setNewAnnouncement("");
      alert("Bulletin Updated for all members!");
    } catch (err) {
      alert("Error syncing announcement to database.");
    }
  };

  const fetchDailyVerse = async () => {
    try {
      const bibleStructure = [{ name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "John", chapters: 21 }];
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const selectedBook = bibleStructure[dateSeed % bibleStructure.length];
      const response = await fetch(`https://bible-api.com/${selectedBook.name}+${(dateSeed % selectedBook.chapters) + 1}`);
      const data = await response.json();
      if (data.verses) {
        const v = data.verses[dateSeed % data.verses.length];
        setDailyVerse({ text: v.text, reference: `${v.book_name} ${v.chapter}:${v.verse}` });
      }
    } catch (err) {
      setDailyVerse({ text: "For God so loved the world...", reference: "John 3:16" });
    }
  };

  const getTrivia = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

const trivias = [
  "The word 'Christian' appears only 3 times in the Bible.",
  "Psalm 118 is the middle chapter of the entire Bible.",
  "The shortest verse is 'Jesus wept' (John 11:35).",
  "The Bible was written in three languages: Hebrew, Aramaic, and Greek.",
  "Esther is the only book in the Bible that does not mention God.",
  "The longest word in the Bible is Mahershalalhashbaz (Isaiah 8:1).",
  "The shortest book is 2 John (by verse count).",
  "The Bible is the most sold book in history.",
  "The New Testament has 27 books.",
  "The Old Testament has 39 books.",
  "The word 'Bible' comes from the Greek 'biblia', meaning 'books'.",
  "Noah's Ark was about 450 feet long.",
  "Methuselah was the oldest person in the Bible (969 years).",
  "The longest chapter is Psalm 119.",
  "The shortest chapter is Psalm 117.",
  "The longest book is Psalms (by number of chapters).",
  "The longest book by word count is actually Jeremiah.",
  "The longest verse in the Bible is Esther 8:9.",
  "There are 1,189 chapters in the Bible.",
  "The Old Testament has 929 chapters.",
  "The New Testament has 260 chapters.",
  "The Bible was written by about 40 different authors.",
  "It took approximately 1,500 years to write the full Bible canon.",
  "The first book printed on a moveable type press was the Gutenberg Bible.",
  "The word 'Selah' appears 74 times in the Bible.",
  "The system of chapters was introduced by Cardinal Hugo de Sancto Caro in 1238.",
  "The verse system was introduced by Robert Estienne in 1551.",
  "The full Bible has been translated into over 700 languages.",
  "The Bible contains about 773,692 words (KJV).",
  "The word 'Trinity' is not actually found in the Bible.",
  "God changed Abram's name to Abraham, meaning 'Father of many'.",
  "Sarah was 90 years old when Isaac was born.",
  "Jacob had 12 sons, who became the 12 tribes of Israel.",
  "Joseph's brothers sold him for 20 pieces of silver.",
  "Moses was 80 years old when he confronted Pharaoh.",
  "The Ten Plagues of Egypt targeted specific Egyptian gods.",
  "Manna tasted like wafers made with honey.",
  "The Tabernacle was a portable tent used for worship in the wilderness.",
  "The Ark of the Covenant contained the Ten Commandments, Aaron’s rod, and manna.",
  "Joshua led the Israelites when the walls of Jericho fell.",
  "Rahab, a woman in Jericho, is an ancestor of Jesus.",
  "Deborah was the only female judge of Israel.",
  "Gideon defeated a Midianite army with only 300 men.",
  "Samson’s strength was tied to his vow as a Nazirite.",
  "Ruth was a Moabite woman who chose to follow the God of Israel.",
  "Boaz was the 'Kinsman Redeemer' for Ruth.",
  "King Saul was a head taller than any other man in Israel.",
  "David was a shepherd boy before he was king.",
  "David wrote about half of the Psalms.",
  "Solomon is credited with writing 3,000 proverbs.",
  "Solomon also wrote 1,005 songs.",
  "The Queen of Sheba visited Solomon to test his wisdom.",
  "The Kingdom of Israel split into two after Solomon's death.",
  "The Northern Kingdom was called Israel; the Southern was Judah.",
  "Elijah was fed by ravens near the Brook Cherith.",
  "Elisha asked for a 'double portion' of Elijah's spirit.",
  "Naaman was healed of leprosy by dipping in the Jordan River seven times.",
  "Josiah became king of Judah when he was only 8 years old.",
  "Nebuchadnezzar was the King of Babylon who destroyed Jerusalem.",
  "Shadrach, Meshach, and Abednego survived a fiery furnace.",
  "Daniel was thrown into a lions' den for praying to God.",
  "Nehemiah led the rebuilding of Jerusalem's walls in just 52 days.",
  "Ezra was a scribe and priest who led the return from exile.",
  "Job’s three friends were Eliphaz, Bildad, and Zophar.",
  "The book of Proverbs says 'the fear of the Lord is the beginning of wisdom'.",
  "Ecclesiastes was likely written by Solomon in his old age.",
  "Isaiah is the most quoted prophet in the New Testament.",
  "Ezekiel saw a vision of a valley of dry bones coming to life.",
  "Hosea was commanded to marry a woman who would be unfaithful.",
  "Jonah spent 3 days and nights in the belly of a great fish.",
  "Amos was a shepherd and a sycamore fig farmer before prophesying.",
  "Micah prophesied that the Messiah would be born in Bethlehem.",
  "Zechariah prophesied the Messiah would enter Jerusalem on a donkey.",
  "Malachi is the last book of the Old Testament.",
  "There is a 400-year gap of silence between the Old and New Testaments.",
  "The Red Sea was parted by a strong east wind sent by God.",
  "The Ten Commandments were written with the finger of God.",
  "Aaron, Moses' brother, was the first High Priest.",
  "Balaam’s donkey spoke to him when it saw an angel.",
  "The sun stood still for a day during the battle at Gibeon.",
  "Jael killed the enemy commander Sisera with a tent peg.",
  "Jephthah made a tragic vow involving his daughter.",
  "Samuel was the last judge and first of the great prophets.",
  "Jonathan was King Saul’s son and David’s best friend.",
  "David spared Saul’s life twice.",
  "Absalom, David’s son, was caught in a tree by his hair.",
  "Mephibosheth was Jonathan's son who was lame in both feet.",
  "Nathan was the prophet who confronted David about Bathsheba.",
  "Solomon built the first Temple in Jerusalem.",
  "Hezekiah’s life was extended by 15 years after he prayed.",
  "Manasseh was the longest-reigning king of Judah (55 years).",
  "The 'weeping prophet' is a nickname for Jeremiah.",
  "Lamentations consists of five poems mourning Jerusalem.",
  "The Babylonian Captivity lasted 70 years.",
  "Belshazzar saw a hand writing on a wall during a feast.",
  "The minor prophets are 'minor' due to length, not importance.",
  "Obadiah is the shortest book in the Old Testament.",
  "Joel prophesied about the outpouring of the Holy Spirit.",
  "Nineveh repented after Jonah’s preaching.",
  "Habakkuk is a dialogue between the prophet and God.",
  "Zephaniah spoke of the 'Day of the Lord'.",
  "Haggai encouraged the rebuilding of the second Temple.",
  "The ‘Suffering Servant’ is a famous prophecy in Isaiah 53.",
  "Cain was the first human born on Earth.",
  "Abel was the first human to die.",
  "Seth was the third son of Adam and Eve.",
  "Enoch was taken to heaven without dying.",
  "Lamech was the first man in the Bible to have two wives.",
  "Nimrod was described as a mighty hunter and built Babel.",
  "Lot was Abraham’s nephew.",
  "Lot's wife turned into a pillar of salt.",
  "Hagar was the mother of Ishmael.",
  "Rebekah was the wife of Isaac.",
  "Esau sold his birthright for a bowl of lentil stew.",
  "Jacob wrestled with an angel all night.",
  "Leah and Rachel were sisters and both married to Jacob.",
  "Benjamin was the youngest of the 12 brothers.",
  "Potiphar’s wife falsely accused Joseph of a crime.",
  "Joseph interpreted Pharaoh's dreams of seven cows.",
  "Zipporah was the wife of Moses.",
  "The burning bush was not consumed by the fire.",
  "The first plague of Egypt was water turning to blood.",
  "The Passover involved putting lamb's blood on doorposts.",
  "The Israelites ate manna for 40 years.",
  "The Law was given on Mount Sinai.",
  "Mount Pisgah is where Moses saw the Promised Land before dying.",
  "Caleb and Joshua were the only two spies who gave a good report.",
  "The Jordan River stopped flowing when the priests' feet touched it.",
  "The Gospel of Matthew was written primarily for a Jewish audience.",
  "The Gospel of Mark is the shortest of the four Gospels.",
  "The Gospel of Luke was written by a physician.",
  "The Gospel of John is unique and not a 'Synoptic' Gospel.",
  "John the Baptist ate locusts and wild honey.",
  "Jesus was born in Bethlehem but grew up in Nazareth.",
  "Jesus was about 30 years old when He began His ministry.",
  "Jesus’ first miracle was turning water into wine.",
  "There are 12 chosen Apostles.",
  "Peter’s original name was Simon.",
  "Andrew was the brother of Peter.",
  "James and John were called the 'Sons of Thunder'.",
  "Matthew was a tax collector before following Jesus.",
  "Thomas is often remembered for doubting the Resurrection.",
  "Judas Iscariot betrayed Jesus for 30 pieces of silver.",
  "Jesus walked on the water of the Sea of Galilee.",
  "Jesus fed 5,000 men with five loaves and two fish.",
  "Lazarus was dead for four days before Jesus raised him.",
  "Zacchaeus was a short tax collector who climbed a tree.",
  "The Sermon on the Mount contains the Beatitudes.",
  "The Lord’s Prayer is found in Matthew and Luke.",
  "The Garden of Gethsemane is where Jesus prayed before His arrest.",
  "Golgotha means 'The Place of the Skull'.",
  "Pontius Pilate was the Roman governor who sentenced Jesus.",
  "Joseph of Arimathea provided the tomb for Jesus.",
  "Mary Magdalene was the first to see the risen Jesus.",
  "The Great Commission tells believers to make disciples of all nations.",
  "The book of Acts was written by Luke.",
  "Pentecost is when the Holy Spirit descended on the believers.",
  "Stephen was the first Christian martyr.",
  "Saul of Tarsus became the Apostle Paul after a vision on the road to Damascus.",
  "Paul went on three major missionary journeys.",
  "Cornelius was the first Gentile convert to Christianity.",
  "The church was first called 'Christians' in Antioch.",
  "Barnabas was known as the 'Son of Encouragement'.",
  "Silas was Paul’s companion in prison in Philippi.",
  "Paul wrote the book of Romans while in Corinth.",
  "1 Corinthians 13 is often called the 'Love Chapter'.",
  "The fruit of the Spirit is listed in Galatians 5.",
  "Ephesians, Philippians, Colossians, and Philemon are the 'Prison Epistles'.",
  "The 'Armor of God' is described in Ephesians 6.",
  "The shortest verse in the Greek New Testament is 'Rejoice always' (1 Thess 5:16).",
  "Timothy was a young pastor and Paul’s 'son in the faith'.",
  "Titus was a leader on the island of Crete.",
  "Philemon was a slave owner whose slave, Onesimus, ran away.",
  "The book of Hebrews has an unknown author.",
  "Hebrews 11 is often called the 'Hall of Faith'.",
  "James, the author of the book of James, was the half-brother of Jesus.",
  "The book of Jude is only one chapter long.",
  "Revelation was written by John on the island of Patmos.",
  "The Alpha and the Omega means the Beginning and the End.",
  "The New Jerusalem is described as having streets of gold.",
  "The 12 gates of the New Jerusalem are each made of a single pearl.",
  "There is no temple in the New Jerusalem because God is its temple.",
  "The Tree of Life appears in both Genesis and Revelation.",
  "Jesus healed ten lepers, but only one returned to thank Him.",
  "The transfiguration occurred on a high mountain with Moses and Elijah.",
  "The 'Upper Room' was the site of the Last Supper.",
  "Barabbas was the prisoner released instead of Jesus.",
  "Simon of Cyrene was forced to carry the cross of Jesus.",
  "Nicodemus was a Pharisee who came to Jesus by night.",
  "The woman at the well was from Samaria.",
  "Jesus wept over the city of Jerusalem.",
  "The Parable of the Prodigal Son is found in Luke 15.",
  "The Parable of the Good Samaritan redefined who a 'neighbor' is.",
  "Jesus prayed for His unity among believers in John 17.",
  "The Holy Spirit is referred to as the 'Comforter' or 'Advocate'.",
  "Ananias and Sapphira died after lying about a land sale.",
  "Gamaliel was a famous teacher who advised the Sanhedrin.",
  "Philip the Evangelist witnessed to an Ethiopian eunuch.",
  "Dorcas (Tabitha) was a woman known for her charity who was raised from the dead.",
  "Lydia was a seller of purple cloth and Paul's first convert in Europe.",
  "The Bereans were noted for studying the Scriptures daily.",
  "Paul gave a famous speech at Mars Hill in Athens.",
  "Priscilla and Aquila were tentmakers, like Paul.",
  "Eutychus fell asleep during Paul's sermon and fell out a window.",
  "The 'Seven Churches' of Revelation were in modern-day Turkey.",
  "The Four Horsemen appear in Revelation chapter 6.",
  "The tribe of Judah is represented by a lion.",
  "The 'Lamb of God' is a title used for Jesus throughout John and Revelation.",
  "Mary and Martha were the sisters of Lazarus.",
  "The widow's mite showed that God values the heart over the amount.",
  "Peter walked on water until he looked at the waves and got scared.",
  "Herod Antipas was the tetrarch who had John the Baptist beheaded.",
  "The 'Greatest Commandment' is to love God with all your heart.",
  "The 'Second Commandment' is to love your neighbor as yourself.",
  "Jesus said, 'I am the way, the truth, and the life'.",
  "The 'Golden Rule' is to do unto others as you would have them do to you.",
  "The term 'Gospel' means 'Good News'.",
  "John the Baptist was Jesus' cousin.",
  "The Magi (Wise Men) brought gold, frankincense, and myrrh.",
  "Herod the Great ordered the massacre of infants in Bethlehem.",
  "Jesus was tempted by the devil in the wilderness for 40 days.",
  "The Sea of Galilee is actually a large freshwater lake.",
  "The Mount of Olives is where Jesus ascended into heaven.",
  "The book of Acts ends with Paul under house arrest in Rome.",
  "The word 'Amen' means 'So be it' or 'Truly'.",
  "The word 'Hallelujah' means 'Praise the Lord'.",
  "The name 'Immanuel' means 'God with us'.",

  "Ants are praised in Proverbs for their hard work and foresight.",
  "The Bible mentions 'unicorns' in the KJV, likely referring to wild oxen.",
  "Ravens fed Elijah, but they were considered 'unclean' birds in the Law.",
  "Behemoth and Leviathan are two mysterious creatures mentioned in Job.",
  "The 'Great Fish' that swallowed Jonah is never called a whale in the original text.",
  "Doves are symbols of peace and the Holy Spirit.",
  "Sheep and goats are often used to illustrate the saved and the lost.",
  "A 'talent' in the Bible was a unit of weight or money, equal to about 75 lbs.",
  "The 'denarius' was a standard day’s wage for a laborer.",
  "The 'shekel' was the standard silver coin of the Hebrews.",
  "Cinnamon was used as an ingredient in the holy anointing oil.",
  "Frankincense is a resin from Boswellia trees.",
  "Myrrh is a resin used for perfume and burial.",
  "The 'Star of Bethlehem' guided the Magi from the East.",
  "The city of Babylon is located in modern-day Iraq.",
  "The 'River Euphrates' is one of the four rivers from Eden.",
  "The 'Nile River' is where baby Moses was hidden in a basket.",
  "Gopher wood was the material used to build Noah's Ark.",
  "The Rainbow is the sign of God's covenant never to flood the Earth again.",
  "Sodom and Gomorrah were destroyed by brimstone and fire.",
  "The Pillars of Smoke and Fire guided Israel in the desert.",
  "The 'Wall of Fire' is a metaphor for God's protection in Zechariah.",
  "Locusts were the eighth plague of Egypt.",
  "A swarm of locusts also features prominently in the book of Joel.",
  "The 'Lily of the Valley' is a title sometimes applied to Jesus.",
  "The 'Rose of Sharon' is another floral title from Song of Solomon.",
  "The 'Mustard Seed' is used by Jesus to describe the Kingdom of God.",
  "The 'Vine and the Branches' illustrates our connection to Christ.",
  "The 'Salt of the Earth' refers to the preservative nature of believers.",
  "The 'Light of the World' refers to Jesus and His followers.",
  "The 'Cornerstone' is a title for Jesus' role in the Church.",
  "The 'Alpha and Omega' are the first and last letters of the Greek alphabet.",
  "The Bible mentions lions over 150 times.",
  "The 'Scorpions' of Revelation are described as having human-like faces.",
  "The 'Four Living Creatures' in Revelation have eyes all over them.",
  "The 'Sea of Glass' sits before the throne of God.",
  "There is no sun or moon in heaven because God's glory provides light.",
  "The 'Book of Life' contains the names of those who belong to God.",
  "The 'Pearls' of the gates of heaven indicate the value of the Kingdom.",
  "The 'Street of Gold' is transparent like glass.",
  "The 'Crystal Sea' represents the purity and peace of God's presence.",
  "The 'Twelve Foundations' of the New Jerusalem are decorated with jewels.",
  "Jasper, Sapphire, and Emerald are among the foundation stones.",
  "The 'Seven Seals' are opened by the Lamb in Revelation.",
  "The 'Seven Trumpets' announce judgments.",
  "The 'Seven Bowls' represent the final wrath of God.",
  "The 'Archangel Michael' is the only one specifically called an archangel.",
  "The 'Angel Gabriel' appeared to Mary and Zechariah.",
  "The 'Cherubim' guarded the entrance to the Garden of Eden.",
  "The 'Seraphim' are six-winged angels who cry 'Holy, Holy, Holy'.",
  "The 'Sword of the Spirit' is the Word of God.",
  "The 'Breastplate of Righteousness' protects the heart.",
  "The 'Shield of Faith' extinguishes flaming arrows.",
  "The 'Helmet of Salvation' protects the mind.",
  "The 'Gospel of Peace' is represented by shoes.",
  "The 'Belt of Truth' holds the armor together.",
  "The 'White Stone' in Revelation has a secret name written on it.",
  "The 'Manna' hidden for believers is mentioned in Revelation 2.",
  "The 'Key of David' represents authority.",
  "The 'Morning Star' is a title Jesus claims for Himself.",
  "The 'Lion of the Tribe of Judah' is a title for Jesus.",
  "The 'Root of David' shows Jesus' lineage.",
  "The 'Seven Spirits of God' represent the fullness of the Holy Spirit.",
  "The 'Twenty-Four Elders' sit on thrones around God's throne.",
  "The 'Golden Harps' are used in heavenly worship.",
  "The 'Incense' in heaven represents the prayers of the saints.",
  "The 'Strong Angel' in Revelation had a face like the sun.",
  "The 'Little Scroll' was eaten by John and tasted like honey.",
  "The 'Two Witnesses' preach for 1,260 days.",
  "The 'Woman Clothed with the Sun' appears in Revelation 12.",
  "The 'Great Red Dragon' represents Satan.",
  "The 'War in Heaven' resulted in Satan being cast down to Earth.",
  "The 'Beast from the Sea' has seven heads and ten horns.",
  "The 'Number of the Beast' is 666.",
  "The 'Mark of the Beast' is placed on the hand or forehead.",
  "The 'Beast from the Earth' is the False Prophet.",
  "The 'Song of Moses' and the 'Song of the Lamb' are sung in heaven.",
  "The 'Marriage Supper of the Lamb' is the great future celebration.",
  "The 'White Horse' rider in Revelation 19 is called Faithful and True.",
  "The 'King of Kings' title is written on Jesus' thigh.",
  "The 'Bottomless Pit' is where the dragon is bound for 1,000 years.",
  "The 'Millennium' is the 1,000-year reign of Christ.",
  "The 'Great White Throne' is the final judgment.",
  "The 'Lake of Fire' is the second death.",
  "The 'New Heaven and New Earth' replace the old ones.",
  "The 'Tears' of believers will be wiped away by God Himself.",
  "The 'Death' will be no more in the final state of things.",
  "The 'Curse' of Genesis is finally removed in Revelation 22.",
  "The 'River of the Water of Life' flows from the throne.",
  "The 'Leaves of the Tree of Life' are for the healing of the nations.",
  "The 'Name of God' will be on the foreheads of His servants.",
  "The Bible ends with a prayer: 'Even so, come, Lord Jesus!'.",
  "The final word of the Bible is 'Amen'.",
  "The Bible is divided into 'Testaments', which means 'Covenants'.",
  "The 'Pentateuch' refers to the first five books of the Bible.",
  "The 'Septuagint' is the ancient Greek translation of the Old Testament.",
  "The 'Vulgate' is the Latin translation of the Bible.",
  "The 'Dead Sea Scrolls' confirmed the accuracy of the Old Testament text.",
  "The Bible mentions the 'Book of Jashar', which is now lost.",
  "The 'Book of the Wars of the Lord' is another lost book mentioned.",
  "Mount Sinai is also known as Mount Horeb.",
  "The 'Wilderness of Sin' is a geographical location, not a state of being.",
  "The 'Valley of Elah' is where David fought Goliath.",
  "The 'Cave of Adullam' was David's hiding place from Saul.",
  "The 'Pool of Siloam' is where the blind man washed to receive sight.",
  "The 'Pool of Bethesda' had five porches.",
  "The 'Gate Beautiful' is where Peter healed a lame man.",
  "The 'Iron Gate' opened by itself for Peter in Acts.",
  "The 'Straight Street' is where Paul stayed in Damascus.",
  "The 'Areopagus' is the hill where Paul debated in Athens.",
  "The 'Island of Malta' is where Paul was shipwrecked.",
  "The 'Viper' bit Paul on Malta, but he suffered no harm.",
  "The 'Appian Way' was the road Paul traveled toward Rome.",
  "The 'Palace Guard' in Rome heard the Gospel from Paul.",
  "The 'Elect Lady' is the recipient of 2 John.",
  "The 'Gaius' mentioned in 3 John was a beloved friend of the Apostle John.",
  "The 'Nicolaitans' were a group rebuked in Revelation.",
  "The 'Laodiceans' were called 'lukewarm' by Jesus.",
  "The 'Philadelphians' were the church of 'brotherly love'.",
  "The 'Smyrna' church was warned of coming persecution.",
  "The 'Pergamum' church was where 'Satan’s throne' was.",
  "The 'Thyatira' church was warned about a woman named Jezebel.",
  "The 'Sardis' church had a reputation for being alive but was dead.",
  "The 'Mount of Beatitudes' overlooks the Sea of Galilee.",
  "The 'Field of Blood' (Akeldama) was bought with Judas’ silver.",
  "The 'Potter’s Field' was used to bury strangers.",
  "The 'Sanhedrin' was the Jewish high court of 70 men.",
  "The 'Pharisees' were known for strict adherence to the Law.",
  "The 'Sadducees' did not believe in the resurrection.",
  "The 'Scribes' were experts in the Law and the Scriptures.",
  "The 'Publicans' were tax collectors for the Roman Empire.",
  "The 'Centurion' at the cross said, 'Truly this was the Son of God'.",
  "The 'Cornelius' centurion was noted for his prayers and alms.",
  "The 'Berean' Christians were more noble for checking the Word.",
  "The phrase 'Fear not' appears 365 times, one for every day of the year."
    ];
      return trivias[dayOfYear % trivias.length];
    };
    
  if (!user) return <div className="loading-screen">Authenticating...</div>;
  return (
    <div className="dashboard-wrapper">
      <nav className="top-nav">
        <div className="nav-left">
          <div className="logo-small">⛪</div>
          <div className="church-title">
            <h4>Free Believers in Christ Fellowship Inc.</h4>
            <small>{role} Portal • Taguig City</small>
          </div>
        </div>
        <div className="nav-right">
          <div className="admin-info">
            <strong>{user.firstName} {user.lastName}</strong>
            <span style={{ color: '#60a5fa', fontSize: '11px', display: 'block' }}>{role}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="menu-bar">
          {visibleTabs.map(tab => (
            <button key={tab.id} className={`menu-item ${currentTab === tab.id ? 'active' : ''}`} onClick={() => setCurrentTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="view-container" style={{ padding: '20px' }}>
          {currentTab === 'dashboard' && (
            <>
              <div className="bulletin-board">
                {isLeader && (
                  <div style={leaderInputCard}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>📢 Update Bulletin Announcement</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        style={inputStyle} 
                        placeholder="Type a message for all members..." 
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                      />
                      <button onClick={postAnnouncement} style={postBtnStyle}>Sync Bulletin</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  <div style={bulletinCardStyle}>
                    <h2 style={{ color: '#1e3a8a', marginTop: 0 }}>Community Bulletin</h2>
                    <div style={announcementBoxStyle}>
                      <p>{announcement}</p>
                    </div>
                    
                    <div style={triviaBoxStyle}>
                      <small style={{ fontWeight: '800', color: '#b45309' }}>💡 DAILY TRIVIA</small>
                      <p style={{ margin: '5px 0 0 0', color: '#92400e' }}>{getTrivia()}</p>
                    </div>
                  </div>

                  <div style={{ ...bulletinCardStyle, background: '#1e293b', color: '#fff' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#94a3b8' }}>Next Gathering</h4>
                    {nextEvent ? (
                      <>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{nextEvent.title}</div>
                        <div style={{ margin: '10px 0', fontSize: '14px' }}>
                          📅 {new Date(nextEvent.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>📍 {nextEvent.location || 'Church Main Hall'}</div>
                      </>
                    ) : (
                      <p style={{ color: '#64748b' }}>Stay tuned for upcoming events!</p>
                    )}
                  </div>
                </div>
              </div>

              <div style={quoteContainerStyle}>
                <div style={quoteIconStyle}>"</div>
                <p style={quoteTextStyle}>{dailyVerse.text}</p>
                <cite style={quoteAuthorStyle}>— {dailyVerse.reference}</cite>
              </div>
            </>
          )}

          {currentTab === 'ebible' && <EBible />}
          {currentTab === 'members' && role === 'Admin' && <MemberForm />}
          {currentTab === 'events' && <EventTab role={role} userId={user._id} />}
          {currentTab === 'attendance' && <AttendanceTab role={role} userId={user._id} user={user} />}
          {currentTab === 'ministries' && <Ministries role={role} />}
          {currentTab === 'prayers' && <Prayers role={role} user={user} />}
          {currentTab === 'analytics' && isLeader && <Analytics />}
        </div>
      </div>
    </div>
  );
};

const bulletinCardStyle = { background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const announcementBoxStyle = { background: '#f8fafc', padding: '25px', borderRadius: '16px', borderLeft: '5px solid #3b82f6', fontSize: '19px', color: '#1e293b', margin: '20px 0' };
const triviaBoxStyle = { marginTop: '20px', padding: '15px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' };
const leaderInputCard = { background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '2px solid #bfdbfe', marginBottom: '20px' };
const inputStyle = { flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' };
const postBtnStyle = { background: '#2563eb', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const quoteContainerStyle = { marginTop: '30px', padding: '40px', background: '#f1f5f9', borderRadius: '24px', textAlign: 'center', position: 'relative' };
const quoteIconStyle = { fontSize: '50px', color: '#cbd5e1', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const quoteTextStyle = { fontSize: '18px', fontStyle: 'italic', color: '#334155', position: 'relative', zIndex: 1 };
const quoteAuthorStyle = { display: 'block', marginTop: '15px', fontWeight: 'bold', color: '#64748b' };

export default Dashboard;