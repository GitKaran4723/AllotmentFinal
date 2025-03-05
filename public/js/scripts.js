function toggleMenu() {
    const nav = document.querySelector('nav');
    const menuToggle = document.querySelector('.menu-toggle');

    nav.classList.toggle('active');

    // Change icon
    if (nav.classList.contains('active')) {
        menuToggle.textContent = '×'; // Cross icon
    } else {
        menuToggle.textContent = '☰'; // Menu icon
    }
}

window.onload = function () {
    window.scrollTo(0, 0);
};

// Close menu if clicked outside
document.addEventListener('click', function (event) {
    const nav = document.querySelector('nav');
    const menuToggle = document.querySelector('.menu-toggle');

    const isClickInsideNav = nav.contains(event.target);
    const isClickOnToggle = menuToggle.contains(event.target);

    if (!isClickInsideNav && !isClickOnToggle && nav.classList.contains('active')) {
        nav.classList.remove('active');
        menuToggle.textContent = '☰'; // Reset icon to menu
    }
});

function closePopup() {
    document.getElementById('errorPopup').style.display = 'none';
  }
  setTimeout(() => {
    const popup = document.getElementById('errorPopup');
    if (popup) popup.style.display = 'none';
  }, 5000); // Auto close after 5 seconds