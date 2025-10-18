import { api } from '../utils/api.js';
import { notifications } from '../utils/notifications.js';

export class ElevenLabs {
    constructor() {
        this.audioPlayer = null;
        this.currentAudio = null;
        this.setupElevenLabsHandlers();
    }
    
    setupElevenLabsHandlers() {
        this.addAudioPlayerStyles();
    }

    async generateAudio() {
        const english = document.getElementById('cardEnglish')?.value;
        if (!english) {
            notifications.warning('Please enter the English term first');
            return;
        }
        
        // Get the original button and set loading state
        const voiceSection = document.getElementById('voice_section');
        const originalButton = voiceSection.querySelector('button');
        this.setButtonLoading(originalButton, true);

        try {
            const result = await api.post('/generate_voice', {
                text: english
            });

            if (result.status === 'success' && result.audio_base64) {
                this.createAudioPlayer(result.audio_base64);
                this.playAudio(result.audio_base64);
                notifications.success('Audio generated and playing');
                document.getElementById('audioBase64').value = result.audio_base64;
                const voiceSection = document.getElementById("voice_section");
                if (voiceSection) {
                    voiceSection.style.display = 'none';
                }

            } else {
                throw new Error(result.message || 'Error generating audio');
            }
        } catch (error) {
            notifications.error(error.message);
        } finally {
            this.setButtonLoading(originalButton, false);
        }
    }

    createAudioPlayer(base64) {
        // Remove existing player if it exists
        if (this.audioPlayer) {
            this.audioPlayer.remove();
        }

        // Create audio player container
        this.audioPlayer = document.createElement('div');
        this.audioPlayer.className = 'audio-player-container';
        this.audioPlayer.innerHTML = `
            <div class="audio-player">
                <div class="player-controls">
                    <button class="play-pause-btn" title="Play/Pause">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3 2v12l10-6z"/>
                        </svg>
                    </button>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress"></div>
                        </div>
                        <div class="time-display">0:00</div>
                    </div>
                    <button class="regenerate-btn" title="Regenerate Audio">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.5 8a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                        </svg>
                        Regenerate
                    </button>
                </div>
            </div>
        `;

        // Insert after the voice section
        const voiceSection = document.getElementById('voice_section');
        voiceSection.parentNode.insertBefore(this.audioPlayer, voiceSection.nextSibling);

        // Setup event listeners
        this.setupAudioPlayerEvents(base64);
    }

    addAudioPlayerStyles() {
        if (document.getElementById('audio-player-styles')) return;

        const styles = `
            .audio-player-container {
                margin: var(--space-md) 0;
                padding: var(--space-md);
                background: rgba(42, 21, 74, 0.8);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                backdrop-filter: blur(10px);
            }

            .audio-player {
                width: 100%;
            }

            .player-controls {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }

            .play-pause-btn {
                background: linear-gradient(135deg, var(--primary-color), #6d28d9);
                border: 1px solid rgba(225, 0, 255, 0.3);
                border-radius: var(--radius-sm);
                width: 32px;
                height: 32px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all var(--transition-normal);
                flex-shrink: 0;
            }

            .play-pause-btn:hover {
                transform: scale(1.05);
                box-shadow: var(--glow);
                border-color: rgba(153, 0, 255, 0.5);
            }

            .play-pause-btn.playing svg {
                transform: translateX(1px);
            }

            .progress-container {
                flex: 1;
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                min-width: 0;
            }

            .progress-bar {
                flex: 1;
                height: 4px;
                background: rgba(139, 92, 246, 0.3);
                border-radius: 2px;
                overflow: hidden;
                position: relative;
                min-width: 60px;
            }

            .progress {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color), #c4b5fd);
                border-radius: 2px;
                width: 0%;
                transition: width 0.1s ease;
            }

            .time-display {
                font-size: 0.75rem;
                color: var(--text-secondary);
                min-width: 35px;
                font-family: var(--font-mono);
                flex-shrink: 0;
            }

            .regenerate-btn {
                background: transparent;
                border: 1px solid rgba(225, 0, 255, 0.3);
                border-radius: var(--radius-sm);
                padding: 6px 12px;
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.75rem;
                font-family: var(--font-mono);
                transition: all var(--transition-normal);
                flex-shrink: 0;
                text-transform: lowercase;
            }

            .regenerate-btn:hover {
                background: rgba(183, 0, 255, 0.1);
                border-color: rgba(153, 0, 255, 0.5);
                box-shadow: var(--glow);
                transform: translateY(-1px);
            }

            .regenerate-btn:active {
                transform: translateY(0);
            }

            .regenerate-btn.loading {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .regenerate-btn.loading svg {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'audio-player-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupAudioPlayerEvents(base64) {
        const playPauseBtn = this.audioPlayer.querySelector('.play-pause-btn');
        const progressBar = this.audioPlayer.querySelector('.progress');
        const timeDisplay = this.audioPlayer.querySelector('.time-display');
        const regenerateBtn = this.audioPlayer.querySelector('.regenerate-btn');

        this.currentAudio = new Audio(`data:audio/wav;base64,${base64}`);
        let isPlaying = false;
        let progressInterval;

        // Format time helper
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Update progress bar
        const updateProgress = () => {
            if (this.currentAudio.duration) {
                const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
                progressBar.style.width = `${progress}%`;
                timeDisplay.textContent = formatTime(this.currentAudio.currentTime);
            }
        };

        // Play/Pause functionality
        playPauseBtn.addEventListener('click', () => {
            if (isPlaying) {
                this.currentAudio.pause();
                playPauseBtn.classList.remove('playing');
                clearInterval(progressInterval);
            } else {
                this.currentAudio.play();
                playPauseBtn.classList.add('playing');
                progressInterval = setInterval(updateProgress, 100);
            }
            isPlaying = !isPlaying;
        });

        // Audio ended event
        this.currentAudio.addEventListener('ended', () => {
            isPlaying = false;
            playPauseBtn.classList.remove('playing');
            clearInterval(progressInterval);
            progressBar.style.width = '0%';
            timeDisplay.textContent = '0:00';
        });

        // Regenerate button
        regenerateBtn.addEventListener('click', async () => {
            const english = document.getElementById('cardEnglish')?.value;
            if (!english) {
                notifications.warning('Please enter the English term first');
                return;
            }

            regenerateBtn.classList.add('loading');
            regenerateBtn.disabled = true;

            try {
                const result = await api.post('/generate_voice', {
                    text: english
                });

                if (result.status === 'success' && result.audio_base64) {
                    // Stop current audio
                    this.currentAudio.pause();
                    isPlaying = false;
                    playPauseBtn.classList.remove('playing');
                    clearInterval(progressInterval);
                    document.getElementById('audioBase64').value = result.audio_base64;

                    // Update audio source
                    this.currentAudio.src = `data:audio/wav;base64,${result.audio_base64}`;
                    progressBar.style.width = '0%';
                    timeDisplay.textContent = '0:00';
                    
                    notifications.success('Audio regenerated successfully');
                } else {
                    throw new Error(result.message || 'Error regenerating audio');
                }
            } catch (error) {
                notifications.error(error.message);
            } finally {
                regenerateBtn.classList.remove('loading');
                regenerateBtn.disabled = false;
            }
        });
    }

    playAudio(base64) {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        this.currentAudio = new Audio(`data:audio/wav;base64,${base64}`);
        this.currentAudio.play();
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="terminal-text">loading...</span>';
        } else {
            button.disabled = false;
            button.innerHTML = '<span class="terminal-text">generate_voice</span>';
        }
    }
}