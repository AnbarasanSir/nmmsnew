# 🎓 NMMS Quiz Portal (என்.எம்.எம்.எஸ் வினா வங்கி)

A modern, responsive, high-performance **bilingual (தமிழ் / English)** quiz and exam preparation web application for the **National Means-cum-Merit Scholarship (NMMS)** examination, featuring **11,640+ questions** across 150 units and previous year question papers.

---

## 🌟 Highlights & Features

- **11,640+ Questions**: Exhaustive coverage of the complete NMMS syllabus.
- **Bilingual Interface**: Seamless toggle between **தமிழ் (Tamil)** and **English** (with side-by-side bilingual option).
- **5 Major Learning Modules**:
  1. 🧠 **Mental Ability Test (MAT)**: 35 Units, 1,075 questions (Number Series, Analogy, Venn Diagrams, Coding, Dice, Figures, etc.)
  2. 📐 **SAT - Mathematics**: 23 Units, 2,940 questions (Integers, Decimals, Algebra, Mensuration, Geometry, Statistics, etc.)
  3. 🔬 **SAT - Science**: 28 Units, 2,666 questions (Class 7 & 8 Physics, Chemistry, and Biology from Samacheer Kalvi)
  4. 🌍 **SAT - Social Science**: 46 Units, 3,340 questions (History, Geography, Civics, Economics)
  5. 📜 **Previous Year Question Papers (PYQ)**: 18 official papers from **2017 to 2026** (Both MAT and SAT 90-question official papers).
- **Two Quiz Modes**:
  - ⚡ **Practice Mode (பயிற்சி முறை)**: Instant answer feedback (correct in green, mistakes in red), immediate step-by-step explanations, math equations, and diagrams.
  - ⏱️ **Exam Mode (தேர்வு முறை)**: Real exam simulation with countdown timer, question palette navigation, review flag, and comprehensive scorecard.
- **KaTeX LaTeX Math Rendering**: Fast, crisp rendering of mathematical expressions, fractions, superscripts, and formulas without distortion.
- **Diagrams & Lightbox Zoom**: Hundreds of diagrams for geometry, science, and MAT figure problems with click-to-zoom modal.
- **Question Bookmarking**: Save difficult questions with one click to review anytime in the Bookmarks hub.
- **Score Analytics & Retake**:
  - Circular conic-gradient score breakdown (Correct, Wrong, Skipped)
  - Re-attempt **only wrong questions** to master weak areas.
  - Full question-by-question review with filters.
- **100% Offline Ready**: Embedded fonts and self-contained KaTeX core for zero internet requirement in rural or low-connectivity schools.
- **Keyboard Shortcuts**: Use keys `1-4` or `A-D` to pick options, `Left/Right arrows` for navigation, and `F` to mark for review.

---

## 🚀 How to Run the Website

### Option 1: Fast Start with Node.js (Recommended)
Make sure Node.js is installed, then run in the project directory:

```bash
npm start
```
or
```bash
node server.js
```

Then open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Option 2: Run with Any Local HTTP Server
You can also use Python, VS Code Live Server, or `npx serve`:

```bash
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```

---

### Option 3: Deploy to GitHub Pages / Vercel / Netlify
The portal is built entirely with pure, standards-compliant HTML5, CSS3, and modern JavaScript with zero external build step.
Simply push this repository to GitHub and enable **GitHub Pages** from repository Settings, or deploy to Vercel/Netlify with one click!

---

## 📁 Project Structure

```
nmms/
├── assets/                     # 11,640+ questions and diagrams
│   ├── matquiz/                # MAT question JSONs and diagrams
│   ├── satmaths/               # SAT Maths question JSONs and diagrams
│   ├── satscience/             # SAT Science question JSONs
│   ├── satsocial/              # SAT Social Science question JSONs
│   └── pyq/                    # 2017-2026 Official Question Papers
├── css/
│   └── style.css               # Modern, accessible, dark/light theme CSS
├── js/
│   ├── metadata.js             # Catalog of all 150 units with bilingual titles
│   ├── image-map.js            # Smart image resolution dictionary
│   ├── quiz-engine.js          # Core quiz lifecycle, timer, KaTeX math typesetting
│   └── app.js                  # View routing, bookmarks, history, stats, audio
├── vendor/
│   └── katex/                  # Self-contained KaTeX CSS, JS, and WOFF2 fonts
├── server.js                   # Zero-dependency local Node.js HTTP server
├── package.json                # Project scripts
└── index.html                  # Main application single-page portal
```

---

## ⌨️ Keyboard Shortcuts (Inside Quiz Player)

| Key | Action |
| --- | --- |
| `1` or `A` | Select Option A |
| `2` or `B` | Select Option B |
| `3` or `C` | Select Option C |
| `4` or `D` | Select Option D |
| `→` or `PageDown` | Next Question |
| `←` or `PageUp` | Previous Question |
| `F` | Mark / Unmark for Review |

---

## 🎓 Exam Syllabus Covered

- **MAT (Mental Ability Test)**: Number Series, Letter Series, Number Analogy, Word Analogy, Odd One Out, Counting Figures, Logical Venn Diagrams, Coding-Decoding, Missing Figures, Word Formation, Dictionary Order, Number Matrix, Mathematical Operations, Equations, Blood Relations, Direction Sense, Calendar, Seating Order, Dice & Cube, Figure Series, Mirror/Water Images, Embedded Figures.
- **SAT (Scholastic Aptitude Test)**:
  - **Mathematics**: Integers, Decimals, Fractions, Rational Numbers, Exponents, Mensuration (Area & Perimeter), Circles, Algebra, Identities, Ratio & Proportion, Percentage, Simple Interest, Geometry, Congruence, Statistics, Data Interpretation.
  - **Science**: Class 7 & 8 Samacheer Kalvi Physics, Chemistry, Biology (Measurement, Force & Motion, Matter, Atoms, Plant Reproduction, Health, Heat, Electricity, Changes, Cell Biology, Light, Space, Polymers, Sound, Air, Water, Acids & Bases, Microorganisms, Adolescence).
  - **Social Science**: Class 7 & 8 History (Cholas, Pandyas, Delhi Sultanate, Mughals, Marathas, Advent of Europeans, People's Revolt), Geography (Interior of Earth, Landforms, Population, Continents, Rocks, Weather, Migration, Hazards, Industries), Civics & Economics (Equality, Political Parties, Production, State Govt, Democracy, Women Empowerment, Consumer Protection, Secularism, Human Rights, Road Safety, Money & Savings).
