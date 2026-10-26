(() => {
  "use strict";

  const config = window.ESTABRAQ_CONFIG || {};
  const menuButton = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuButton && navLinks) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation menu");
      navLinks.classList.remove("is-open");
    };
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute(
        "aria-label",
        open ? "Close navigation menu" : "Open navigation menu",
      );
      navLinks.classList.toggle("is-open", open);
    });
    navLinks
      .querySelectorAll("a")
      .forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const techCopy = {
    HTML5:
      "Accessible structure and performance-minded foundations for every screen.",
    "Tailwind CSS":
      "A precise, reusable design system that keeps responsive styling consistent.",
    JavaScript:
      "Purposeful client-side behavior—from polished interactions to API connections.",
    React: "Component-driven interfaces that can grow with your product.",
    Supabase:
      "A fast path to database-backed experiences, auth-ready foundations and APIs.",
  };
  const techButtons = [...document.querySelectorAll(".tech-chip")];
  const techExplainer = document.querySelector("#tech-explainer");
  techButtons.forEach((button) =>
    button.addEventListener("click", () => {
      techButtons.forEach((chip) =>
        chip.classList.toggle("is-selected", chip === button),
      );
      if (techExplainer)
        techExplainer.textContent = techCopy[button.dataset.tech] || "";
    }),
  );

  const filters = [...document.querySelectorAll(".collection-filter")];
  const productCards = [...document.querySelectorAll(".product-card")];
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      filters.forEach((filter) => {
        const selected = filter === button;
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
      productCards.forEach((card) => {
        card.hidden = category !== "all" && card.dataset.category !== category;
      });
    }),
  );

  const storeBase = String(
    config.gumroadBaseUrl || "https://auralabs.gumroad.com/l",
  ).replace(/\/$/, "");
  document.querySelectorAll("[data-buy-link]").forEach((link) => {
    const productKey = link.dataset.buyLink;
    const slug = config.productSlugs?.[productKey] || productKey;
    link.href = `${storeBase}/${encodeURIComponent(slug)}`;
  });

  const dialog = document.querySelector("#product-dialog");
  const backdrop = document.querySelector("#dialog-backdrop");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDescription = document.querySelector("#dialog-description");
  const dialogMark = document.querySelector("#dialog-mark");
  const dialogVisual = document.querySelector("#dialog-visual");
  const dialogBuy = document.querySelector("#dialog-buy");
  let returnFocus = null;
  const closeDialog = () => {
    if (dialog?.open) dialog.close();
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("dialog-open");
    returnFocus?.focus();
  };
  document.querySelectorAll("[data-preview]").forEach((button) =>
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      if (!card || !dialog) return;
      returnFocus = button;
      const name = card.dataset.product;
      const slug =
        config.productSlugs?.[card.dataset.slug] || card.dataset.slug;
      if (dialogTitle) dialogTitle.textContent = name;
      if (dialogDescription)
        dialogDescription.textContent =
          card.dataset.description ||
          "A polished AuraLabs landing page concept.";
      if (dialogMark) dialogMark.textContent = name;
      if (dialogVisual)
        dialogVisual.dataset.theme = card.dataset.theme || "cyan";
      if (dialogBuy)
        dialogBuy.href = `${storeBase}/${encodeURIComponent(slug)}`;
      if (backdrop) backdrop.hidden = false;
      document.body.classList.add("dialog-open");
      dialog.showModal();
    }),
  );
  dialog?.addEventListener("close", () => {
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("dialog-open");
    returnFocus?.focus();
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  backdrop?.addEventListener("click", closeDialog);
  document
    .querySelector("[data-dialog-close]")
    ?.addEventListener("click", closeDialog);
  document
    .querySelector(".dialog-close")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      closeDialog();
    });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog?.open) closeDialog();
  });

  const social = config.socialLinks || {};
  document.querySelectorAll("[data-social]").forEach((link) => {
    const value = social[link.dataset.social];
    if (value) link.href = value;
  });

  const form = document.querySelector("#inquiry-form");
  const status = document.querySelector("#form-status");
  const integrationNote = document.querySelector("#integration-note");
  const consentError = document.querySelector(".consent-error");
  const supabaseReady = Boolean(
    config.supabaseUrl &&
      config.supabaseAnonKey &&
      window.supabase?.createClient,
  );
  let client = null;
  if (supabaseReady) {
    try {
      client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
      );
      if (integrationNote) {
        integrationNote.classList.add("is-connected");
        integrationNote.innerHTML =
          '<span class="status-dot"></span> Supabase configured · inquiry storage ready';
      }
    } catch (error) {
      console.error("Supabase client initialization failed.", error);
    }
  }

  const validateField = (field) => {
    const message = field.closest(".field")?.querySelector(".field-error");
    let error = "";
    if (field.validity.valueMissing) error = "This field is required.";
    else if (field.type === "email" && field.validity.typeMismatch)
      error = "Enter a valid email address.";
    else if (field.validity.tooShort)
      error = `Please enter at least ${field.minLength} characters.`;
    else if (field.validity.tooLong)
      error = `Please keep this under ${field.maxLength} characters.`;
    else if (
      (field.name === "name" || field.name === "projectDescription") &&
      field.value.trim().length < field.minLength
    ) {
      error = `Please enter at least ${field.minLength} characters.`;
    }
    field.setAttribute("aria-invalid", String(Boolean(error)));
    if (message) message.textContent = error;
    return !error;
  };

  form
    ?.querySelectorAll('input:not([type="checkbox"]),select,textarea')
    .forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
      field.addEventListener("change", () => validateField(field));
    });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = [
      ...form.querySelectorAll('input:not([type="checkbox"]),select,textarea'),
    ];
    const valid = fields.map(validateField).every(Boolean);
    const consent = form.elements.namedItem("contactConsent");
    if (consentError)
      consentError.textContent = consent.checked
        ? ""
        : "Please confirm you agree to be contacted.";
    if (!consent.checked) consent.setAttribute("aria-invalid", "true");
    else consent.removeAttribute("aria-invalid");
    if (!valid || !consent.checked) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const payload = {
      name: form.elements.namedItem("name").value.trim(),
      client_email: form.elements.namedItem("clientEmail").value.trim(),
      service_needed: form.elements.namedItem("serviceNeeded").value,
      budget_range: form.elements.namedItem("budgetRange").value,
      project_description: form.elements
        .namedItem("projectDescription")
        .value.trim(),
    };
    const submitButton = form.querySelector('[type="submit"]');
    const submitLabel = submitButton?.querySelector(".submit-label");
    const originalLabel = submitLabel?.textContent || "Send project inquiry";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }
    if (submitLabel) submitLabel.textContent = "Sending securely…";
    if (status) {
      status.hidden = false;
      status.classList.remove("is-error");
      status.textContent = "Preparing your inquiry…";
    }

    if (!client) {
      if (status)
        status.textContent =
          "Preview mode: your inquiry passed validation, but nothing was saved or emailed. Add your Supabase project URL and anon key in assets/config.js to activate submissions.";
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
      if (submitLabel) submitLabel.textContent = originalLabel;
      return;
    }

    try {
      const { error: insertError } = await client
        .from(config.inquiriesTable || "project_inquiries")
        .insert([payload]);
      if (insertError) throw insertError;
      let emailSent = false;
      let emailAttempted = false;
      if (config.emailFunctionName) {
        emailAttempted = true;
        const { error: emailError } = await client.functions.invoke(
          config.emailFunctionName,
          { body: payload },
        );
        emailSent = !emailError;
        if (emailError)
          console.warn(
            "Inquiry saved; email notification did not complete. Verify the configured Edge Function and its secrets.",
          );
      }
      if (status) {
        status.textContent = emailSent
          ? "Thank you — your inquiry was saved and a notification was sent. I’ll be in touch soon."
          : emailAttempted
            ? "Thank you — your inquiry was saved. The email notification needs configuration; I’ll still be able to review your request."
            : "Thank you — your inquiry was saved. I’ll be in touch soon.";
      }
      form.reset();
      form
        .querySelectorAll('[aria-invalid="true"]')
        .forEach((field) => field.removeAttribute("aria-invalid"));
      form.querySelectorAll(".field-error").forEach((message) => {
        message.textContent = "";
      });
      if (consentError) consentError.textContent = "";
    } catch (error) {
      console.error(
        "Project inquiry could not be submitted. Check the Supabase connection, table name and insert policy.",
      );
      if (status) {
        status.classList.add("is-error");
        status.textContent =
          "I couldn’t submit your inquiry just now. Please try again, or use the email link on this page.";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
      if (submitLabel) submitLabel.textContent = originalLabel;
    }
  });

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
