/* =============================================================
   USN — FORMS.JS
   Every form on the site (Join USN, Volunteer, Campus Rep,
   Partner With USN, Contact) uses this same script.

   NETLIFY FORMS NOTE:
   These forms submit to Netlify Forms — a hosted form backend
   built into Netlify hosting, not a custom server we wrote.
   Netlify detects any HTML <form data-netlify="true"> at deploy
   time and stores submissions for you to view in your Netlify
   dashboard. There is no database and no server code here.

   This file only handles:
   1. Client-side validation (required fields, email format)
   2. Accessible error messaging (aria-invalid / aria-describedby)
   3. A honeypot spam check
   4. Submitting the form via fetch() so we can show an inline
      success message without a full page reload (progressive
      enhancement — the form still works fine without JS, since
      Netlify will redirect to thank-you.html on a normal submit).
============================================================= */

function initForms() {
  const forms = document.querySelectorAll("form[data-usn-form]");

  forms.forEach((form) => {
    const successBox = form.querySelector(".form-success");

    form.addEventListener("submit", async (event) => {
      const isValid = validateForm(form);

      // Honeypot: if the hidden field has anything in it, silently
      // pretend to succeed rather than telling a bot it was caught.
      const honeypot = form.querySelector('input[name="bot-field"]');
      const isBot = honeypot && honeypot.value.trim() !== "";

      if (!isValid) {
        event.preventDefault();
        const firstInvalid = form.querySelector('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Let the browser submit naturally if fetch isn't available
      if (!window.fetch) return;

      event.preventDefault();

      if (isBot) {
        showSuccess(form, successBox);
        form.reset();
        return;
      }

      const formData = new FormData(form);
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending…";
      }

      try {
        await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(formData).toString(),
        });
        showSuccess(form, successBox);
        form.reset();
      } catch (err) {
        // Network issue — fall back to a normal HTML submission
        // so the visitor never loses their data.
        form.submit();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || "Submit";
        }
      }
    });

    // Re-validate a field the moment the visitor fixes it
    form.querySelectorAll("input, select, textarea").forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
    });
  });
}

function showSuccess(form, successBox) {
  if (!successBox) return;
  successBox.classList.add("is-visible");
  successBox.setAttribute("role", "status");
  successBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function validateForm(form) {
  let formIsValid = true;
  const fields = form.querySelectorAll("input[required], select[required], textarea[required], input[type='email']");
  fields.forEach((field) => {
    if (!validateField(field)) formIsValid = false;
  });
  return formIsValid;
}

function validateField(field) {
  const wrapper = field.closest(".field");
  if (!wrapper) return true;

  let valid = true;
  let message = "This field is required.";

  if (field.hasAttribute("required") && !field.value.trim()) {
    valid = false;
  } else if (field.type === "email" && field.value.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(field.value.trim())) {
      valid = false;
      message = "Enter a valid email address.";
    }
  } else if (field.type === "checkbox" && field.hasAttribute("required") && !field.checked) {
    valid = false;
  }

  wrapper.setAttribute("data-invalid", (!valid).toString());
  field.setAttribute("aria-invalid", (!valid).toString());

  const errorEl = wrapper.querySelector(".field-error");
  if (errorEl) {
    errorEl.textContent = message;
    if (!errorEl.id) errorEl.id = `${field.name || field.id}-error`;
    field.setAttribute("aria-describedby", errorEl.id);
  }

  return valid;
}

document.addEventListener("DOMContentLoaded", initForms);
