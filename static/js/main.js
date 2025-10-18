// Main application entry point
import { uiManager } from './modules/ui-manager.js';
import { deckManager } from './modules/deck-manager.js';
import { cardManager } from './modules/card-manager.js';
import { studySession } from './modules/study-session.js';
import { aiIntegration } from './modules/ai-integration.js';
import { ElevenLabs } from './modules/elevenlabs.js'; // ADD THIS IMPORT
import { notifications } from './utils/notifications.js';

// Initialize ElevenLabs instance
const elevenLabs = new ElevenLabs();

// Global application object
window.app = {
    ui: uiManager,
    decks: deckManager,
    cards: cardManager,
    study: studySession,
    ai: aiIntegration,
    elevenLabs: elevenLabs, // ADD THIS
    notifications: notifications
};

// --- SOLUTION ---
// Expose necessary managers to the global scope (window) so that
// inline onclick="..." attributes in your HTML can find them.
window.uiManager = uiManager;
window.deckManager = deckManager;
window.cardManager = cardManager;
window.aiIntegration = aiIntegration;
window.studySession = studySession;
window.elevenLabs = elevenLabs; // ADD THIS
window.generateVoice = () => elevenLabs.generateAudio(); // ADD THIS GLOBAL FUNCTION


// --- APP INITIALIZATION ---
// This code runs after the HTML document has fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized.");

    // Example: If on the dashboard page, load the decks.
    // You can add more complex logic here to check which page is active.
    if (document.getElementById('decksGrid')) {
        deckManager.loadDecks();
    }
});

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('神経 flashcards initialized');
    
    // Set study start time
    window.studyStartTime = new Date();

    // Initialize study session if on study page
    if (window.studyCards) {
        studySession.initialize(window.studyCards);
    }

    // Load decks if on dashboard
    if (document.getElementById('decksGrid')) {
        deckManager.loadDecks();
    }
});

// Global functions for HTML event handlers
window.toggleMobileMenu = () => uiManager.toggleMobileMenu();
window.closeMobileMenu = () => uiManager.closeMobileMenu();
window.showView = (viewId) => uiManager.showView(viewId);

// Deck management
window.createDeck = async (event) => {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('deckName').value,
        description: document.getElementById('deckDescription').value,
        category: document.getElementById('deckCategory').value,
        level: document.getElementById('deckLevel').value || null
    };

    const submitButton = event.target.querySelector('button[type="submit"]');
    uiManager.showLoading(submitButton);

    try {
        const deckId = await deckManager.createDeck(formData);
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        // Error is already handled by deckManager
    } finally {
        uiManager.hideLoading(submitButton);
    }
};

// Card management
window.showDeckDetail = (deckId) => deckManager.showDeckDetail(deckId);
window.showAddCardForm = () => uiManager.showView('addCardView');
window.hideAddCardForm = () => uiManager.showView('deckDetailView');

window.addCard = async (event, deckId) => {
    event.preventDefault();
    
    const formData = {
        hanzi: document.getElementById('cardHanzi').value,
        pinyin: document.getElementById('cardPinyin').value,
        english: document.getElementById('cardEnglish').value,
        part_of_speech: document.getElementById('cardPartOfSpeech').value,
        base64_audio: document.getElementById('audioBase64').value,
        example_sentence: document.getElementById('cardExample').value,
        notes: document.getElementById('cardNotes').value
    };

    const submitButton = event.target.querySelector('button[type="submit"]');
    uiManager.showLoading(submitButton);

    try {
        await cardManager.addCard(deckId, formData);
        hideAddCardForm();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        // Error is already handled by cardManager
    } finally {
        uiManager.hideLoading(submitButton);
    }
};

// Study session
window.startStudySession = (deckId) => {
    window.location.href = `/deck/${deckId}/study`;
};

window.flipCard = () => studySession.flipCard();
window.rateCard = (rating) => studySession.rateCard(rating);

// AI integration
window.getAISuggestion = (field) => {
    const button = event.target.closest('.ai-suggestion-btn');
    aiIntegration.getSuggestion(field, button);
};

window.enhanceAllFields = () => {
    const button = event.target;
    aiIntegration.enhanceAllFields(button);
};

// ElevenLabs voice generation - ADD THIS FUNCTION
window.generateVoice = () => {
    elevenLabs.generateAudio();
};

// Card deletion
window.deleteCard = (cardId) => cardManager.deleteCard(cardId);
window.hideConfirmationModal = () => cardManager.hideConfirmationModal();

// Simple toast function for backward compatibility
window.showToast = (message, type = 'info') => {
    notifications.show(message, type);
};