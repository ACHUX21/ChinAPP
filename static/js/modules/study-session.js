import { api } from '../utils/api.js';
import { notifications } from '../utils/notifications.js';

export class StudySession {
    constructor() {
        this.currentCardIndex = 0;
        this.cards = [];
        this.studiedCards = 0;
        this.startTime = null;
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '') {
                e.preventDefault();
                this.flipCard();
            } else if (e.key >= '1' && e.key <= '4') {
                this.rateCard(parseInt(e.key));
            } else if (e.key === 'Escape') {
                this.endSession();
            }
        });
    }

    initialize(cards) {
        this.cards = cards;
        this.currentCardIndex = 0;
        this.studiedCards = 0;
        this.startTime = new Date();

        if (this.cards.length > 0) {
            this.loadCard(0);
            this.updateProgress();
        }

        this.updateFinishButton();
    }

    flipCard() {
        const card = document.getElementById('studyCard');
        if (card) {
            card.classList.toggle('flipped');
        }
    }

    async rateCard(rating) {
        if (this.currentCardIndex >= this.cards.length) return;

        const currentCard = this.cards[this.currentCardIndex];
        
        try {
            const result = await api.post(`/card/${currentCard.id}/rate`, { rating });
            
            if (result.success) {
                this.studiedCards++;
                this.currentCardIndex++;
                this.updateProgress();
                
                if (this.currentCardIndex < this.cards.length) {
                    this.loadCard(this.currentCardIndex);
                } else {
                    this.showCompletion();
                }
                
                notifications.success('Progress saved!');
            } else {
                throw new Error(result.error || 'Failed to rate card');
            }
        } catch (error) {
            notifications.error(error.message);
        }
    }

    loadCard(index) {
        if (index >= this.cards.length) return;
        
        const card = this.cards[index];
        const studyCard = document.getElementById('studyCard');
        
        if (!studyCard) return;
        
        studyCard.classList.remove('flipped');
        
        // Update front side
        document.getElementById('cardFrontHanzi').textContent = card.hanzi;
        const pinyinElement = document.getElementById('cardFrontPinyin');
        if (pinyinElement) {
            pinyinElement.textContent = card.pinyin || '';
        }
    }

    updateProgress() {
        const progress = (this.studiedCards / this.cards.length) * 100;
        const progressBar = document.getElementById('studyProgress');
        const progressText = document.getElementById('progressText');
        const remainingCount = document.getElementById('remainingCount');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${this.studiedCards}/${this.cards.length}`;
        }
        if (remainingCount) {
            remainingCount.textContent = this.cards.length - this.studiedCards;
        }
    }

    updateFinishButton() {
        const finishBtn = document.getElementById('finishBtn');
        if (finishBtn && this.cards.length > 0) {
            finishBtn.style.display = 'flex';
            finishBtn.onclick = () => this.showCompletion();
        }
    }

    showCompletion() {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 60000);
        
        const studyView = document.getElementById('studyView');
        const completionScreen = document.getElementById('completionScreen');
        
        if (studyView && completionScreen) {
            studyView.style.display = 'none';
            completionScreen.style.display = 'block';
            
            document.getElementById('completedCount').textContent = this.studiedCards;
            document.getElementById('sessionTime').textContent = duration || 1;
        }

        // Hide finish button
        const finishBtn = document.getElementById('finishBtn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
    }

    endSession() {
        // This will be handled by the back button in the template
        // Override this method for custom session ending logic
    }
}

// Global study session instance
export const studySession = new StudySession();