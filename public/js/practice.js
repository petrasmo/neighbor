// js/practice.js
import { renderPracticeHub } from './practiceHub.js';
import { renderGlossaryScreen } from './glossary.js';
import { renderCalendarScreen } from './calendar.js';
import { renderSoundQuizScreen } from './soundQuiz.js';
import { renderSeasonsScreen } from './seasons.js';
import { renderTrophyScreen } from './trophy.js';

let activeSubScreen = null; // null, 'zodynas', 'garsai', 'kalendorius', 'terminai', 'trofejai'

export function renderPracticeScreen() {
    const container = document.getElementById('view-tab-practice');
    if (!container) return;

    if (activeSubScreen === 'zodynas') {
        renderGlossaryScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'garsai') {
        renderSoundQuizScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'kalendorius') {
        renderCalendarScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'terminai') {
        renderSeasonsScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'trofejai') {
        renderTrophyScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else {
        renderPracticeHub(container, (screen) => {
            activeSubScreen = screen;
            renderPracticeScreen();
        });
    }
}