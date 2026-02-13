// Capnet landing — smooth scroll, waitlist form only
document.addEventListener('DOMContentLoaded', function () {
  // Smooth scroll for # anchors
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Waitlist form: POST /api/join with JSON
  var form = document.getElementById('waitlist-form');
  var messageEl = document.getElementById('waitlist-message');
  if (form && messageEl) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (document.getElementById('waitlist-email') || form.querySelector('input[name="email"]')).value.trim();
      if (!email) return;
      messageEl.textContent = '';
      messageEl.classList.remove('waitlist-message--error', 'waitlist-message--ok');
      fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, justUpdates: true }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          messageEl.textContent = data.message || 'You\'re on the list. We\'ll be in touch.';
          messageEl.classList.add('waitlist-message--ok');
          form.reset();
        })
        .catch(function () {
          messageEl.textContent = 'Something went wrong. Try again or email us.';
          messageEl.classList.add('waitlist-message--error');
        });
    });
  }
});
