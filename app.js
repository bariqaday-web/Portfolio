const projects = [
  {
    id: "aurafolio-live",
    title: "AuraFolio",
    shortTitle: "بورتفوليو داكن لمصمم منتجات ومطور",
    description: "قالب Portfolio شخصي بأسلوب داكن يعرض الخبرة، المشاريع، الخدمات، المهارات وتجارب العمل، مع دعوات واضحة للتواصل ونموذج لحجز مكالمة.",
    category: "portfolio",
    categoryLabel: "بورتفوليو وسيرة",
    tags: ["Product design", "React", "Tailwind"],
    image: "./assets/projects/aurafolio.png",
    link: "https://bariqaday-web.github.io/AuraFolio/"
  },
  {
    id: "aurapay-live",
    title: "AuraPay",
    shortTitle: "واجهة مفهوم لخدمات مالية عالمية",
    description: "Landing Page لمفهوم مالي يعرض لوحة الحساب، التحويلات الدولية، البطاقات، التحليلات، الأمان، المحافظ متعددة العملات وخطط الاشتراك.",
    category: "commerce",
    categoryLabel: "تجارة إلكترونية",
    tags: ["Finance UI", "Dashboard", "Responsive"],
    image: "./assets/projects/aurapay.png",
    link: "https://bariqaday-web.github.io/AuraPay/"
  },
  {
    id: "auratask-live",
    title: "AuraTask",
    shortTitle: "منصة أتمتة سير العمل بالذكاء الاصطناعي",
    description: "واجهة SaaS تعرض أتمتة مهام الفريق، جدولة ذكية، تلخيص المستندات، تكاملات متعددة، تحليلات لحظية، خطط اشتراك ونموذج خريطة أتمتة.",
    category: "dashboard",
    categoryLabel: "لوحات تحكم",
    tags: ["AI workflows", "Analytics", "Integrations"],
    image: "./assets/projects/auratask.png",
    link: "https://bariqaday-web.github.io/AuraTask/"
  },
  {
    id: "auraestate-live",
    title: "AuraEstate",
    shortTitle: "منصة عقارات واستثمار راقية",
    description: "Landing Page عقارية تعرض مساكن مختارة، بطاقات العقارات، معلومات العائد الاستثماري، جولة افتراضية ونموذج حجز استشارة خاصة.",
    category: "landing",
    categoryLabel: "Landing Pages",
    tags: ["Real estate", "Virtual tour", "Lead form"],
    image: "./assets/projects/auraestate.png",
    link: "https://bariqaday-web.github.io/AuraEstate/"
  },
  {
    id: "auraai-template-live",
    title: "AuraAI Template",
    shortTitle: "قالب SaaS لأتمتة سير العمل بالذكاء الاصطناعي",
    description: "قالب Landing Page مختصر لمنصة بنية تحتية للذكاء الاصطناعي، يعرض تنفيذ خطوط البيانات، الأمان، Webhooks، التسعير ونموذج قائمة الانتظار.",
    category: "landing",
    categoryLabel: "Landing Pages",
    tags: ["AI SaaS", "Webhooks", "Pricing"],
    image: "./assets/projects/template.png",
    link: "https://bariqaday-web.github.io/template/"
  },
  {
    id: "novasync-live",
    title: "NovaSync",
    shortTitle: "تجربة تطبيق إنتاجية مع مزامنة ذكية",
    description: "واجهة منتج إنتاجية تعرض مزامنة المهام والملاحظات، رؤى الذكاء الاصطناعي، العمل دون اتصال، التشفير، ووصول التطبيق على iOS وAndroid.",
    category: "mobile",
    categoryLabel: "تطبيقات",
    tags: ["Mobile product", "Offline mode", "AI insights"],
    image: "./assets/projects/novasync.png",
    link: "https://bariqaday-web.github.io/NovaSync/"
  },
  {
    id: "silex",
    title: "Silex / Salix",
    shortTitle: "أول تطبيق كامل بنيته بـ React Native وExpo",
    description: "أول تطبيق كامل بنيته بيدي باستخدام React Native وExpo: سوق اجتماعي عربي خاص يجمع المنتجات والمتاجر والسلة والطلبات والمنشورات والقصص والمحادثات والإشعارات، مع مسارات للتاجر ولوحة إدارة. لم يُنشر لعدم توفر موارد الدعم والتسويق، لكنه نسخة تجريبية شغالة ومميزة وقابلة للتطوير.",
    category: "mobile",
    categoryLabel: "تطبيقات",
    tags: ["React Native", "Expo", "Arabic RTL"],
    status: "غير منشور · نسخة خاصة",
    visual: "phone",
    image: "./assets/projects/silex-1.png",
    video: "./assets/projects/silex-demo.mp4",
    gallery: [
      "./assets/projects/silex-1.png",
      "./assets/projects/silex-2.png",
      "./assets/projects/silex-3.png",
      "./assets/projects/silex-4.png",
      "./assets/projects/silex-5.png"
    ]
  }
];

const grid = document.querySelector("#project-grid");
const modal = document.querySelector("#project-modal");

function visualMarkup(type) {
  if (type === "phone") return `<div class="phone-ui"><div class="phone-top"><i></i><b></b></div><div class="phone-content"><div class="phone-greeting">صباح الخير <b>خطوة صغيرة اليوم</b></div><div class="phone-ring">68%<small>هذا الأسبوع</small></div><div class="phone-list"><i></i><i></i><i></i></div></div></div>`;
  return `<div class="mock-ui"><div class="mock-nav"><span class="mock-dot"></span><span class="mock-bar"></span></div><div class="mock-body"><div class="mock-sidebar"><i></i><i></i><i></i><i></i></div><div class="mock-board"><div class="mock-title"><b></b><em></em></div><div class="mock-stat-row"><i class="mock-stat"></i><i class="mock-stat"></i><i class="mock-stat"></i></div><div class="mock-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div></div>`;
}

function imageMarkup(project, modalView = false) {
  if (!project.image) return visualMarkup(project.visual);
  return `<div class="project-image-wrap"><img src="${project.image}" alt="معاينة واجهة ${project.title}" loading="${modalView ? "eager" : "lazy"}" onerror="this.classList.add('image-failed')" /><div class="image-fallback">${visualMarkup(project.visual)}</div></div>`;
}

function videoMarkup(project) {
  const poster = project.image || "";
  return `<div class="project-video-wrap"><video controls playsinline preload="metadata" poster="${poster}" onerror="this.classList.add('video-failed')"><source src="${project.video}" type="video/mp4" /></video><img class="video-fallback" src="${poster}" alt="معاينة واجهة ${project.title}" /></div>`;
}

function renderCounts() {
  document.querySelectorAll("[data-count]").forEach((element) => {
    const category = element.dataset.count;
    element.textContent = category === "all" ? projects.length : projects.filter((project) => project.category === category).length;
  });
  const metric = document.querySelector(".metrics div:first-child strong");
  if (metric) metric.textContent = String(projects.length).padStart(2, "0");
}

function renderProjects(filter = "all") {
  const visible = projects.filter((project) => filter === "all" || project.category === filter);
  grid.innerHTML = visible.map((project) => `
    <article class="project-card ${project.link ? "is-live" : "is-unpublished"}" data-id="${project.id}" tabindex="0" aria-label="فتح تفاصيل ${project.title}">
      <div class="project-visual ${project.image ? "has-project-image" : ""}">
        ${project.video ? videoMarkup(project) : project.image ? imageMarkup(project) : visualMarkup(project.visual)}
        <div class="card-badges"><span class="category-badge">${project.categoryLabel}</span><span class="status-badge ${project.link ? "live" : "pending"}"><i></i>${project.link ? "نسخة حية" : (project.status || "غير منشور")}</span></div>
      </div>
      <div class="project-info">
        <div class="project-copy"><h3>${project.title}</h3><p>${project.shortTitle}</p><div class="card-tags">${project.tags.slice(0, 3).map((tag) => `<span>${tag}</span>`).join("")}</div></div>
        <div class="project-index">${String(projects.indexOf(project) + 1).padStart(2, "0")}</div>
      </div>
      <div class="card-actions"><button class="card-detail" type="button">${project.link ? "التفاصيل" : "معرض الصور"}</button>${project.link ? `<a class="card-live" href="${project.link}" target="_blank" rel="noopener">فتح النسخة الحية ↗</a>` : ""}</div>
    </article>
  `).join("");

  grid.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", (event) => {
      if (event.target !== card) return;
      if (event.key === "Enter" || event.key === " ") openModal(card.dataset.id);
    });
    card.querySelector(".card-detail")?.addEventListener("click", (event) => { event.stopPropagation(); openModal(card.dataset.id); });
    card.querySelector(".card-live")?.addEventListener("click", (event) => event.stopPropagation());
    card.querySelector("video")?.addEventListener("click", (event) => event.stopPropagation());
  });
}

function modalVisual(project) {
  return project.video ? videoMarkup(project) : project.image ? imageMarkup(project, true) : visualMarkup(project.visual);
}

function galleryMarkup(project, sources) {
  return `<div class="modal-gallery"><div class="gallery-frame"><img id="gallery-image" src="${sources[0]}" alt="واجهة ${project.title} 1" /></div><div class="gallery-controls"><button type="button" data-gallery-prev aria-label="الصورة السابقة">→</button><span id="gallery-counter">1 / ${sources.length}</span><button type="button" data-gallery-next aria-label="الصورة التالية">←</button></div></div>`;
}

function availableGallery(project) {
  return Promise.all(project.gallery.map((source) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(source);
    image.onerror = () => resolve(null);
    image.src = source;
  }))).then((sources) => sources.filter(Boolean));
}

function bindGallery(project, sources) {
  let current = 0;
  const galleryImage = document.querySelector("#gallery-image");
  const counter = document.querySelector("#gallery-counter");
  const updateGallery = (step) => { current = (current + step + sources.length) % sources.length; galleryImage.src = sources[current]; galleryImage.alt = `واجهة ${project.title} ${current + 1}`; counter.textContent = `${current + 1} / ${sources.length}`; };
  document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => updateGallery(1));
  document.querySelector("[data-gallery-next]")?.addEventListener("click", () => updateGallery(-1));
}

function openModal(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;
  document.querySelector("#modal-visual").innerHTML = modalVisual(project);
  document.querySelector("#modal-visual").style.background = project.visual === "phone" ? "#e7e4fa" : "#edf1f7";
  document.querySelector("#modal-title").textContent = project.title;
  document.querySelector("#modal-category").textContent = project.categoryLabel;
  document.querySelector("#modal-number").textContent = `${String(projects.indexOf(project) + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
  document.querySelector("#modal-description").textContent = project.description;
  document.querySelector("#modal-tags").innerHTML = project.tags.map((tag) => `<span>${tag}</span>`).join("");
  const projectLink = document.querySelector("#modal-project-link");
  projectLink.hidden = !project.link;
  projectLink.href = project.link || "#";
  projectLink.innerHTML = project.link ? "فتح النسخة الحية <span>↗</span>" : "";

  if (project.gallery) availableGallery(project).then((sources) => {
    if (!modal.classList.contains("open")) return;
    if (sources.length) {
      document.querySelector("#modal-visual").innerHTML = project.video ? `<div class="modal-media-stack">${videoMarkup(project)}${galleryMarkup(project, sources)}</div>` : galleryMarkup(project, sources);
      bindGallery(project, sources);
    }
  });
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close-modal]").forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-button").forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-selected", "false"); });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    renderProjects(button.dataset.filter);
  });
});

renderCounts();
renderProjects();
