// terms_script.js

document.addEventListener('DOMContentLoaded', () => {
    // トップへ戻るボタンの要素を取得
    const backToTopBtn = document.getElementById('backToTopBtn');

    // スクロール時にボタンの表示/非表示を切り替え
    window.onscroll = function() {
        scrollFunction();
    };

    function scrollFunction() {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            backToTopBtn.style.display = "block";
        } else {
            backToTopBtn.style.display = "none";
        }
    }

    // ボタンクリックでトップへスクロール
    backToTopBtn.addEventListener('click', () => {
        document.body.scrollTop = 0; // For Safari
        document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    });
});