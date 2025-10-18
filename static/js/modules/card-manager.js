import { api } from '../utils/api.js';
import { notifications } from '../utils/notifications.js';

export class CardManager {
    constructor() {
        this.cardToDelete = null;
        this.setupDeleteHandlers();
    }

    setupDeleteHandlers() {
        // Confirm delete button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }

        // Modal close handlers
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideConfirmationModal();
                }
            });
        }
    }

    async addCard(deckId, formData) {
        try {
            const result = await api.post(`/deck/${deckId}/add_card`, formData);
            
            if (result.success) {
                notifications.success('Card added successfully!');
                return result.card_id;
            } else {
                throw new Error(result.error || 'Failed to add card');
            }
        } catch (error) {
            notifications.error(error.message);
            throw error;
        }
    }

    async deleteCard(cardId) {
        this.cardToDelete = cardId;
        this.showConfirmationModal(cardId);
    }

    async confirmDelete() {
        if (!this.cardToDelete) return;

        try {
            const result = await api.delete(`/card/${this.cardToDelete}`);
            
            if (result.success) {
                notifications.success('Card deleted successfully!');
                this.removeCardFromUI(this.cardToDelete);
            } else {
                throw new Error(result.error || 'Failed to delete card');
            }
        } catch (error) {
            notifications.error(error.message);
        } finally {
            this.hideConfirmationModal();
        }
    }

    showConfirmationModal(cardId) {
        const cardElement = document.getElementById(`card-${cardId}`);
        if (!cardElement) return;

        const hanzi = cardElement.querySelector('.card-hanzi')?.textContent || 'Unknown';
        const english = cardElement.querySelector('.card-english')?.textContent || 'Unknown';
        
        const modalMessage = document.getElementById('modalMessage');
        if (modalMessage) {
            modalMessage.textContent = 
                `Are you sure you want to delete "${hanzi}" (${english})? This action cannot be undone.`;
        }

        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.cardToDelete = null;
    }

    removeCardFromUI(cardId) {
        const cardElement = document.getElementById(`card-${cardId}`);
        if (!cardElement) return;

        // Animate removal
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            cardElement.remove();
            
            // Check if no cards left
            const cardsList = document.getElementById('cardsList');
            if (cardsList && cardsList.children.length === 0) {
                window.location.reload();
            }
        }, 300);
    }

    async loadDeckCards(deckId) {
        try {
            const cards = await api.get(`/api/deck/${deckId}/cards`);
            return cards;
        } catch (error) {
            notifications.error('Failed to load cards');
            console.error('Error loading cards:', error);
            return [];
        }
    }
}

// Global card manager instance
export const cardManager = new CardManager();