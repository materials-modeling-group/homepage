// ========================================
// Materials Modeling Group - Main JS
// ========================================

document.addEventListener('DOMContentLoaded', function () {

  // ----------------------------------------
  // Logo click (CSP 対応: インライン onclick から移行)
  // ----------------------------------------
  // ロゴは親の <a class="navbar-brand"> 内にあるが、クリック時は親遷移を止めて
  // data-href で指定した外部サイト (NIMS / CBRM) を新規タブで開く。
  document.querySelectorAll('.logo-link[data-href]').forEach(function (logo) {
    logo.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var url = logo.getAttribute('data-href');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  // ----------------------------------------
  // Hamburger Menu Toggle
  // ----------------------------------------
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // ----------------------------------------
  // Navbar Shadow on Scroll
  // ----------------------------------------
  const navbar = document.querySelector('.navbar');

  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // ----------------------------------------
  // Scroll Fade-In Animation (IntersectionObserver)
  // ----------------------------------------
  const fadeElements = document.querySelectorAll('.fade-in-up');

  if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show all elements immediately
    fadeElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

});
