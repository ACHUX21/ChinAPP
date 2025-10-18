import { api } from '../utils/api.js';
import { notifications } from '../utils/notifications.js';
import { uiManager } from './ui-manager.js';

export class DeckManager {
    constructor() {
        this.currentDeckId = null;
    }

    async createDeck(formData) {
        try {
            const result = await api.post('/create_deck', formData);
            
            if (result.success) {
                notifications.success('Deck created successfully!');
                return result.deck_id;
            } else {
                throw new Error(result.error || 'Failed to create deck');
            }
        } catch (error) {
            notifications.error(error.message);
            throw error;
        }
    }

    async loadDecks() {
        try {
            const decks = await api.get('/api/decks');
            this.renderDecks(decks);
            return decks;
        } catch (error) {
            notifications.error('Failed to load decks');
            console.error('Error loading decks:', error);
            return [];
        }
    }

    renderDecks(decks) {
        const decksGrid = document.getElementById('decksGrid');
        if (!decksGrid) return;

        if (decks.length === 0) {
            decksGrid.innerHTML = `
                <div class="empty-state terminal-box">
                    <div class="empty-icon">📚</div>
                    <h3>No decks yet</h3>
                    <p class="terminal-text">Create your first deck to get started</p>
                    <button class="btn btn-primary glitch" onclick="uiManager.showView('createDeckView')">
                        <span class="glitch-text">create_first_deck</span>
                    </button>
                </div>
            `;
            return;
        }

        decksGrid.innerHTML = decks.map(deck => `
            <div class="deck-card terminal-box" onclick="deckManager.showDeckDetail(${deck.id})">
                <div class="deck-header">
                    <div class="deck-info">
                        <h3 class="deck-name">${this.escapeHtml(deck.name)}</h3>
                        ${deck.category ? `<span class="deck-category terminal-text">${this.escapeHtml(deck.category)}</span>` : ''}
                    </div>
                    <div class="deck-card-count">${deck.card_count} cards</div>
                </div>
                ${deck.description ? `<p class="deck-description terminal-text">${this.escapeHtml(deck.description)}</p>` : ''}
                <div class="deck-stats">
                    <span class="terminal-text">created: ${deck.created_at ? deck.created_at.slice(0, 10) : 'N/A'}</span>
                    ${deck.level ? `<span class="terminal-text">HSK ${deck.level}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    showDeckDetail(deckId) {
        window.location.href = `/deck/${deckId}`;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Global deck manager instance
export const deckManager = new DeckManager();