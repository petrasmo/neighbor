// js/theme.js

export function initThemeToggle() {
    const savedTheme = localStorage.getItem('neighbor_theme') || 'dark';
    applyTheme(savedTheme);

    // Pririšame visus mygtukus su klase 'btn-theme-toggle'
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
        btn.onclick = () => {
            const current = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
            const nextTheme = current === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        };
    });
}

function applyTheme(theme) {
    const root = document.documentElement;
    const icons = document.querySelectorAll('.theme-toggle-icon');
    const texts = document.querySelectorAll('.theme-toggle-text');

    if (theme === 'light') {
        root.classList.add('light-theme');
        localStorage.setItem('neighbor_theme', 'light');
        icons.forEach(i => i.textContent = '🌙');
        texts.forEach(t => t.textContent = 'Tamsi tema');
    } else {
        root.classList.remove('light-theme');
        localStorage.setItem('neighbor_theme', 'dark');
        icons.forEach(i => i.textContent = '☀️');
        texts.forEach(t => t.textContent = 'Šviesi tema');
    }
}