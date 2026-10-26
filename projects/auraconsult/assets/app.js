(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navAnchors = document.querySelectorAll('.nav-links a');

  if (menuButton && navLinks) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation menu');
      navLinks.classList.remove('is-open');
    };

    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.setAttribute('aria-label', willOpen ? 'Close navigation menu' : 'Open navigation menu');
      navLinks.classList.toggle('is-open', willOpen);
    });

    navAnchors.forEach((anchor) => anchor.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const filterButtons = document.querySelectorAll('.filter-button');
  const caseRows = document.querySelectorAll('.case-table tbody tr');
  const emptyFilterMessage = document.querySelector('.filter-empty');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      let visibleCount = 0;

      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });

      caseRows.forEach((row) => {
        const visible = filter === 'all' || row.dataset.category === filter;
        row.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (emptyFilterMessage) emptyFilterMessage.hidden = visibleCount !== 0;
    });
  });

  const form = document.querySelector('#audit-form');
  const status = document.querySelector('#form-status');

  if (form && status) {
    form.querySelectorAll('input, select').forEach((field) => {
      field.addEventListener('input', () => clearFieldError(field));
      field.addEventListener('change', () => clearFieldError(field));
      field.addEventListener('blur', () => validateField(field));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.hidden = true;
      status.classList.remove('is-error');

      const fields = Array.from(form.querySelectorAll('input[required], select[required]'));
      const firstInvalid = fields.find((field) => !validateField(field));

      if (firstInvalid) {
        status.textContent = 'Please complete the highlighted fields so we can shape the right conversation.';
        status.classList.add('is-error');
        status.hidden = false;
        firstInvalid.focus();
        return;
      }

      status.textContent = 'Thank you — your sample request looks complete. This preview does not send or store it. Connect a secure booking or CRM endpoint before launch.';
      status.hidden = false;
      form.reset();
      form.querySelectorAll('.field-error').forEach((message) => { message.textContent = ''; });
      form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
    });
  }

  function validateField(field) {
    const message = field.closest('.field')?.querySelector('.field-error');
    let error = '';

    if (field.validity.valueMissing) {
      error = field.name === 'email' ? 'Enter your corporate email.' : 'This field is required.';
    } else if (field.type === 'email' && field.validity.typeMismatch) {
      error = 'Enter a valid email address.';
    } else if (field.validity.tooShort) {
      error = 'Please enter at least 2 characters.';
    } else if (field.type === 'number' && field.validity.rangeUnderflow) {
      error = 'Enter a budget of zero or more.';
    }

    field.setAttribute('aria-invalid', String(Boolean(error)));
    if (message) message.textContent = error;
    return !error;
  }

  function clearFieldError(field) {
    const message = field.closest('.field')?.querySelector('.field-error');
    if (field.validity.valid) {
      field.removeAttribute('aria-invalid');
      if (message) message.textContent = '';
    }
  }

  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const heroImage = document.querySelector('.hero-image');
  if (heroImage) {
    heroImage.addEventListener('error', () => {
      if (heroImage.dataset.fallback && !heroImage.src.endsWith(heroImage.dataset.fallback)) {
        heroImage.src = heroImage.dataset.fallback;
      }
    }, { once: true });
  }
})();
