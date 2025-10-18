import { api } from '../utils/api.js';
import { notifications } from '../utils/notifications.js';

export class AIIntegration {
    constructor() {
        this.setupAIHandlers();
    }

    setupAIHandlers() {
        // This will be called when the module is loaded
        // Event handlers are attached in the HTML
    }

    async getSuggestion(field, button) {
        const english = document.getElementById('cardEnglish')?.value;
        if (!english) {
            notifications.warning('Please enter the English term first');
            return;
        }
        
        this.setButtonLoading(button, true);

        try {
            const result = await api.post('/enhance_flashcard', {
                english: english,
                [field]: ""
            });

            if (result.status === 'success' && result.suggestions) {
                this.applySuggestion(field, result.suggestions[field]);
                notifications.success('AI suggestion applied');
            } else if (result.status === 'no_suggestions') {
                notifications.info('No AI suggestion available');
            } else {
                throw new Error(result.message || 'Error getting AI suggestion');
            }
        } catch (error) {
            notifications.error(error.message);
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    applySuggestion(field, suggestion) {
        if (!suggestion) return;

        switch (field) {
            case 'part_of_speech':
                const select = document.getElementById('cardPartOfSpeech');
                if (select) {
                    const optionExists = Array.from(select.options).some(
                        option => option.value === suggestion
                    );
                    if (optionExists) {
                        select.value = suggestion;
                    }
                }
                break;

            case 'measure_word':
                const measureWord = suggestion.split(',')[0].trim();
                this.setFieldValue('cardMeasureWord', measureWord);
                break;

            case 'example_sentence':
                const exampleSentence = suggestion.split('. ')[0].trim();
                this.setFieldValue('cardExample', exampleSentence);
                break;

            default:
                const fieldId = `card${field.charAt(0).toUpperCase() + field.slice(1)}`;
                this.setFieldValue(fieldId, suggestion);
                break;
        }
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner"></i>';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-robot"></i>';
        }
    }

    async enhanceAllFields(button) {
        const english = document.getElementById('cardEnglish')?.value;
        if (!english) {
            notifications.warning('Please enter the English term first');
            return;
        }

        const originalText = button.querySelector('.glitch-text')?.textContent;
        button.disabled = true;
        if (button.querySelector('.glitch-text')) {
            button.querySelector('.glitch-text').textContent = 'enhancing...';
        }

        const context = {
            english: english,
            hanzi: "",
            pinyin: "",
            traditional: "",
            part_of_speech: "",
            measure_word: "",
            example_sentence: "",
            notes: ""
        };

        try {
            const result = await api.post('/enhance_flashcard', context);

            if (result.status === 'success' && result.suggestions) {
                this.applyAllSuggestions(result.suggestions);
                notifications.success('AI suggestions applied');
            } else if (result.status === 'no_suggestions') {
                notifications.info('No AI suggestions available');
            } else {
                throw new Error(result.message || 'Error getting AI suggestions');
            }
        } catch (error) {
            notifications.error(error.message);
        } finally {
            button.disabled = false;
            if (button.querySelector('.glitch-text') && originalText) {
                button.querySelector('.glitch-text').textContent = originalText;
            }
        }
    }

    applyAllSuggestions(suggestions) {
        Object.entries(suggestions).forEach(([field, value]) => {
            if (value) {
                this.applySuggestion(field, value);
            }
        });
    }
}

// Global AI integration instance
export const aiIntegration = new AIIntegration();