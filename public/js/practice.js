// js/practice.js
import { renderPracticeHub } from './practiceHub.js';
import { renderGlossaryScreen } from './glossary.js';
import { renderCalendarScreen } from './calendar.js';
import { renderSoundQuizScreen } from './soundQuiz.js';
import { renderSeasonsScreen } from './seasons.js';
import { renderTrophyScreen } from './trophy.js';
import { renderHuntingGroundsScreen } from './huntingGrounds.js';
import { renderWeatherScreen } from './weather.js';
import { renderBloodTrailScreen } from './bloodTrail.js';
import { startSafetyExam } from './exam.js';
import { isGuestMode, logoutUser } from './auth.js';
import { showDialog, switchTab } from './ui.js';

let activeSubScreen = null; 

export function renderPracticeScreen() {
    const container = document.getElementById('view-tab-practice');
    if (!container) return;

    if (activeSubScreen === 'pedsakai') {
        renderBloodTrailScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'zodynas') {
        renderGlossaryScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'garsai') {
        renderSoundQuizScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'kalendorius') {
        renderCalendarScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'terminai') {
        renderSeasonsScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'trofejai') {
        renderTrophyScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'plotai') {
        renderHuntingGroundsScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else if (activeSubScreen === 'orai') {
        renderWeatherScreen(container, () => { activeSubScreen = null; renderPracticeScreen(); });
    } else {
        renderPracticeHub(container, (screen) => {
            if (screen === 'safety') {
                if (isGuestMode()) {
                    showDialog(
                        "Reikalingas prisijungimas ???", 
                        "Norëdami laikyti 3 metø saugumo patikrinimo simuliacijà, praðome prisijungti prie savo paskyros.", 
                        "??", 
                        () => logoutUser(),
                        () => {}
                    );
                    return;
                }
                switchTab(0); // Perjungiame á pagrindiná egzamino langà
                startSafetyExam();
            } else {
                activeSubScreen = screen;
                renderPracticeScreen();
            }
        });
    }
}