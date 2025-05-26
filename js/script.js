// js/script.js
// ハンバーガーメニューのクリックイベントを設定

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const navMenu = document.getElementById('nav'); // <nav id="nav"> を取得

    if (hamburgerButton && navMenu) {
        hamburgerButton.addEventListener('click', () => {
            // ナビゲーションメニューの表示/非表示を切り替え
            navMenu.classList.toggle('active');
            // ハンバーガーボタン自体の見た目を切り替え (X印など)
            hamburgerButton.classList.toggle('active');

            // aria-expanded属性を更新してアクセシビリティを向上
            const isExpanded = navMenu.classList.contains('active');
            hamburgerButton.setAttribute('aria-expanded', isExpanded);
        });
    }

    // (オプション) メニュー外またはメニュー項目をクリックしたら閉じる
    document.addEventListener('click', (event) => {
        if (navMenu && navMenu.classList.contains('active')) {
            const isClickInsideNav = navMenu.contains(event.target);
            const isClickOnHamburger = hamburgerButton.contains(event.target);
            const isLinkClick = event.target.tagName === 'A' && navMenu.contains(event.target);

            if ((!isClickInsideNav && !isClickOnHamburger) || isLinkClick) {
                navMenu.classList.remove('active');
                hamburgerButton.classList.remove('active');
                hamburgerButton.setAttribute('aria-expanded', 'false');
            }
        }
    });
    
    // (オプション) ウィンドウリサイズ時にデスクトップ表示に戻ったらメニューを明示的に閉じる
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) { // CSSのブレークポイントと合わせる
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
            if (hamburgerButton && hamburgerButton.classList.contains('active')) {
                hamburgerButton.classList.remove('active');
                hamburgerButton.setAttribute('aria-expanded', 'false');
            }
        }
    });
});