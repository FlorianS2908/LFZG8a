(() => {
'use strict';
    
    const init = () => burgerImg().addEventListener('click', handleMenu);
    
    const handleMenu = (e) => {
        animateButton(e);
        toggleNav();
        e.preventDefault();
    }
    
    const animateButton = (e) => e.target.classList.toggle('rotateButton');
    const toggleNav = () => mainNav().classList.toggle('toggleButton');
    
    const mainNav = () => $('#mainNav');
    const burgerImg = () => $('#burgerLink');
    
    const  $ = document.querySelector.bind(document);
    const $$ = document.querySelectorAll.bind(document);
    
    init();
    
})();