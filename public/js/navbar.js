// public/js/navbar.js

document.addEventListener("DOMContentLoaded", () => {
    const navContainer = document.getElementById("global-navbar");
    if (!navContainer) return;

    const currentPath = window.location.pathname;

    const navItems = [
        { name: "Terminai", icon: "🦌", url: "/kalendorius.html" },
        { name: "Trofėjai", icon: "🏆", url: "/trofejai.html" },
        { name: "Žodynas", icon: "📖", url: "/zodynas.html" },
        { name: "Renginiai", icon: "📅", url: "/renginiai.html" }
    ];

    const linksHtml = navItems.map(item => {
        const isActive = currentPath.includes(item.url);
        const activeClass = isActive 
            ? "bg-forestPrimary text-white border-forestPrimary shadow" 
            : "bg-forestBackground/90 text-forestSecondary hover:text-white border-forestBorder/70 hover:border-forestPrimary";

        return `
            <a href="${item.url}" class="text-xs font-bold ${activeClass} border py-1.5 px-2.5 sm:px-3 rounded-xl transition flex items-center justify-center gap-1.5 flex-1 sm:flex-initial text-center whitespace-nowrap">
                <span>${item.icon}</span> <span>${item.name}</span>
            </a>
        `;
    }).join('');

    navContainer.innerHTML = `
        <nav class="bg-forestSurface border-b border-forestBorder py-2.5 px-4 md:px-6 sticky top-0 z-50 shadow-md">
            <div class="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2.5">
                
                <div class="flex justify-between items-center w-full sm:w-auto">
                    <a href="/" class="font-oswald text-xl sm:text-2xl font-bold tracking-wider text-forestPrimary hover:opacity-90 transition">
                        HUNTERTEST
                    </a>
                    <button class="nav-start-tests-btn sm:hidden bg-forestPrimary hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition shadow flex items-center gap-1 cursor-pointer">
                        <span>Testai</span> <span>→</span>
                    </button>
                </div>
                
                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto scrollbar-none py-0.5">
                    ${linksHtml}
                    <button class="nav-start-tests-btn hidden sm:flex bg-forestPrimary hover:bg-green-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider transition shadow items-center gap-1 shrink-0 ml-2 cursor-pointer">
                        <span>Spręsti testus</span> <span>→</span>
                    </button>
                </div>

            </div>
        </nav>
    `;

    document.querySelectorAll('.nav-start-tests-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.setItem('hunter_guest_mode', 'true');
            window.location.href = '/';
        });
    });
});