/**
 * NMMS Quiz Engine
 * Handles quiz state, question rendering, KaTeX math typesetting,
 * image path resolution, practice/exam mode logic, and scoring.
 */

class QuizEngine {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.config = {
            subjectId: '',
            unitId: '',
            unitTitle: '',
            mode: 'practice', // 'practice' or 'exam'
            language: 'ta',   // 'ta', 'en', or 'both'
            shuffleQuestions: false,
            shuffleOptions: false,
            timeLimitMinutes: 0 // 0 for count-up timer, >0 for countdown
        };

        this.userAnswers = {}; // { questionIndex: { selectedOptionIndex: number, isCorrect: boolean, timeSpent: number } }
        this.flagged = new Set();
        this.startTime = null;
        this.timerInterval = null;
        this.timeElapsedSeconds = 0;
        this.remainingSeconds = 0;
        this.isCompleted = false;

        this.onQuestionChange = null;
        this.onTimerTick = null;
        this.onQuizComplete = null;
    }

    /**
     * Initialize quiz with raw JSON question list and user config
     */
    init(rawQuestions, config) {
        this.config = { ...this.config, ...config };
        this.currentIndex = 0;
        this.userAnswers = {};
        this.flagged.clear();
        this.isCompleted = false;
        this.timeElapsedSeconds = 0;

        let processed = (rawQuestions || []).map((q, originalIdx) => {
            const optionsTa = Array.isArray(q.options) ? q.options : [];
            const optionsEn = Array.isArray(q.options_en) ? q.options_en : [];

            // Robust correct index calculation (handling 0-indexed and 1-indexed anomalies)
            let correctIdx = typeof q.correct === 'number' ? q.correct : 0;
            if (correctIdx >= optionsTa.length && optionsTa.length > 0) {
                correctIdx = optionsTa.length - 1;
            }

            // Combine options with correct index tracking
            let optionsObj = optionsTa.map((optText, optIdx) => ({
                textTa: String(optText || ''),
                textEn: String(optionsEn[optIdx] || optText || ''),
                isCorrect: optIdx === correctIdx,
                originalIndex: optIdx
            }));

            if (this.config.shuffleOptions) {
                optionsObj = this.shuffleArray(optionsObj);
            }

            // Resolve images
            const resolvedImg = this.resolveImage(this.config.subjectId, q.image);
            const resolvedExpImg = this.resolveImage(this.config.subjectId, q.explanationImage);

            return {
                id: q.id || (originalIdx + 1),
                questionTa: q.question || q.question_en || '',
                questionEn: q.question_en || q.question || '',
                options: optionsObj,
                correctOriginalIndex: correctIdx,
                explanationTa: q.explanation || q.explanation_en || '',
                explanationEn: q.explanation_en || q.explanation || '',
                image: resolvedImg,
                explanationImage: resolvedExpImg
            };
        });

        if (this.config.shuffleQuestions) {
            processed = this.shuffleArray(processed);
        }

        // Limit question count if configured
        if (this.config.limitCount && this.config.limitCount > 0 && this.config.limitCount < processed.length) {
            processed = processed.slice(0, this.config.limitCount);
        }

        this.questions = processed;

        // Timer setup
        if (this.config.mode === 'exam' && this.config.timeLimitMinutes > 0) {
            this.remainingSeconds = this.config.timeLimitMinutes * 60;
        } else {
            this.remainingSeconds = 0;
        }

        this.startTimer();
    }

    shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    /**
     * Resolves image paths using the pre-generated window.NMMS_IMAGE_MAP
     */
    resolveImage(subjectId, imgPath) {
        if (!imgPath) return null;
        const clean = String(imgPath).trim().replace(/^\/+/, '');
        
        if (window.NMMS_IMAGE_MAP) {
            const lower = clean.toLowerCase();
            if (window.NMMS_IMAGE_MAP[lower]) return window.NMMS_IMAGE_MAP[lower];

            // Try with section prefix
            const withSec = (subjectId + '/' + lower).toLowerCase();
            if (window.NMMS_IMAGE_MAP[withSec]) return window.NMMS_IMAGE_MAP[withSec];

            // Try singular vs plural
            const singular = lower.replace(/^images\//, 'image/');
            if (window.NMMS_IMAGE_MAP[singular]) return window.NMMS_IMAGE_MAP[singular];

            const hyphens = lower.replace(/_/g, '-');
            if (window.NMMS_IMAGE_MAP[hyphens]) return window.NMMS_IMAGE_MAP[hyphens];

            const underscores = lower.replace(/-/g, '_');
            if (window.NMMS_IMAGE_MAP[underscores]) return window.NMMS_IMAGE_MAP[underscores];
        }

        // Fallback relative path
        if (clean.startsWith('assets/')) return clean;
        return `assets/${subjectId}/${clean}`;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (this.isCompleted) return;
            this.timeElapsedSeconds++;

            if (this.config.mode === 'exam' && this.config.timeLimitMinutes > 0) {
                this.remainingSeconds--;
                if (this.remainingSeconds <= 0) {
                    this.remainingSeconds = 0;
                    this.stopTimer();
                    this.submitQuiz(true); // Auto submit on timeout
                    return;
                }
            }

            if (this.onTimerTick) {
                this.onTimerTick({
                    elapsed: this.timeElapsedSeconds,
                    remaining: this.remainingSeconds,
                    formattedElapsed: this.formatTime(this.timeElapsedSeconds),
                    formattedRemaining: this.formatTime(this.remainingSeconds)
                });
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex] || null;
    }

    goToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentIndex = index;
            if (this.onQuestionChange) this.onQuestionChange(this.getCurrentQuestion(), this.currentIndex);
        }
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.goToQuestion(this.currentIndex + 1);
        }
    }

    prevQuestion() {
        if (this.currentIndex > 0) {
            this.goToQuestion(this.currentIndex - 1);
        }
    }

    toggleFlag(index = this.currentIndex) {
        if (this.flagged.has(index)) {
            this.flagged.delete(index);
        } else {
            this.flagged.add(index);
        }
    }

    selectOption(optionIdx) {
        if (this.isCompleted) return null;
        const q = this.getCurrentQuestion();
        if (!q) return null;

        // In practice mode, once answered you can't change
        if (this.config.mode === 'practice' && this.userAnswers[this.currentIndex] !== undefined) {
            return this.userAnswers[this.currentIndex];
        }

        const opt = q.options[optionIdx];
        if (!opt) return null;

        const isCorrect = opt.isCorrect;

        this.userAnswers[this.currentIndex] = {
            selectedOptionIndex: optionIdx,
            selectedOriginalIndex: opt.originalIndex,
            isCorrect: isCorrect
        };

        return this.userAnswers[this.currentIndex];
    }

    getAnswerStatus(index) {
        return this.userAnswers[index] || null;
    }

    submitQuiz(autoSubmitted = false) {
        this.stopTimer();
        this.isCompleted = true;

        let correct = 0;
        let wrong = 0;
        let unattempted = 0;

        this.questions.forEach((q, idx) => {
            const ans = this.userAnswers[idx];
            if (!ans) {
                unattempted++;
            } else if (ans.isCorrect) {
                correct++;
            } else {
                wrong++;
            }
        });

        const total = this.questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

        const results = {
            totalQuestions: total,
            correctCount: correct,
            wrongCount: wrong,
            unattemptedCount: unattempted,
            percentage: percentage,
            accuracy: accuracy,
            timeElapsedSeconds: this.timeElapsedSeconds,
            formattedTime: this.formatTime(this.timeElapsedSeconds),
            autoSubmitted: autoSubmitted,
            userAnswers: this.userAnswers,
            questions: this.questions,
            config: this.config
        };

        if (this.onQuizComplete) {
            this.onQuizComplete(results);
        }

        return results;
    }

    /**
     * Typeset mathematical formulas using KaTeX
     */
    static renderMathInElement(element) {
        if (!element) return;
        if (window.renderMathInElement) {
            try {
                window.renderMathInElement(element, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false }
                    ],
                    throwOnError: false
                });
            } catch (err) {
                console.warn('KaTeX rendering notice:', err);
            }
        }
    }
}

window.QuizEngine = QuizEngine;
