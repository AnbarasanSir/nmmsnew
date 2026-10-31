/**
 * NMMS Quiz Portal - Main Application Controller
 * Supports multi-tier question loading (CORS-free for file:// and web servers)
 */

class NMMSApp {
    constructor() {
        this.currentView = 'home';
        this.selectedSubjectId = null;
        this.selectedUnit = null;
        this.quizEngine = new QuizEngine();
        this.currentResults = null;
        this.theme = localStorage.getItem('nmms_theme') || 'light';
        this.language = localStorage.getItem('nmms_lang') || 'ta'; // 'ta', 'en', 'both'
        this.soundEnabled = localStorage.getItem('nmms_sound') !== 'false';

        // Cached questions data by file path: { 'assets/...': [...] }
        this.dataCache = {};

        // Sound synthesizer
        this.audioCtx = null;

        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.applyLanguage(this.language);
        this.renderHome();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupSwipeNavigation();
        this.updateUserStatsDisplay();

        // Seed initial history state for Home page so exit confirmation can be prompted on back
        try {
            history.replaceState({ view: 'home_base' }, '');
            history.pushState({ view: 'home' }, '');
        } catch (e) {}
    }

    // ==========================================
    // THEME & LANGUAGE MANAGEMENT
    // ==========================================
    applyTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('nmms_theme', theme);
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    toggleTheme() {
        this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    }

    applyLanguage(lang) {
        this.language = lang;
        localStorage.setItem('nmms_lang', lang);

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Re-render current view if in subject or arena
        if (this.currentView === 'arena') {
            this.renderCurrentQuestion();
        } else if (this.currentView === 'subject') {
            this.renderSubjectExplorer(this.selectedSubjectId);
        } else if (this.currentView === 'home') {
            this.renderHome();
        }
    }

    // ==========================================
    // VIEW ROUTING
    // ==========================================
    showView(viewId) {
        // Prevent accidental exit from active quiz
        if (this.currentView === 'arena' && viewId !== 'arena' && viewId !== 'results' && !this.quizEngine.isCompleted) {
            const confirmMsg = this.language === 'en' 
                ? 'Are you sure you want to exit the NMMS exam?' 
                : 'NMMS தேர்விலிருந்து வெளியேற விரும்புகிறீர்களா?';
            if (!confirm(confirmMsg)) {
                return;
            }
            this.quizEngine.stopTimer();
        }

        this.currentView = viewId;
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.remove('active');
        });

        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Manage Bottom Tab Bar and Header for Arena mode vs Standard views
        const tabbar = document.getElementById('bottom-tab-bar');
        const header = document.getElementById('app-header');

        if (viewId === 'arena') {
            document.body.classList.add('in-arena-mode');
            if (tabbar) tabbar.classList.add('hidden');
            if (header) header.style.display = 'none';

            // Push history state to intercept browser back button
            try {
                history.pushState({ inQuiz: true }, '');
            } catch (e) {}
        } else {
            document.body.classList.remove('in-arena-mode');
            if (tabbar) tabbar.classList.remove('hidden');
            if (header) header.style.display = '';

            try {
                history.pushState({ view: viewId }, '');
            } catch (e) {}

            // Update bottom tab bar active states
            const homeTab = document.getElementById('tab-home');
            const bmarkTab = document.getElementById('btn-view-bookmarks');
            const histTab = document.getElementById('btn-view-history');

            if (homeTab) homeTab.classList.toggle('active', viewId === 'home');
            if (bmarkTab) bmarkTab.classList.toggle('active', viewId === 'bookmarks');
            if (histTab) histTab.classList.toggle('active', viewId === 'history');
        }
    }

    // ==========================================
    // LOCAL STORAGE & STATS
    // ==========================================
    getStats() {
        const stats = localStorage.getItem('nmms_user_stats');
        return stats ? JSON.parse(stats) : {
            testsTaken: 0,
            questionsAnswered: 0,
            correctCount: 0,
            streakDays: 1,
            lastActiveDate: new Date().toISOString().split('T')[0]
        };
    }

    saveStats(stats) {
        localStorage.setItem('nmms_user_stats', JSON.stringify(stats));
        this.updateUserStatsDisplay();
    }

    recordQuizStats(results) {
        const stats = this.getStats();
        stats.testsTaken += 1;
        stats.questionsAnswered += (results.correctCount + results.wrongCount);
        stats.correctCount += results.correctCount;

        const today = new Date().toISOString().split('T')[0];
        if (stats.lastActiveDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (stats.lastActiveDate === yesterday) {
                stats.streakDays += 1;
            } else {
                stats.streakDays = 1;
            }
            stats.lastActiveDate = today;
        }

        this.saveStats(stats);
        this.saveHistoryRecord(results);
    }

    saveHistoryRecord(results) {
        const history = this.getHistory();
        history.unshift({
            id: 'h_' + Date.now(),
            date: new Date().toLocaleString(),
            subjectId: results.config.subjectId,
            unitTitle: results.config.unitTitle,
            mode: results.config.mode,
            score: results.correctCount,
            total: results.totalQuestions,
            percentage: results.percentage,
            timeElapsed: results.formattedTime
        });

        // Keep last 40 attempts
        if (history.length > 40) history.pop();
        localStorage.setItem('nmms_quiz_history', JSON.stringify(history));
    }

    getHistory() {
        const h = localStorage.getItem('nmms_quiz_history');
        return h ? JSON.parse(h) : [];
    }

    getBookmarks() {
        const b = localStorage.getItem('nmms_bookmarks');
        return b ? JSON.parse(b) : [];
    }

    isBookmarked(qId) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.uniqueId === qId);
    }

    toggleBookmark(question) {
        const bookmarks = this.getBookmarks();
        const uniqueId = `${this.quizEngine.config.subjectId}_${this.quizEngine.config.unitId}_${question.id}`;
        const existingIdx = bookmarks.findIndex(b => b.uniqueId === uniqueId);

        if (existingIdx >= 0) {
            bookmarks.splice(existingIdx, 1);
            this.showToast('Bookmark removed', 'info');
        } else {
            bookmarks.push({
                uniqueId: uniqueId,
                subjectId: this.quizEngine.config.subjectId,
                unitTitle: this.quizEngine.config.unitTitle,
                question: question,
                savedAt: new Date().toLocaleDateString()
            });
            this.showToast('Question saved to bookmarks!', 'success');
        }

        localStorage.setItem('nmms_bookmarks', JSON.stringify(bookmarks));
        this.updateBookmarkButtonState(question);
        this.updateUserStatsDisplay();
    }

    updateUserStatsDisplay() {
        const stats = this.getStats();
        const bookmarks = this.getBookmarks();

        const testsElem = document.getElementById('stat-tests-taken');
        const qElem = document.getElementById('stat-qs-answered');
        const accElem = document.getElementById('stat-accuracy');
        const streakElem = document.getElementById('stat-streak');
        const bmarkCountElem = document.getElementById('bmark-count-badge');

        const accuracy = stats.questionsAnswered > 0 
            ? Math.round((stats.correctCount / stats.questionsAnswered) * 100) 
            : 0;

        if (testsElem) testsElem.textContent = stats.testsTaken;
        if (qElem) qElem.textContent = stats.questionsAnswered;
        if (accElem) accElem.textContent = accuracy + '%';
        if (streakElem) streakElem.textContent = stats.streakDays + ' Day' + (stats.streakDays > 1 ? 's' : '');
        if (bmarkCountElem) bmarkCountElem.textContent = bookmarks.length;
    }

    // ==========================================
    // RENDER: HOME VIEW
    // ==========================================
    renderHome() {
        const subjectsGrid = document.getElementById('subjects-grid');
        if (!subjectsGrid || !window.NMMS_CATALOG) return;

        subjectsGrid.innerHTML = '';
        const subjects = window.NMMS_CATALOG.subjects;

        for (const [key, sub] of Object.entries(subjects)) {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.style.setProperty('--card-color', sub.theme);
            card.style.setProperty('--card-badge-bg', sub.badgeBg);

            const title = this.language === 'en' ? sub.nameEn : sub.nameTa;
            const subtitle = this.language === 'en' ? sub.nameTa : sub.nameEn;
            const desc = this.language === 'en' ? sub.descriptionEn : sub.descriptionTa;
            const unitsCountText = key === 'pyq' 
                ? (this.language === 'ta' ? `${sub.units.length} வினாத்தாள்கள்` : `${sub.units.length} Question Papers`)
                : (this.language === 'ta' ? `${sub.units.length} அலகுகள்` : `${sub.units.length} Units`);

            card.innerHTML = `
                <div class="subject-top-bar">
                    <div class="subject-icon-box">${sub.icon}</div>
                    <span class="subject-count-pill">${sub.totalQuestions.toLocaleString()} Qs</span>
                </div>
                <h3>${title}</h3>
                <div class="subject-subtitle">${subtitle}</div>
                <p class="subject-desc">${desc}</p>
                <div class="subject-footer">
                    <span class="subject-units-count">${unitsCountText}</span>
                    <span class="subject-enter-btn">
                        ${this.language === 'ta' ? 'பயிற்சியைத் தொடங்கு' : 'Explore Units'} →
                    </span>
                </div>
            `;

            card.addEventListener('click', () => {
                this.selectedSubjectId = key;
                this.renderSubjectExplorer(key);
                this.showView('subject');
            });

            subjectsGrid.appendChild(card);
        }
    }

    // ==========================================
    // RENDER: SUBJECT EXPLORER & UNITS
    // ==========================================
    renderSubjectExplorer(subjectId) {
        if (!window.NMMS_CATALOG || !window.NMMS_CATALOG.subjects[subjectId]) return;
        const sub = window.NMMS_CATALOG.subjects[subjectId];

        // Update banner
        const iconElem = document.getElementById('subject-banner-icon');
        const titleElem = document.getElementById('subject-banner-title');
        const descElem = document.getElementById('subject-banner-desc');
        const breadcrumbElem = document.getElementById('subject-breadcrumb-title');

        if (iconElem) {
            iconElem.textContent = sub.icon;
            iconElem.style.background = sub.badgeBg;
        }
        if (titleElem) titleElem.textContent = this.language === 'en' ? sub.nameEn : sub.nameTa;
        if (descElem) descElem.textContent = `${sub.units.length} ${this.language === 'ta' ? 'பகுதிகள்' : 'Sections'} • ${sub.totalQuestions} ${this.language === 'ta' ? 'வினாக்கள்' : 'Questions'}`;
        if (breadcrumbElem) breadcrumbElem.textContent = sub.shortName;

        // Render Unit cards
        this.renderFilteredUnits(sub.units, '');

        // Search listener
        const searchInput = document.getElementById('unit-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = (e) => {
                this.renderFilteredUnits(sub.units, e.target.value.trim().toLowerCase());
            };
        }
    }

    renderFilteredUnits(units, query) {
        const grid = document.getElementById('units-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const filtered = units.filter(u => {
            if (!query) return true;
            return (u.titleTa && u.titleTa.toLowerCase().includes(query)) ||
                   (u.titleEn && u.titleEn.toLowerCase().includes(query)) ||
                   (u.unitNumber && u.unitNumber.toString().includes(query)) ||
                   (u.year && u.year.toString().includes(query));
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
                    <p style="font-weight: 600;">${this.language === 'ta' ? 'பொருத்தமான அலகுகள் எதுவும் கிடைக்கவில்லை!' : 'No matching units found!'}</p>
                </div>
            `;
            return;
        }

        filtered.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-card';

            const title = this.language === 'en' ? unit.titleEn : unit.titleTa;
            const subTitle = this.language === 'en' ? unit.titleTa : unit.titleEn;
            const badgeLabel = unit.year ? unit.type : `Unit ${unit.unitNumber}`;

            card.innerHTML = `
                <div>
                    <div class="unit-card-header">
                        <span class="unit-number-badge">${badgeLabel}</span>
                        <div class="unit-badges-right">
                            ${unit.hasImages ? `<span class="badge-tag has-diagram">🖼️ Diagrams</span>` : ''}
                            <span class="badge-tag">${unit.questionCount} Qs</span>
                        </div>
                    </div>
                    <div class="unit-title-primary">${title}</div>
                    <div class="unit-title-secondary">${subTitle}</div>
                    <div class="unit-sample-snippet">${unit.sample}</div>
                </div>
                <div class="unit-card-footer">
                    <span class="unit-qs-count">📝 ${unit.questionCount} ${this.language === 'ta' ? 'வினாக்கள்' : 'Questions'}</span>
                    <button class="unit-start-btn">
                        ${this.language === 'ta' ? 'தொடங்கு' : 'Start'} ⚡
                    </button>
                </div>
            `;

            card.addEventListener('click', () => {
                this.openQuizSetupModal(this.selectedSubjectId, unit);
            });

            grid.appendChild(card);
        });
    }

    // ==========================================
    // QUIZ CONFIGURATION MODAL
    // ==========================================
    openQuizSetupModal(subjectId, unit) {
        this.selectedSubjectId = subjectId;
        this.selectedUnit = unit;

        const modal = document.getElementById('quiz-setup-modal');
        const titleElem = document.getElementById('setup-modal-title');
        const unitTitle = this.language === 'en' ? unit.titleEn : unit.titleTa;

        if (titleElem) titleElem.textContent = unitTitle;

        // Reset modal selections
        this.setupConfig = {
            mode: 'practice',
            count: Math.min(20, unit.questionCount),
            shuffleQuestions: true,
            shuffleOptions: false
        };

        this.updateSetupModalUI();
        if (modal) modal.classList.add('open');
    }

    closeQuizSetupModal() {
        const modal = document.getElementById('quiz-setup-modal');
        if (modal) modal.classList.remove('open');
    }

    updateSetupModalUI() {
        document.querySelectorAll('.mode-option-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.mode === this.setupConfig.mode);
        });

        document.querySelectorAll('.count-pill').forEach(pill => {
            const val = pill.dataset.count === 'all' ? this.selectedUnit.questionCount : parseInt(pill.dataset.count);
            pill.classList.toggle('active', val === this.setupConfig.count);
        });
    }

    async startQuizFromModal() {
        this.closeQuizSetupModal();
        await this.loadAndLaunchQuiz(this.selectedSubjectId, this.selectedUnit, this.setupConfig);
    }

    // ==========================================
    // SECURE API DATA LOADER
    // ==========================================
    async loadUnitQuestions(subjectId, unit) {
        const cleanUnit = unit.id || (unit.file ? unit.file.replace(/^.*[\\\/]/, '').replace(/\.json$/, '') : 'unit1');
        const cacheKey = `${subjectId}:${cleanUnit}`;

        // 1. In-memory dataCache
        if (this.dataCache[cacheKey]) {
            return this.dataCache[cacheKey];
        }

        // 2. Fetch sanitized questions from Secure Backend API
        const apiUrl = `/api/quiz/questions?subject=${encodeURIComponent(subjectId)}&unit=${encodeURIComponent(cleanUnit)}`;
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
                    this.dataCache[cacheKey] = data.questions;
                    return data.questions;
                }
            }
        } catch (apiErr) {
            console.warn('[NMMS] Secure API not reachable, falling back to local file fetch:', apiErr);
        }

        // 3. Fallback to direct file fetch (for static live server / offline testing)
        const filePath = unit.file || `assets/${subjectId}/data/${cleanUnit}.json`;
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                const rawData = await response.json();
                if (Array.isArray(rawData) && rawData.length > 0) {
                    this.dataCache[cacheKey] = rawData;
                    return rawData;
                }
            }
        } catch (fileErr) {
            console.warn('[NMMS] Direct file fetch failed:', fileErr);
        }

        throw new Error('Unable to load questions for ' + cleanUnit);
    }

    // ==========================================
    // LOAD DATA & LAUNCH QUIZ
    // ==========================================
    async loadAndLaunchQuiz(subjectId, unit, customConfig = {}) {
        this.showToast(this.language === 'ta' ? 'கேள்விகள் லோட் ஆகின்றன...' : 'Loading questions...', 'info');

        let questionsData = null;
        try {
            questionsData = await this.loadUnitQuestions(subjectId, unit);
        } catch (err) {
            console.error('Error loading questions:', err);
            this.showToast(this.language === 'ta' ? 'கேள்விகளை ஏற்றுவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' : 'Error loading questions. Please try again.', 'danger');
            return;
        }

        if (!questionsData || !Array.isArray(questionsData) || questionsData.length === 0) {
            this.showToast(this.language === 'ta' ? 'இந்த பகுதியில் கேள்விகள் கிடைக்கவில்லை!' : 'No questions found for this unit!', 'danger');
            return;
        }

        const unitTitle = this.language === 'en' ? unit.titleEn : unit.titleTa;

        const engineConfig = {
            subjectId: subjectId,
            unitId: unit.id,
            unitTitle: unitTitle,
            mode: customConfig.mode || 'practice',
            language: this.language,
            shuffleQuestions: customConfig.shuffleQuestions !== undefined ? customConfig.shuffleQuestions : true,
            shuffleOptions: customConfig.shuffleOptions !== undefined ? customConfig.shuffleOptions : false,
            limitCount: customConfig.count || unit.questionCount,
            timeLimitMinutes: customConfig.mode === 'exam' ? Math.ceil((customConfig.count || unit.questionCount) * 1.0) : 0
        };

        this.quizEngine.init(questionsData, engineConfig);

        // Bind callbacks
        this.quizEngine.onQuestionChange = (q, idx) => {
            this.renderCurrentQuestion();
            this.updatePaletteActiveState();
        };

        this.quizEngine.onTimerTick = (timeData) => {
            const timerElem = document.getElementById('quiz-timer-text');
            if (timerElem) {
                if (this.quizEngine.config.mode === 'exam') {
                    timerElem.textContent = timeData.formattedRemaining;
                    const box = document.getElementById('quiz-timer-box');
                    if (box) box.classList.toggle('warning', timeData.remaining < 120);
                } else {
                    timerElem.textContent = timeData.formattedElapsed;
                }
            }
        };

        this.quizEngine.onQuizComplete = (results) => {
            this.handleQuizFinished(results);
        };

        this.quizEngine.onSubmitExam = (autoSubmitted) => {
            this.submitExam(autoSubmitted);
        };

        this.setupPaletteUI();
        this.renderCurrentQuestion();
        this.showView('arena');
    }

    // ==========================================
    // RENDER: QUIZ ARENA
    // ==========================================
    setupPaletteUI() {
        const container = document.getElementById('palette-scroll-container');
        if (!container) return;
        container.innerHTML = '';

        this.quizEngine.questions.forEach((q, idx) => {
            const bubble = document.createElement('div');
            bubble.className = 'palette-item';
            bubble.id = `palette-bubble-${idx}`;
            bubble.textContent = idx + 1;
            bubble.onclick = () => {
                this.quizEngine.goToQuestion(idx);
            };
            container.appendChild(bubble);
        });

        this.updatePaletteActiveState();
    }

    updatePaletteActiveState() {
        const curr = this.quizEngine.currentIndex;

        this.quizEngine.questions.forEach((q, idx) => {
            const bubble = document.getElementById(`palette-bubble-${idx}`);
            if (!bubble) return;

            bubble.className = 'palette-item';
            if (idx === curr) bubble.classList.add('current');

            const ans = this.quizEngine.getAnswerStatus(idx);
            if (ans) {
                if (this.quizEngine.config.mode === 'practice') {
                    bubble.classList.add(ans.isCorrect ? 'correct' : 'wrong');
                } else {
                    bubble.classList.add('answered');
                }
            }

            if (this.quizEngine.flagged.has(idx)) {
                bubble.classList.add('flagged');
            }
        });

        // Scroll active bubble into view
        const activeBubble = document.getElementById(`palette-bubble-${curr}`);
        if (activeBubble) {
            activeBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // If full grid modal is open, refresh it as well
        const fullGridModal = document.getElementById('palette-grid-modal');
        if (fullGridModal && fullGridModal.classList.contains('open')) {
            this.renderFullPaletteGrid();
        }
    }

    openPaletteGridModal() {
        const modal = document.getElementById('palette-grid-modal');
        if (!modal) return;
        this.renderFullPaletteGrid();
        modal.classList.add('open');
    }

    closePaletteGridModal() {
        const modal = document.getElementById('palette-grid-modal');
        if (modal) modal.classList.remove('open');
    }

    renderFullPaletteGrid() {
        const grid = document.getElementById('palette-full-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const curr = this.quizEngine.currentIndex;

        this.quizEngine.questions.forEach((q, idx) => {
            const item = document.createElement('div');
            item.className = 'palette-full-item';
            item.textContent = idx + 1;

            if (idx === curr) item.classList.add('current');

            const ans = this.quizEngine.getAnswerStatus(idx);
            if (ans) {
                if (this.quizEngine.config.mode === 'practice') {
                    item.classList.add(ans.isCorrect ? 'correct' : 'wrong');
                } else {
                    item.classList.add('answered');
                }
            }

            if (this.quizEngine.flagged.has(idx)) {
                item.classList.add('flagged');
            }

            item.onclick = () => {
                this.quizEngine.goToQuestion(idx);
                this.closePaletteGridModal();
            };

            grid.appendChild(item);
        });
    }

    // Touch swipe navigation for mobile (Swipe left for Next, Swipe right for Prev)
    setupSwipeNavigation() {
        const arena = document.getElementById('view-arena');
        if (!arena) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        arena.addEventListener('touchstart', (e) => {
            if (this.currentView !== 'arena') return;
            if (e.target.closest('.palette-wrapper, .lightbox-modal, .modal-backdrop, .quiz-nav-footer, button, input')) return;
            const t = e.changedTouches[0];
            touchStartX = t.screenX;
            touchStartY = t.screenY;
            touchStartTime = Date.now();
        }, { passive: true });

        arena.addEventListener('touchend', (e) => {
            if (this.currentView !== 'arena') return;
            const t = e.changedTouches[0];
            const diffX = t.screenX - touchStartX;
            const diffY = t.screenY - touchStartY;
            const elapsed = Date.now() - touchStartTime;

            // Swipe threshold: faster than 450ms, distance > 45px, horizontal dominance
            if (elapsed < 450 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                if (diffX < 0) {
                    this.quizEngine.nextQuestion();
                } else {
                    this.quizEngine.prevQuestion();
                }
            }
        }, { passive: true });
    }

    renderCurrentQuestion() {
        const q = this.quizEngine.getCurrentQuestion();
        if (!q) return;

        const currIdx = this.quizEngine.currentIndex;
        const total = this.quizEngine.questions.length;

        // Top bar info
        const titleElem = document.getElementById('arena-unit-title');
        const modeElem = document.getElementById('arena-mode-pill');
        const countElem = document.getElementById('arena-question-counter');

        if (titleElem) titleElem.textContent = this.quizEngine.config.unitTitle;
        if (modeElem) {
            modeElem.textContent = this.quizEngine.config.mode === 'practice' 
                ? (this.language === 'ta' ? 'பயிற்சி முறை' : 'Practice Mode')
                : (this.language === 'ta' ? 'தேர்வு முறை' : 'Exam Mode');
        }
        if (countElem) {
            countElem.textContent = `Q ${currIdx + 1} / ${total}`;
        }

        // Bookmark button
        this.updateBookmarkButtonState(q);

        // Flag button
        const flagBtn = document.getElementById('btn-flag-question');
        if (flagBtn) {
            flagBtn.classList.toggle('active', this.quizEngine.flagged.has(currIdx));
        }

        // Question Text (Bilingual support)
        const qTextBox = document.getElementById('question-text-box');
        if (qTextBox) {
            let primaryText = '';
            let secondaryText = '';

            if (this.language === 'en') {
                primaryText = q.questionEn || q.questionTa;
            } else if (this.language === 'ta') {
                primaryText = q.questionTa || q.questionEn;
            } else {
                primaryText = q.questionTa;
                secondaryText = q.questionEn;
            }

            let html = primaryText;
            if (secondaryText && secondaryText !== primaryText) {
                html += `<div class="question-text-secondary">${secondaryText}</div>`;
            }

            qTextBox.innerHTML = html;
        }

        // Diagram / Image
        const imgBox = document.getElementById('question-image-box');
        const imgElem = document.getElementById('question-diagram-img');
        if (imgBox && imgElem) {
            if (q.image) {
                imgElem.src = q.image;
                imgElem.style.display = 'inline-block';
                imgBox.style.display = 'block';

                imgElem.onclick = () => this.openLightbox(q.image);
                imgElem.onerror = () => {
                    imgBox.style.display = 'none'; // gracefully hide if truly missing
                };
            } else {
                imgBox.style.display = 'none';
            }
        }

        // Options
        const optionsContainer = document.getElementById('options-grid');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            const ans = this.quizEngine.getAnswerStatus(currIdx);
            const isAnswered = ans !== null;
            const letters = ['A', 'B', 'C', 'D', 'E'];

            // Grid styling based on text length
            const hasLongText = q.options.some(o => (o.textTa && o.textTa.length > 25) || (o.textEn && o.textEn.length > 25));
            optionsContainer.className = 'options-grid' + (!hasLongText ? ' two-col' : '');

            q.options.forEach((opt, optIdx) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.setAttribute('data-option-index', optIdx);

                let optPrimary = this.language === 'en' ? (opt.textEn || opt.textTa) : (opt.textTa || opt.textEn);
                let optSecondary = this.language === 'both' ? (opt.textEn || '') : '';

                // Practice Mode feedback states
                if (this.quizEngine.config.mode === 'practice' && isAnswered) {
                    btn.classList.add('disabled');
                    if (optIdx === ans.selectedOptionIndex) {
                        btn.classList.add(opt.isCorrect ? 'correct' : 'wrong');
                    }
                    if (opt.isCorrect) {
                        btn.classList.add('correct');
                    }
                } else if (this.quizEngine.config.mode === 'exam' && isAnswered) {
                    if (optIdx === ans.selectedOptionIndex) {
                        btn.classList.add('selected');
                    }
                }

                btn.innerHTML = `
                    <div class="option-letter-badge">${letters[optIdx] || optIdx + 1}</div>
                    <div class="option-text-wrapper">
                        <span>${optPrimary}</span>
                        ${optSecondary ? `<span class="option-subtext">${optSecondary}</span>` : ''}
                    </div>
                    <div class="option-indicator">${opt.isCorrect ? '✓' : '✗'}</div>
                `;

                btn.onclick = () => {
                    this.handleOptionSelection(optIdx, btn);
                };

                optionsContainer.appendChild(btn);
            });
        }

        // Explanation Box (In Practice Mode, shown if answered)
        const expBox = document.getElementById('explanation-card');
        const expBody = document.getElementById('explanation-body');
        const expImg = document.getElementById('explanation-img');
        const expImgBox = document.getElementById('explanation-img-box');

        const ans = this.quizEngine.getAnswerStatus(currIdx);

        if (expBox && expBody) {
            if (this.quizEngine.config.mode === 'practice' && ans) {
                let expText = this.language === 'en' ? (q.explanationEn || q.explanationTa) : (q.explanationTa || q.explanationEn);
                if (this.language === 'both' && q.explanationEn && q.explanationEn !== q.explanationTa) {
                    expText = `${q.explanationTa}\n\n[EN]: ${q.explanationEn}`;
                }

                expBody.innerHTML = expText || (this.language === 'ta' ? 'விளக்கம் சேர்க்கப்படவில்லை.' : 'No detailed explanation provided.');
                
                if (q.explanationImage && expImg && expImgBox) {
                    expImg.src = q.explanationImage;
                    expImgBox.style.display = 'block';
                    expImg.onclick = () => this.openLightbox(q.explanationImage);
                } else if (expImgBox) {
                    expImgBox.style.display = 'none';
                }

                expBox.classList.add('show');
            } else {
                expBox.classList.remove('show');
            }
        }

        // Navigation button states
        const prevBtn = document.getElementById('btn-prev-question');
        const nextBtn = document.getElementById('btn-next-question');
        const submitBtn = document.getElementById('btn-submit-exam');

        if (prevBtn) {
            prevBtn.disabled = currIdx === 0;
            const prevLabel = this.language === 'en' ? 'Previous' : 'முந்தையது';
            prevBtn.innerHTML = `← <span>${prevLabel}</span>`;
        }

        if (nextBtn) {
            const nextLabel = this.language === 'en' ? 'Next' : 'அடுத்தது';
            nextBtn.innerHTML = `<span>${nextLabel}</span> →`;
        }

        if (submitBtn) {
            const submitLabel = this.language === 'en' ? 'Finish' : 'முடிக்க';
            submitBtn.innerHTML = `✓ <span>${submitLabel}</span>`;
        }

        // On the last question, show "முடிக்க" (Finish) instead of "அடுத்தது" (Next) in both modes
        if (currIdx === total - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (submitBtn) submitBtn.style.display = 'none';
        }

        // Render Math equations with KaTeX
        QuizEngine.renderMathInElement(document.getElementById('question-card'));
        QuizEngine.renderMathInElement(expBox);
    }

    async handleOptionSelection(optIdx, btnElement) {
        if (this.quizEngine.isCompleted) return;

        const q = this.quizEngine.getCurrentQuestion();
        if (!q) return;

        // In practice mode, once verified you can't change
        if (this.quizEngine.config.mode === 'practice' && this.quizEngine.userAnswers[this.quizEngine.currentIndex] !== undefined) {
            return;
        }

        // Exam Mode: Instant local response
        if (this.quizEngine.config.mode === 'exam') {
            this.quizEngine.selectOption(optIdx);
            this.playSound('click');
            this.renderCurrentQuestion();
            this.updatePaletteActiveState();
            return;
        }

        // Practice Mode: Check with server or local if already known
        const opt = q.options[optIdx];
        if (!opt) return;

        // If question already has known correct index (e.g. mistakes review)
        if (typeof q.correctOriginalIndex === 'number') {
            const result = this.quizEngine.selectOption(optIdx);
            if (result) {
                this.playSound(result.isCorrect ? 'correct' : 'wrong');
            }
            this.renderCurrentQuestion();
            this.updatePaletteActiveState();
            return;
        }

        // Record selection immediately for UI feedback
        this.quizEngine.selectOption(optIdx);
        if (btnElement) {
            btnElement.classList.add('selected');
        }

        try {
            const response = await fetch('/api/quiz/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: this.quizEngine.config.subjectId,
                    unit: this.quizEngine.config.unitId,
                    questionId: q.id,
                    selectedOptionIndex: opt.originalIndex
                })
            });

            if (response.ok) {
                const checkData = await response.json();
                if (checkData.success) {
                    this.quizEngine.applyServerCheck(this.quizEngine.currentIndex, checkData);
                    this.playSound(checkData.isCorrect ? 'correct' : 'wrong');
                    this.renderCurrentQuestion();
                    this.updatePaletteActiveState();
                    return;
                }
            }
        } catch (err) {
            console.warn('[NMMS] API check endpoint not reachable, checking local question:', err);
        }

        // Fallback for static/offline preview if question has local correct property
        if (typeof q.correct === 'number') {
            const checkData = {
                isCorrect: opt.originalIndex === q.correct,
                correctIndex: q.correct,
                explanation: q.explanation || q.explanation_en || '',
                explanation_en: q.explanation_en || q.explanation || '',
                explanationImage: q.explanationImage || null
            };
            this.quizEngine.applyServerCheck(this.quizEngine.currentIndex, checkData);
            this.playSound(checkData.isCorrect ? 'correct' : 'wrong');
        } else {
            this.showToast(this.language === 'ta' ? 'விடை சரிபார்ப்பில் பிழை ஏற்பட்டது!' : 'Error verifying answer with server!', 'danger');
        }

        this.renderCurrentQuestion();
        this.updatePaletteActiveState();
    }

    async submitExam(autoSubmitted = false) {
        if (this.quizEngine.isCompleted) return;

        this.showToast(this.language === 'ta' ? 'தேர்வு முடிவுகள் கணக்கிடப்படுகின்றன...' : 'Evaluating exam results...', 'info');

        // Check if all questions already have known answers (e.g. from local mistakes practice)
        const allQuestionsHaveAnswers = this.quizEngine.questions.every(q => typeof q.correctOriginalIndex === 'number');
        if (allQuestionsHaveAnswers) {
            this.quizEngine.submitQuiz(autoSubmitted);
            return;
        }

        const answers = {};
        this.quizEngine.questions.forEach((q, idx) => {
            const ans = this.quizEngine.userAnswers[idx];
            if (ans && ans.selectedOriginalIndex !== undefined) {
                answers[q.id] = ans.selectedOriginalIndex;
            }
        });
        const questionIds = this.quizEngine.questions.map(q => q.id);

        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: this.quizEngine.config.subjectId,
                    unit: this.quizEngine.config.unitId,
                    answers: answers,
                    questionIds: questionIds
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.results) {
                    this.quizEngine.applyExamResults(data.results, autoSubmitted);
                    return;
                }
            }
        } catch (err) {
            console.warn('[NMMS] API submit endpoint not reachable, evaluating locally:', err);
        }

        // Fallback evaluation
        this.quizEngine.submitQuiz(autoSubmitted);
    }

    updateBookmarkButtonState(question) {
        const btn = document.getElementById('btn-bookmark-question');
        if (!btn) return;
        const uniqueId = `${this.quizEngine.config.subjectId}_${this.quizEngine.config.unitId}_${question.id}`;
        const isSaved = this.isBookmarked(uniqueId);
        btn.classList.toggle('active', isSaved);
        btn.innerHTML = isSaved ? '★' : '☆';
        btn.onclick = () => this.toggleBookmark(question);
    }

    // ==========================================
    // RENDER: RESULTS VIEW
    // ==========================================
    handleQuizFinished(results) {
        this.currentResults = results;
        this.recordQuizStats(results);

        const trophyElem = document.getElementById('results-trophy');
        const titleElem = document.getElementById('results-title');
        const subtitleElem = document.getElementById('results-subtitle');

        const pct = results.percentage;
        let trophy = '🏆';
        let msgTa = 'அற்புதமான வெற்றி!';
        let msgEn = 'Outstanding Performance!';

        if (pct >= 85) {
            trophy = '🌟';
            msgTa = 'அபாரமான திறமை! தேர்வுக்கு நீங்கள் தயாராகிவிட்டீர்கள்!';
            msgEn = 'Brilliant! You are well prepared for the exam!';
        } else if (pct >= 60) {
            trophy = '👍';
            msgTa = 'நல்ல முயற்சி! தவறான கேள்விகளை மீண்டும் பயிற்சி செய்க.';
            msgEn = 'Good effort! Review and practice your mistakes.';
        } else {
            trophy = '💪';
            msgTa = 'தொடர்ந்து முயலுங்கள்! விடாமுயற்சி வெற்றி தரும்!';
            msgEn = 'Keep practicing! Consistency leads to success!';
        }

        if (trophyElem) trophyElem.textContent = trophy;
        if (titleElem) titleElem.textContent = `${pct}% ${this.language === 'ta' ? 'மதிப்பெண்' : 'Score'}`;
        if (subtitleElem) subtitleElem.textContent = this.language === 'ta' ? msgTa : msgEn;

        // Score chart donut
        const pieElem = document.getElementById('score-chart-pie');
        const centerNum = document.getElementById('score-center-number');
        const centerTotal = document.getElementById('score-center-total');

        if (centerNum) centerNum.textContent = results.correctCount;
        if (centerTotal) centerTotal.textContent = `/ ${results.totalQuestions}`;

        if (pieElem) {
            const corrDeg = Math.round((results.correctCount / results.totalQuestions) * 360);
            const wrongDeg = corrDeg + Math.round((results.wrongCount / results.totalQuestions) * 360);
            pieElem.style.background = `conic-gradient(var(--success) 0deg ${corrDeg}deg, var(--danger) ${corrDeg}deg ${wrongDeg}deg, var(--border-color) ${wrongDeg}deg 360deg)`;
        }

        // Stats boxes
        const corrBox = document.getElementById('res-correct-count');
        const wrongBox = document.getElementById('res-wrong-count');
        const unattemptedBox = document.getElementById('res-unattempted-count');

        if (corrBox) corrBox.textContent = results.correctCount;
        if (wrongBox) wrongBox.textContent = results.wrongCount;
        if (unattemptedBox) unattemptedBox.textContent = results.unattemptedCount;

        // Review solutions list
        this.renderReviewList('all');

        this.showView('results');
    }

    renderReviewList(filter = 'all') {
        const container = document.getElementById('review-cards-container');
        if (!container || !this.currentResults) return;
        container.innerHTML = '';

        document.querySelectorAll('.review-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.filter === filter);
        });

        const questions = this.currentResults.questions;
        const answers = this.currentResults.userAnswers;

        questions.forEach((q, idx) => {
            const ans = answers[idx];
            let status = 'skipped';
            if (ans) {
                status = ans.isCorrect ? 'correct' : 'wrong';
            }

            if (filter === 'correct' && status !== 'correct') return;
            if (filter === 'wrong' && status !== 'wrong') return;
            if (filter === 'skipped' && status !== 'skipped') return;

            const card = document.createElement('div');
            card.className = `review-card ${status}`;

            const qText = this.language === 'en' ? (q.questionEn || q.questionTa) : (q.questionTa || q.questionEn);
            const statusLabel = status === 'correct' ? '✓ சரி (Correct)' : status === 'wrong' ? '✗ தவறு (Incorrect)' : '⚪ விடையளிக்கப்படவில்லை (Skipped)';

            let optionsHtml = '';
            q.options.forEach((opt, oIdx) => {
                let optClass = 'review-opt-item';
                let indicator = '';

                if (ans && ans.selectedOptionIndex === oIdx) {
                    optClass += ans.isCorrect ? ' is-correct' : ' is-user';
                    indicator = ans.isCorrect ? ' (உங்கள் விடை ✓)' : ' (உங்கள் விடை ✗)';
                }
                if (opt.isCorrect && (!ans || ans.selectedOptionIndex !== oIdx)) {
                    optClass += ' is-correct';
                    indicator = ' (சரியான விடை ✓)';
                }

                const optText = this.language === 'en' ? (opt.textEn || opt.textTa) : (opt.textTa || opt.textEn);
                optionsHtml += `<div class="${optClass}">${String.fromCharCode(65 + oIdx)}. ${optText} <strong>${indicator}</strong></div>`;
            });

            let expText = this.language === 'en' ? (q.explanationEn || q.explanationTa) : (q.explanationTa || q.explanationEn);

            card.innerHTML = `
                <div class="review-header">
                    <span>Q ${idx + 1} of ${questions.length}</span>
                    <span style="color: ${status === 'correct' ? 'var(--success)' : status === 'wrong' ? 'var(--danger)' : 'var(--text-muted)'};">${statusLabel}</span>
                </div>
                <div style="font-weight: 700; margin-bottom: 0.75rem;">${qText}</div>
                ${q.image ? `<img src="${q.image}" class="question-diagram-img" style="max-height: 180px; margin-bottom: 0.75rem;">` : ''}
                <div class="review-options-summary">
                    ${optionsHtml}
                </div>
                ${expText ? `
                    <div style="background: var(--info-bg); border-left: 4px solid var(--info); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; margin-top: 0.75rem;">
                        <strong>💡 விளக்கம்:</strong>
                        <div style="margin-top: 4px; white-space: pre-wrap;">${expText}</div>
                    </div>
                ` : ''}
            `;

            container.appendChild(card);
        });

        QuizEngine.renderMathInElement(container);
    }

    retakeMistakesOnly() {
        if (!this.currentResults) return;
        const wrongQuestions = this.currentResults.questions.filter((q, idx) => {
            const ans = this.currentResults.userAnswers[idx];
            return !ans || !ans.isCorrect;
        });

        if (wrongQuestions.length === 0) {
            this.showToast('No wrong answers to practice! Great job! 🎉', 'success');
            return;
        }

        const engineConfig = {
            subjectId: this.currentResults.config.subjectId,
            unitId: this.currentResults.config.unitId,
            unitTitle: this.currentResults.config.unitTitle + ' (Mistakes Review)',
            mode: 'practice',
            language: this.language,
            shuffleQuestions: true,
            shuffleOptions: false,
            timeLimitMinutes: 0
        };

        this.quizEngine.init(wrongQuestions, engineConfig);
        this.setupPaletteUI();
        this.renderCurrentQuestion();
        this.showView('arena');
    }

    // ==========================================
    // LIGHTBOX FOR DIAGRAM ZOOM
    // ==========================================
    openLightbox(src) {
        const modal = document.getElementById('lightbox-modal');
        const img = document.getElementById('lightbox-img');
        if (modal && img) {
            img.src = src;
            modal.classList.add('open');
        }
    }

    closeLightbox() {
        const modal = document.getElementById('lightbox-modal');
        if (modal) modal.classList.remove('open');
    }

    // ==========================================
    // SOUND EFFECTS (Web Audio API)
    // ==========================================
    playSound(type) {
        if (!this.soundEnabled) return;
        try {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) this.audioCtx = new AudioContext();
            }
            if (!this.audioCtx) return;

            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            if (type === 'correct') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(880, now + 0.1); // A5
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'wrong') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.setValueAtTime(190, now + 0.12);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            }
        } catch (e) {
            // Audio not critical
        }
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ==========================================
    // EVENT LISTENERS & SHORTCUTS
    // ==========================================
    setupEventListeners() {
        // Theme toggle
        document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyLanguage(e.currentTarget.dataset.lang);
            });
        });

        // Navigation links
        document.getElementById('brand-link')?.addEventListener('click', () => {
            this.showView('home');
        });
        document.getElementById('breadcrumb-home-link')?.addEventListener('click', () => {
            this.showView('home');
        });

        // Arena Exit
        document.getElementById('btn-exit-quiz')?.addEventListener('click', () => {
            const confirmMsg = this.language === 'en' 
                ? 'Are you sure you want to exit the NMMS exam?' 
                : 'NMMS தேர்விலிருந்து வெளியேற விரும்புகிறீர்களா?';
            if (confirm(confirmMsg)) {
                this.quizEngine.stopTimer();
                this.showView('subject');
            }
        });

        // Prevent accidental tab close, reload or leaving page
        window.addEventListener('beforeunload', (e) => {
            let message = '';
            if (this.currentView === 'arena' && !this.quizEngine.isCompleted) {
                message = this.language === 'en'
                    ? 'Are you sure you want to exit the NMMS exam?'
                    : 'NMMS தேர்விலிருந்து வெளியேற விரும்புகிறீர்களா?';
            } else if (this.currentView === 'home') {
                message = this.language === 'en'
                    ? 'Do you want to exit the NMMS website?'
                    : 'NMMS வலைதளத்திலிருந்து வெளியேற விரும்புகிறீர்களா?';
            }

            if (message) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });

        // Intercept browser back button / swipe back gesture
        let isExitingWebsite = false;
        window.addEventListener('popstate', () => {
            if (isExitingWebsite) return;

            // 1. If currently in Quiz Arena
            if (this.currentView === 'arena' && !this.quizEngine.isCompleted) {
                const confirmMsg = this.language === 'en' 
                    ? 'Are you sure you want to exit the NMMS exam?' 
                    : 'NMMS தேர்விலிருந்து வெளியேற விரும்புகிறீர்களா?';
                if (confirm(confirmMsg)) {
                    this.quizEngine.stopTimer();
                    this.showView('subject');
                } else {
                    try {
                        history.pushState({ inQuiz: true }, '');
                    } catch (err) {}
                }
                return;
            }

            // 2. If currently on Home page (User pressing back to exit the site)
            if (this.currentView === 'home') {
                const confirmMsg = this.language === 'en' 
                    ? 'Do you want to exit the NMMS website?' 
                    : 'NMMS வலைதளத்திலிருந்து வெளியேற விரும்புகிறீர்களா?';
                if (confirm(confirmMsg)) {
                    isExitingWebsite = true;
                    history.back();
                } else {
                    try {
                        history.pushState({ view: 'home' }, '');
                    } catch (err) {}
                }
                return;
            }

            // 3. From other sub-views (subject, bookmarks, history, results), go back to home
            this.showView('home');
        });

        // Arena Next / Prev / Flag / Submit
        document.getElementById('btn-prev-question')?.addEventListener('click', () => {
            this.quizEngine.prevQuestion();
        });
        document.getElementById('btn-next-question')?.addEventListener('click', () => {
            this.quizEngine.nextQuestion();
        });
        document.getElementById('btn-flag-question')?.addEventListener('click', () => {
            this.quizEngine.toggleFlag();
            this.renderCurrentQuestion();
            this.updatePaletteActiveState();
        });
        document.getElementById('btn-submit-exam')?.addEventListener('click', () => {
            this.submitExam(false);
        });

        // Modal Controls
        document.getElementById('btn-close-setup-modal')?.addEventListener('click', () => {
            this.closeQuizSetupModal();
        });
        document.getElementById('btn-launch-quiz-modal')?.addEventListener('click', () => {
            this.startQuizFromModal();
        });

        // Modal Mode selectors
        document.querySelectorAll('.mode-option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.setupConfig.mode = e.currentTarget.dataset.mode;
                this.updateSetupModalUI();
            });
        });

        // Modal Count pills
        document.querySelectorAll('.count-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const count = e.currentTarget.dataset.count;
                this.setupConfig.count = count === 'all' ? this.selectedUnit.questionCount : parseInt(count);
                this.updateSetupModalUI();
            });
        });

        // Lightbox close
        document.getElementById('lightbox-close-btn')?.addEventListener('click', () => {
            this.closeLightbox();
        });
        document.getElementById('lightbox-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'lightbox-modal') this.closeLightbox();
        });

        // Palette Grid Modal Controls
        document.getElementById('btn-open-palette-grid')?.addEventListener('click', () => {
            this.openPaletteGridModal();
        });
        document.getElementById('btn-close-palette-modal')?.addEventListener('click', () => {
            this.closePaletteGridModal();
        });
        document.getElementById('palette-grid-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'palette-grid-modal') this.closePaletteGridModal();
        });

        // Results actions
        document.getElementById('btn-retake-full')?.addEventListener('click', () => {
            this.loadAndLaunchQuiz(this.selectedSubjectId, this.selectedUnit, this.setupConfig);
        });
        document.getElementById('btn-retake-wrong')?.addEventListener('click', () => {
            this.retakeMistakesOnly();
        });
        document.getElementById('btn-results-home')?.addEventListener('click', () => {
            this.showView('subject');
        });

        // Review filters
        document.querySelectorAll('.review-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                this.renderReviewList(e.currentTarget.dataset.filter);
            });
        });

        // Bookmarks & History navigation buttons (tab bar & links)
        document.getElementById('tab-home')?.addEventListener('click', () => {
            this.showView('home');
        });
        document.getElementById('btn-view-bookmarks')?.addEventListener('click', () => {
            this.renderBookmarksView();
            this.showView('bookmarks');
        });
        document.getElementById('btn-view-history')?.addEventListener('click', () => {
            this.renderHistoryView();
            this.showView('history');
        });
    }

    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (this.currentView !== 'arena') return;

            // Prevent shortcuts when typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toUpperCase();
            if (['1', 'A'].includes(key)) this.handleKeyboardOption(0);
            else if (['2', 'B'].includes(key)) this.handleKeyboardOption(1);
            else if (['3', 'C'].includes(key)) this.handleKeyboardOption(2);
            else if (['4', 'D'].includes(key)) this.handleKeyboardOption(3);
            else if (['5', 'E'].includes(key)) this.handleKeyboardOption(4);
            else if (e.key === 'ArrowRight' || e.key === 'PageDown') this.quizEngine.nextQuestion();
            else if (e.key === 'ArrowLeft' || e.key === 'PageUp') this.quizEngine.prevQuestion();
            else if (key === 'F') {
                this.quizEngine.toggleFlag();
                this.renderCurrentQuestion();
                this.updatePaletteActiveState();
            }
        });
    }

    handleKeyboardOption(index) {
        const q = this.quizEngine.getCurrentQuestion();
        if (q && q.options[index]) {
            const btn = document.querySelector(`[data-option-index="${index}"]`);
            this.handleOptionSelection(index, btn);
        }
    }

    renderBookmarksView() {
        const container = document.getElementById('bookmarks-cards-container');
        if (!container) return;
        const bookmarks = this.getBookmarks();

        if (bookmarks.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">⭐</div>
                    <h3>${this.language === 'ta' ? 'சேமிக்கப்பட்ட கேள்விகள் எதுவும் இல்லை' : 'No Bookmarked Questions Yet'}</h3>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">${this.language === 'ta' ? 'பயிற்சி செய்யும்போது முக்கிய கேள்விகளை நட்சத்திரக் குறியிட்டு சேமிக்கலாம்.' : 'Save challenging questions while practicing to review them later.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        bookmarks.forEach((b) => {
            const card = document.createElement('div');
            card.className = 'review-card';
            const q = b.question;
            const qText = this.language === 'en' ? (q.questionEn || q.questionTa) : (q.questionTa || q.questionEn);

            card.innerHTML = `
                <div class="review-header">
                    <span>${b.unitTitle} • Saved on ${b.savedAt}</span>
                    <button class="action-btn" style="padding: 2px 8px; font-size: 0.75rem;" data-remove-bmark="${b.uniqueId}">🗑️ Remove</button>
                </div>
                <div style="font-weight: 700; margin-bottom: 0.75rem;">${qText}</div>
                ${q.image ? `<img src="${q.image}" class="question-diagram-img" style="max-height: 180px; margin-bottom: 0.75rem;">` : ''}
                <div style="font-size: 0.85rem; color: var(--success); font-weight: 700; margin-top: 0.5rem;">
                    ✓ சரியான விடை: Option ${String.fromCharCode(65 + q.correctOriginalIndex)}
                </div>
            `;

            card.querySelector(`[data-remove-bmark="${b.uniqueId}"]`)?.addEventListener('click', () => {
                this.toggleBookmark(q);
                this.renderBookmarksView();
            });

            container.appendChild(card);
        });

        QuizEngine.renderMathInElement(container);
    }

    renderHistoryView() {
        const container = document.getElementById('history-cards-container');
        if (!container) return;
        const history = this.getHistory();

        if (history.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">📜</div>
                    <h3>${this.language === 'ta' ? 'தேர்வு வரலாறு எதுவும் இல்லை' : 'No Test History Found'}</h3>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">${this.language === 'ta' ? 'நீங்கள் பயிற்சி முடித்தவுடன் உங்கள் மதிப்பெண்கள் இங்கு காட்டப்படும்.' : 'Your completed tests and scores will appear here.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-header">
                    <span>${item.date}</span>
                    <span class="badge-tag" style="text-transform: uppercase;">${item.mode}</span>
                </div>
                <h4 style="font-size: 1.1rem; margin-bottom: 0.4rem;">${item.unitTitle}</h4>
                <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    <span>🎯 Score: <strong>${item.score} / ${item.total}</strong> (${item.percentage}%)</span>
                    <span>⏱️ Time: <strong>${item.timeElapsed}</strong></span>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

window.NMMSApp = NMMSApp;

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NMMSApp();
});
