import { notifications } from '../utils/notifications.js';

export class UIManager {
    constructor() {
        this.currentView = 'dashboardView';
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupEventListeners();
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const closeSidebarBtn = document.getElementById('closeSidebar');
        const mobileSidebar = document.getElementById('mobileSidebar');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => this.closeMobileMenu());
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileSidebar && 
                !mobileSidebar.contains(e.target) && 
                mobileMenuBtn && 
                !mobileMenuBtn.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('mobileSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('mobileSidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    }

    showView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
        }
        
        // Close mobile menu when changing views
        this.closeMobileMenu();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('viewChanged', { 
            detail: { viewId } 
        }));
    }

    handleEscapeKey() {
        switch (this.currentView) {
            case 'createDeckView':
            case 'addCardView':
                this.showView('dashboardView');
                break;
            default:
                // Do nothing or handle other cases
                break;
        }
    }

    showLoading(element) {
        if (element) {
            const originalText = element.innerHTML;
            element.dataset.originalText = originalText;
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            element.disabled = true;
        }
    }

    hideLoading(element) {
        if (element && element.dataset.originalText) {
            element.innerHTML = element.dataset.originalText;
            element.disabled = false;
        }
    }

    updateStreakDisplay(current, longest) {
        const currentElement = document.getElementById('currentStreak');
        const longestElement = document.getElementById('longestStreak');
        const mobileCurrent = document.getElementById('mobileCurrentStreak');

        if (currentElement) currentElement.textContent = current;
        if (longestElement) longestElement.textContent = longest;
        if (mobileCurrent) mobileCurrent.textContent = current;
    }
}

// Global UI manager instance
export const uiManager = new UIManager();