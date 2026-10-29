const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'assets');

const matTitles = {
    1: { ta: 'எண் தொடர்', en: 'Number Series' },
    2: { ta: 'எழுத்துத் தொடர்', en: 'Letter Series' },
    3: { ta: 'எண் ஒப்புமை', en: 'Number Analogy' },
    4: { ta: 'வார்த்தை ஒப்புமை', en: 'Word Analogy' },
    5: { ta: 'பொருந்தாத எண்', en: 'Odd One Out - Numbers' },
    6: { ta: 'பொருந்தாத வார்த்தை', en: 'Odd One Out - Words' },
    7: { ta: 'உருவங்களை எண்ணுதல்', en: 'Counting Figures' },
    8: { ta: 'தர்க்கரீதியான வென் படம்', en: 'Logical Venn Diagrams' },
    9: { ta: 'குறியீட்டு மொழி (எண்கள்)', en: 'Coding-Decoding (Numbers)' },
    10: { ta: 'குறியீட்டு மொழி (சொற்கள்)', en: 'Coding-Decoding (Words)' },
    11: { ta: 'படங்களில் விடுபட்ட எண்', en: 'Missing Number in Figures' },
    12: { ta: 'படங்களில் விடுபட்ட எழுத்து', en: 'Missing Letter in Figures' },
    13: { ta: 'வென் வரைபடப் பகுப்பாய்வு', en: 'Venn Diagram Analysis' },
    14: { ta: 'வார்த்தை உருவாக்கம்', en: 'Word Formation' },
    15: { ta: 'உருவாக்க இயலாத வார்த்தை', en: 'Words Cannot be Formed' },
    16: { ta: 'ஆங்கில அகராதி வரிசை', en: 'Alphabetical / Dictionary Order' },
    17: { ta: 'எண் அணி', en: 'Number Matrix' },
    18: { ta: 'கணிதக் குறியீடுகள்', en: 'Mathematical Operations' },
    19: { ta: 'தவறான எண் கண்டறிதல்', en: 'Wrong Number in Series' },
    20: { ta: 'எளிய சமன்பாடுகள் & எண்கணிதம்', en: 'Simple Equations & Arithmetic' },
    21: { ta: 'வரிசைப்படுத்துதல் & தர்க்கம்', en: 'Sequencing & Logic' },
    22: { ta: 'இரத்த உறவுகள்', en: 'Blood Relations' },
    23: { ta: 'திசை அறிதல்', en: 'Direction Sense Test' },
    24: { ta: 'நாள்காட்டி கணக்குகள்', en: 'Calendar Problems' },
    25: { ta: 'தரவரிசை & இருக்கை அமைப்பு', en: 'Ranking & Seating Order' },
    26: { ta: 'தேர்வு தரவரிசை', en: 'Class Ranking & Position' },
    27: { ta: 'பொருள் வரிசைப்படுத்துதல்', en: 'Logical Order of Words' },
    28: { ta: 'பகடை கணக்குகள்', en: 'Dice Problems' },
    29: { ta: 'கனசதுரம் & விரிந்த பகடை', en: 'Cube & Open Dice' },
    30: { ta: 'படத் தொடர்', en: 'Figure Series' },
    31: { ta: 'பட ஒப்புமை', en: 'Figure Analogy' },
    32: { ta: 'பொருந்தாத படம்', en: 'Odd Figure Out' },
    34: { ta: 'நீர் பிம்பம் & கண்ணாடி பிம்பம்', en: 'Water & Mirror Images' },
    35: { ta: 'உட்பொதிந்த உருவங்கள்', en: 'Embedded Figures' },
    36: { ta: 'விடுபட்ட படப் பகுதி', en: 'Pattern Completion' }
};

const satMathsTitles = {
    1: { ta: 'முழுக்கள்', en: 'Integers' },
    2: { ta: 'தசம எண்கள்', en: 'Decimal Numbers' },
    3: { ta: 'தசம எண்களின் செயல்பாடுகள்', en: 'Operations on Decimals' },
    4: { ta: 'விகிதமுறு எண்கள் & அடுக்குகள்', en: 'Rational Numbers & Exponents' },
    5: { ta: 'அளவியல் - சுற்றளவு & பரப்பளவு', en: 'Mensuration - Perimeter & Area' },
    6: { ta: 'வட்டம் மற்றும் வட்டக்கோணப்பகுதி', en: 'Circle & Circular Sectors' },
    7: { ta: 'வட்டத்தின் பரிதி மற்றும் பரப்பளவு', en: 'Circumference & Area of Circles' },
    8: { ta: 'இயற்கணிதம் - மாறிகள் & கோவைகள்', en: 'Algebra - Variables & Expressions' },
    9: { ta: 'அடுக்குகள் மற்றும் படிகள்', en: 'Exponents and Powers' },
    10: { ta: 'இயற்கணித முற்றொருமைகள்', en: 'Algebraic Identities' },
    11: { ta: 'இயற்கணிதக் கோவைகள்', en: 'Algebraic Expressions' },
    12: { ta: 'விகிதம் மற்றும் விகிதசமம்', en: 'Ratio & Proportion' },
    13: { ta: 'சதவீதம்', en: 'Percentage' },
    14: { ta: 'சதவீதமும் தனிவட்டியும்', en: 'Percentage & Simple Interest' },
    15: { ta: 'வடிவியல் - கோடுகள் மற்றும் கோணங்கள்', en: 'Geometry - Lines & Angles' },
    16: { ta: 'முக்கோணங்கள் மற்றும் பண்புகள்', en: 'Triangles & Properties' },
    17: { ta: 'சமச்சீர்த்தன்மை', en: 'Symmetry' },
    18: { ta: 'வடிவியல் - முக்கோணங்களின் ஒருங்கிசைவு', en: 'Congruence & Advanced Geometry' },
    19: { ta: 'புள்ளியியல் (சராசரி, இடைநிலை, முகடு)', en: 'Statistics (Mean, Median, Mode)' },
    20: { ta: 'தகவல் செயலாக்கம் - வரைபடங்கள்', en: 'Information Processing - Graphs' },
    21: { ta: 'அட்டவணை மற்றும் தரவு விளக்கம்', en: 'Tables & Data Interpretation' },
    22: { ta: 'செயல்வழிப் படம்', en: 'Flowcharts & Algorithms' },
    23: { ta: 'வடிவங்களை எண்ணுதல் & புதிர்கள்', en: 'Counting Geometric Figures & Puzzles' }
};

const satScienceTitles = {
    1: { ta: 'அளவீட்டியல்', en: 'Measurement' },
    2: { ta: 'விசையும் இயக்கமும்', en: 'Force and Motion' },
    3: { ta: 'நம்மைச் சுற்றியுள்ள பருப்பொருள்கள்', en: 'Matter Around Us' },
    4: { ta: 'அணு அமைப்பு', en: 'Atomic Structure' },
    5: { ta: 'தாவரங்களின் இனப்பெருக்கம் & மாற்றுருக்கள்', en: 'Reproduction and Modification in Plants' },
    6: { ta: 'உடல் நலமும் சுகாதாரமும்', en: 'Health and Hygiene' },
    7: { ta: 'காட்சித் தொடர்பு (கணினி)', en: 'Visual Communication' },
    8: { ta: 'வெப்பம் மற்றும் வெப்பநிலை', en: 'Heat and Temperature' },
    9: { ta: 'மின்னியல்', en: 'Electricity' },
    10: { ta: 'நம்மைச் சுற்றி நிகழும் மாற்றங்கள்', en: 'Changes Around Us' },
    11: { ta: 'செல் உயிரியல்', en: 'Cell Biology' },
    12: { ta: 'வகைப்பாட்டியலின் அடிப்படைகள்', en: 'Basis of Classification' },
    13: { ta: 'கணினி வரைகலை (டக்ஸ் பெயிண்ட்)', en: 'Digital Painting & Computer Graphics' },
    14: { ta: 'ஒளியியல்', en: 'Light' },
    15: { ta: 'அண்டம் மற்றும் விண்வெளி', en: 'Universe and Space' },
    16: { ta: 'பலபடி வேதியியல்', en: 'Polymer Chemistry' },
    17: { ta: 'அன்றாட வாழ்வில் வேதியியல்', en: 'Chemistry in Daily Life' },
    18: { ta: 'அன்றாட வாழ்வில் விலங்குகள்', en: 'Animals in Daily Life' },
    19: { ta: 'காட்சித் தொடர்பு - லிப்ரே ஆபீஸ்', en: 'Visual Communication - Office Tools' },
    20: { ta: 'ஒலியியல்', en: 'Sound' },
    21: { ta: 'காற்று', en: 'Air' },
    22: { ta: 'நீர்', en: 'Water' },
    23: { ta: 'அமிலங்கள் மற்றும் காரங்கள்', en: 'Acids and Bases' },
    24: { ta: 'நுண்ணுயிரிகள்', en: 'Microorganisms' },
    25: { ta: 'தாவர உலகம்', en: 'Plant Kingdom' },
    26: { ta: 'உயிரினங்களின் ஒருங்கமைவு', en: 'Organization of Life' },
    27: { ta: 'விலங்குகளின் இயக்கம்', en: 'Movements in Animals' },
    28: { ta: 'வளரிளம் பருவமடைதல்', en: 'Reaching the Age of Adolescence' }
};

const satSocialTitles = {
    1: { ta: 'இடைக்கால இந்திய வரலாற்று ஆதாரங்கள்', en: 'Sources of Medieval India' },
    2: { ta: 'வட இந்தியப் புதிய அரசுகளின் தோற்றம்', en: 'Emergence of New Kingdoms in North India' },
    3: { ta: 'தென்னிந்தியப் புதிய அரசுகள்: பிற்காலச் சோழர்கள் & பாண்டியர்கள்', en: 'The Later Cholas and Pandyas' },
    4: { ta: 'டெல்லி சுல்தானியம்', en: 'The Delhi Sultanate' },
    5: { ta: 'புவியின் உள்ளமைப்பு', en: 'Interior of the Earth' },
    6: { ta: 'நிலத்தோற்றங்கள்', en: 'Landforms' },
    7: { ta: 'மக்கள் தொகையும் குடியிருப்புகளும்', en: 'Population and Settlement' },
    8: { ta: 'சமத்துவம்', en: 'Equality' },
    9: { ta: 'அரசியல் கட்சிகள்', en: 'Political Parties' },
    10: { ta: 'உற்பத்தி', en: 'Production' },
    11: { ta: 'விஜயநகர், பாமினி அரசுகள்', en: 'Vijayanagar and Bahmani Kingdoms' },
    12: { ta: 'முகலாயப் பேரரசு', en: 'Mughal Empire' },
    13: { ta: 'மராத்தியர்கள் மற்றும் பேஷ்வாக்களின் எழுச்சி', en: 'Rise of Marathas and Peshwas' },
    14: { ta: 'வளங்கள்', en: 'Resources' },
    15: { ta: 'சுற்றுலா', en: 'Tourism' },
    16: { ta: 'மாநில அரசு', en: 'State Government' },
    17: { ta: 'ஊடகமும் ஜனநாயகமும்', en: 'Media and Democracy' },
    18: { ta: 'புதிய சமயக் கருத்துக்களும் இயக்கங்களும்', en: 'New Religious Ideas and Movements' },
    19: { ta: 'தமிழ்நாட்டில் கலையும் கட்டிடக்கலையும்', en: 'Art and Architecture of Tamil Nadu' },
    20: { ta: 'தமிழகத்தில் சமணம், பௌத்தம், ஆசீவகக் கோட்பாடுகள்', en: 'Jainism, Buddhism and Ajivika in TN' },
    21: { ta: 'வட அமெரிக்கா மற்றும் தென் அமெரிக்கா', en: 'North America and South America' },
    22: { ta: 'நிலவரைபடத்தை கற்றறிதல்', en: 'Map Reading' },
    23: { ta: 'இயற்கை இடர்கள் - பேரிடர் மேலாண்மை', en: 'Natural Hazards & Disaster Management' },
    24: { ta: 'பெண்கள் மேம்பாடு', en: 'Women Empowerment' },
    25: { ta: 'சந்தை மற்றும் நுகர்வோர் பாதுகாப்பு', en: 'Market and Consumer Protection' },
    26: { ta: 'சாலைப் பாதுகாப்பு', en: 'Road Safety' },
    27: { ta: 'வரி மற்றும் அதன் முக்கியத்துவம்', en: 'Tax and its Importance' },
    28: { ta: 'ஐரோப்பியர்களின் வருகை', en: 'Advent of the Europeans' },
    29: { ta: 'வர்த்தகத்திலிருந்து பேரரசு வரை', en: 'From Trade to Territory' },
    30: { ta: 'கிராம சமூகமும் வாழ்க்கை முறையும்', en: 'Rural Life and Society' },
    31: { ta: 'மக்கள் புரட்சி', en: 'People\'s Revolt' },
    32: { ta: 'இந்தியாவில் கல்வி வளர்ச்சி', en: 'Educational Development in India' },
    33: { ta: 'இந்தியாவில் தொழிலகங்களின் வளர்ச்சி', en: 'Development of Industries in India' },
    34: { ta: 'ஆங்கிலேயர் ஆட்சியில் நகர்ப்புற மாற்றங்கள்', en: 'Urban Changes during British Period' },
    35: { ta: 'பாறை மற்றும் மண்', en: 'Rocks and Soils' },
    36: { ta: 'வானிலையும் காலநிலையும்', en: 'Weather and Climate' },
    37: { ta: 'நீரியல் சுழற்சி', en: 'Hydrologic Cycle' },
    38: { ta: 'இடம்பெயர்தல் மற்றும் நகரமயமாதல்', en: 'Migration and Urbanisation' },
    39: { ta: 'இடர்கள்', en: 'Hazards' },
    40: { ta: 'தொழிலகங்கள்', en: 'Industries' },
    41: { ta: 'ஆப்பிரிக்கா, ஆஸ்திரேலியா மற்றும் அண்டார்டிகா', en: 'Africa, Australia and Antarctica' },
    42: { ta: 'புவிப்படங்களைக் கற்றறிதல்', en: 'Map Reading & Interpretation' },
    43: { ta: 'சமயச்சார்பின்மையைப் புரிந்துகொள்ளுதல்', en: 'Understanding Secularism' },
    44: { ta: 'மனித உரிமைகளும் ஐக்கிய நாடுகள் சபையும்', en: 'Human Rights and the UNO' },
    45: { ta: 'சாலை பாதுகாப்பு விதிகள் மற்றும் நெறிமுறைகள்', en: 'Road Safety Rules and Regulations' },
    46: { ta: 'பணம், சேமிப்பு மற்றும் முதலீடுகள்', en: 'Money, Savings and Investments' }
};

const catalog = {
    subjects: {
        matquiz: {
            id: 'matquiz',
            nameTa: 'மனத்திறன் தேர்வு (MAT)',
            nameEn: 'Mental Ability Test (MAT)',
            shortName: 'MAT',
            icon: '🧠',
            theme: '#8b5cf6',
            gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            badgeBg: 'rgba(139, 92, 246, 0.15)',
            badgeColor: '#7c3aed',
            descriptionTa: 'எண் தொடர், ஒப்புமை, வென் படம், பகடை உள்ளிட்ட 35 தலைப்புகள்',
            descriptionEn: '35 Units covering Number series, Analogy, Venn diagrams, Dice & more',
            totalQuestions: 0,
            units: []
        },
        satmaths: {
            id: 'satmaths',
            nameTa: 'SAT - கணிதம்',
            nameEn: 'SAT - Mathematics',
            shortName: 'SAT Maths',
            icon: '📐',
            theme: '#3b82f6',
            gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
            badgeBg: 'rgba(59, 130, 246, 0.15)',
            badgeColor: '#2563eb',
            descriptionTa: 'முழுக்கள், தசமங்கள், இயற்கணிதம், அளவியல் உள்ளிட்ட 23 அலகுகள்',
            descriptionEn: '23 Units covering Integers, Algebra, Mensuration, Geometry & more',
            totalQuestions: 0,
            units: []
        },
        satscience: {
            id: 'satscience',
            nameTa: 'SAT - அறிவியல்',
            nameEn: 'SAT - Science',
            shortName: 'SAT Science',
            icon: '🔬',
            theme: '#10b981',
            gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
            badgeBg: 'rgba(16, 185, 129, 0.15)',
            badgeColor: '#059669',
            descriptionTa: '7 மற்றும் 8 ஆம் வகுப்பு இயற்பியல், வேதியியல், உயிரியல் (28 அலகுகள்)',
            descriptionEn: 'Class 7 & 8 Physics, Chemistry, and Biology (28 Units)',
            totalQuestions: 0,
            units: []
        },
        satsocial: {
            id: 'satsocial',
            nameTa: 'SAT - சமூக அறிவியல்',
            nameEn: 'SAT - Social Science',
            shortName: 'SAT Social',
            icon: '🌍',
            theme: '#f59e0b',
            gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
            badgeBg: 'rgba(245, 158, 11, 0.15)',
            badgeColor: '#d97706',
            descriptionTa: 'வரலாறு, புவியியல், குடிமையியல், பொருளியல் (46 அலகுகள்)',
            descriptionEn: 'Class 7 & 8 History, Geography, Civics, Economics (46 Units)',
            totalQuestions: 0,
            units: []
        },
        pyq: {
            id: 'pyq',
            nameTa: 'முந்தைய ஆண்டு வினாத்தாள்கள் (PYQ)',
            nameEn: 'Previous Year Question Papers (PYQ)',
            shortName: 'PYQ (2017-2026)',
            icon: '📜',
            theme: '#ec4899',
            gradient: 'linear-gradient(135deg, #db2777 0%, #f472b6 100%)',
            badgeBg: 'rgba(236, 72, 153, 0.15)',
            badgeColor: '#db2777',
            descriptionTa: '2017 முதல் 2026 வரையிலான 18 அதிகாரப்பூர்வ தேர்வு தாள்கள் (MAT & SAT)',
            descriptionEn: '18 Official Exam Question Papers from 2017 to 2026 (MAT & SAT)',
            totalQuestions: 0,
            units: []
        }
    }
};

// Process Units
function processSection(secId, titleMap) {
    const secDir = path.join(base, secId, 'data');
    if (!fs.existsSync(secDir)) return;
    const files = fs.readdirSync(secDir).filter(f => f.endsWith('.json')).sort((a,b) => {
        return (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0);
    });

    for (const file of files) {
        const uNum = parseInt(file.replace(/\D/g, ''));
        const fullPath = path.join(secDir, file);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const titles = titleMap[uNum] || { ta: 'அலகு ' + uNum, en: 'Unit ' + uNum };
        const hasImages = data.some(q => q.image || q.explanationImage);
        
        catalog.subjects[secId].totalQuestions += data.length;
        catalog.subjects[secId].units.push({
            id: file.replace('.json', ''),
            file: 'assets/' + secId + '/data/' + file,
            unitNumber: uNum,
            titleTa: titles.ta,
            titleEn: titles.en,
            questionCount: data.length,
            hasImages: hasImages,
            sample: (data[0].question || '').slice(0, 80).replace(/\n/g, ' ')
        });
    }
}

// Process PYQ
function processPYQ() {
    const secDir = path.join(base, 'pyq', 'data');
    if (!fs.existsSync(secDir)) return;
    const files = fs.readdirSync(secDir).filter(f => f.endsWith('.json')).sort((a, b) => {
        const yearA = parseInt(a.replace(/\D/g, '')) || 0;
        const yearB = parseInt(b.replace(/\D/g, '')) || 0;
        if (yearA !== yearB) return yearB - yearA; // Latest first!
        return a.localeCompare(b);
    });

    for (const file of files) {
        const fullPath = path.join(secDir, file);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const isMAT = file.startsWith('mat');
        const year = file.replace(/\D/g, '');
        const paperType = isMAT ? 'MAT (மனத்திறன் தேர்வு)' : 'SAT (படிப்பறிவுத் தேர்வு)';
        const paperTypeEn = isMAT ? 'MAT (Mental Ability Test)' : 'SAT (Scholastic Aptitude Test)';
        const hasImages = data.some(q => q.image || q.explanationImage);

        catalog.subjects.pyq.totalQuestions += data.length;
        catalog.subjects.pyq.units.push({
            id: file.replace('.json', ''),
            file: 'assets/pyq/data/' + file,
            year: parseInt(year),
            type: isMAT ? 'MAT' : 'SAT',
            titleTa: year + ' - NMMS ' + paperType,
            titleEn: year + ' - NMMS ' + paperTypeEn,
            questionCount: data.length,
            hasImages: hasImages,
            sample: (data[0].question || '').slice(0, 80).replace(/\n/g, ' ')
        });
    }
}

processSection('matquiz', matTitles);
processSection('satmaths', satMathsTitles);
processSection('satscience', satScienceTitles);
processSection('satsocial', satSocialTitles);
processPYQ();

let grandTotal = 0;
for (const k of Object.keys(catalog.subjects)) {
    grandTotal += catalog.subjects[k].totalQuestions;
    console.log(k, 'Units:', catalog.subjects[k].units.length, 'Questions:', catalog.subjects[k].totalQuestions);
}
console.log('GRAND TOTAL QUESTIONS:', grandTotal);

const jsDir = path.join(__dirname, 'js');
fs.mkdirSync(jsDir, { recursive: true });
fs.writeFileSync(path.join(jsDir, 'metadata.js'), 'window.NMMS_CATALOG = ' + JSON.stringify(catalog, null, 2) + ';\n');
console.log('Wrote js/metadata.js successfully!');
