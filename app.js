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
    id: "auraconsult-live",
    title: "AuraConsult",
    shortTitle: "واجهة استشارية استراتيجية منشورة",
    description: "Landing Page داكنة لمفهوم استشارات استراتيجية تعرض الخدمات، منهجية Diagnose–Design–Deliver، حالات توضيحية قابلة للتصفية ونموذج طلب تدقيق استراتيجي. الأرقام والمحتوى داخلها توضيحية وليست نتائج عملاء.",
    category: "landing",
    categoryLabel: "Landing Pages",
    tags: ["Strategy UI", "Case studies", "Lead form"],
    image: "./assets/projects/auraconsult-live.png",
    link: "https://bariqaday-web.github.io/auraconsult/"
  },
  {
    id: "unpublished-app",
    title: "تطبيق تجريبي غير منشور",
    shortTitle: "واجهات تطبيق قيد النشر",
    description: "تجربة تطبيق شخصية غير منشورة، ستُعرض هنا من خلال صور الشاشات فقط. أضيفي الصور داخل assets/projects/ بالأسماء المحددة في الكود عند رفعها إلى المستودع.",
    category: "mobile",
    categoryLabel: "تطبيقات",
    tags: ["Mobile UI", "Arabic RTL", "Product flow"],
    visual: "phone",
    gallery: [
      "./assets/projects/unpublished-app-1.png",
      "./assets/projects/unpublished-app-2.png",
      "./assets/projects/unpublished-app-3.png"
    ]
  },
  {
    id: "auraconsult",
    title: "AuraConsult",
    shortTitle: "واجهة استشارية تنفيذية داكنة",
    description: "Landing Page تجريبية لشركة استشارات استراتيجية، مبنية حول فكرة تحويل التعقيد إلى نمو قابل للقياس. تضم الخدمات، المنهجية، دراسات الحالة، إبراز القيادة، ونموذج Strategy Audit تفاعليًا على مستوى الواجهة فقط.",
    category: "landing",
    categoryLabel: "Landing Pages",
    tags: ["Executive strategy", "Dark UI", "Landing page", "Vanilla JS"],
    visual: "consult",
    link: "./projects/auraconsult/index.html"
  },
  {
    id: "auraconsult-v2",
    title: "AuraConsult / Strategy Audit",
    shortTitle: "نسخة تنفيذية بلمسات برتقالية",
    description: "نسخة ثانية مستقلة من مفهوم AuraConsult، تتجه إلى أسلوب تنفيذي أكثر دفئًا باستخدام البرتقالي مع الكحلي. تركّز على خدمات الاستشارات، نتائج الحالات، منهجية العمل، إبراز المستشار، وتحويل Strategy Audit إلى دعوة واضحة للتفاعل.",
    category: "landing",
    categoryLabel: "Landing Pages",
    tags: ["Executive UI", "Strategy audit", "Orange accent", "Tailwind"],
    visual: "consult-v2",
    link: "./projects/auraconsult-v2/index.html"
  },
  {
    id: "estabraq-portfolio",
    title: "Estabraq Addai / AuraLabs",
    shortTitle: "بورتفوليو مطور وواجهة تجارب رقمية",
    description: "قالب Portfolio شخصي تجريبي يجمع بين هوية المطور، شارات التقنيات، مجموعة AuraLabs من اتجاهات صفحات الهبوط، الخدمات، ونموذج تواصل جاهز للتخصيص. يقدّم المشروع تجربة عرض واسعة للواجهات، وليس سجلًا موثقًا لعملاء أو مشاريع تجارية.",
    category: "portfolio",
    categoryLabel: "بورتفوليو وسيرة",
    tags: ["Portfolio", "AuraLabs", "Full-stack concept", "UI/UX"],
    visual: "estabraq",
    link: "./projects/estabraq-portfolio/index.html"
  },
  {
    id: "estabraq-addai-final",
    title: "Estabraq Addai / AuraLabs Studio",
    shortTitle: "بورتفوليو تفاعلي مع معرض قوالب",
    description: "نسخة متقدمة من تجربة البورتفوليو الشخصي، تستخدم صورة Hero أصلية، معرضًا تفاعليًا يضم 10 اتجاهات لصفحات الهبوط، شارات للتقنيات، خدمات تطوير وتصميم، ونموذج استفسار جاهز للربط الاختياري مع Supabase وEdge Function للبريد.",
    category: "portfolio",
    categoryLabel: "بورتفوليو وسيرة",
    tags: ["HTML5", "Tailwind CSS", "Vanilla JS", "Supabase", "Edge Function"],
    visual: "estabraq-final",
    link: "./projects/estabraq-addai-final/index.html"
  },
  {
    id: "silex",
    title: "Silex / Salix",
    shortTitle: "سوق اجتماعي عربي للتجار والزبائن",
    description: "أول تطبيق فعلي منفذ بيد استبرق: سوق اجتماعي عربي باتجاه RTL كامل، يجمع اكتشاف المنتجات والمتاجر، السلة والطلبات، الملفات الشخصية، القصص، المنشورات، المحادثات والإشعارات. يضم كذلك مسارات للتاجر ولوحة إدارة وتحليلات ومساعد متجر محلي قائم على قواعد عربية. النسخة الحالية تحتاج إعداد Supabase وبعض الأعمال الخلفية قبل النشر الإنتاجي.",
    category: "mobile",
    categoryLabel: "تطبيقات",
    tags: ["Next.js 15", "TypeScript", "Supabase", "Capacitor", "RTL"],
    visual: "silex",
    link: "./projects/silex/index.html"
  },
  {
    id: "ride-connect",
    title: "Ride Connect",
    shortTitle: "تطبيق ويب تجريبي لحجز الرحلات",
    description: "تجربة تطبيق تنقل عربية RTL لحجز الرحلات، مع واجهات لإدارة الملف الشخصي، تفاصيل السائق والرحلة، الدفع، متابعة الرحلات والتقييمات. المشروع تدريبي وتجريبي غير مكتمل، لكنه يوضح اتجاهًا بصريًا واضحًا وتجربة استخدام قابلة للتطوير.",
    category: "mobile",
    categoryLabel: "تطبيقات",
    tags: ["React 19", "TypeScript", "TanStack", "Tailwind", "Supabase"],
    visual: "ride",
    link: "./projects/ride-connect/index.html"
  },
  {
    id: "auracv",
    title: "AuraCV",
    shortTitle: "قالب بورتفوليو وسيرة ذاتية مستقل",
    description: "قالب Portfolio وResume مستقل بنمط فاتح، صُمم لعرض ملف مهني في أنظمة التصميم وتطوير الواجهات الأمامية. يجمع بين شريط تنقل عائم، مؤشرات شخصية، بطاقات مشاريع، جدول خبرات، مصفوفة مهارات وأدوات، توصيات، ونموذج تواصل منظم.",
    category: "portfolio",
    categoryLabel: "بورتفوليو وسيرة",
    tags: ["Portfolio", "Resume", "Design system", "Frontend"],
    visual: "aura"
  },
  {
    id: "pulse",
    title: "نبض البيانات",
    shortTitle: "لوحة تحكم هادئة للبيانات",
    description: "تصور أولي للوحة تحكم تساعد المستخدم على قراءة الأرقام بسرعة، من خلال تسلسل بصري واضح ومساحات مريحة ومؤشرات لا تتنافس على الانتباه.",
    category: "dashboard",
    categoryLabel: "لوحات تحكم",
    tags: ["Dashboard", "Data UI", "Visual hierarchy"],
    visual: "dashboard"
  },
  {
    id: "rwaq",
    title: "رَواق",
    shortTitle: "واجهة متجر بطابع تحريري",
    description: "مفهوم لواجهة متجر إلكتروني يوازن بين حضور المنتجات وهدوء التصفح، مع اتجاه بصري دافئ يترك مساحة للصور والاختيارات المهمة.",
    category: "commerce",
    categoryLabel: "تجارة إلكترونية",
    tags: ["E-commerce", "Editorial UI", "Responsive"],
    visual: "store"
  },
  {
    id: "sukun",
    title: "سُكون",
    shortTitle: "تطبيق عادات بإيقاع بسيط",
    description: "تجربة واجهة لتطبيق عادات يومية، صممتها حول فكرة أن التقدم الصغير يستحق أن يُرى بوضوح، دون ازدحام أو ضغط بصري.",
    category: "mobile",
    categoryLabel: "تطبيقات جوال",
    tags: ["Mobile UI", "Habit tracking", "UX concept"],
    visual: "phone"
  }
];

const grid = document.querySelector("#project-grid");
const modal = document.querySelector("#project-modal");

function visualMarkup(type) {
  if (type === "ride") return `<div class="ride-ui"><div class="ride-top"><b>Ride <span>Connect</span></b><i>ب</i></div><small>مرحبًا بك</small><strong>إلى أين نذهب<br>اليوم؟</strong><div class="ride-map"><i></i><i></i></div><div class="ride-trip"><b>رحلة مريحة</b><span>السائق قريب منك · 4.9 ★</span><em>$12.50</em></div></div>`;
  if (type === "silex") return `<div class="silex-ui"><img src="./projects/silex/screenshots/onboarding-desktop.png" alt="لقطة حقيقية من واجهة Silex" /><div class="silex-badge"><b>Silex / Salix</b><span>سوق اجتماعي عربي · RTL</span></div></div>`;
  if (type === "estabraq-final") return `<div class="estabraq-final-ui"><img src="./projects/estabraq-addai-final/assets/estabraq-hero.webp" alt="معاينة واجهة Estabraq Addai" /><div class="estabraq-final-overlay"><b>Estabraq Addai</b><span>AuraLabs / 10 templates</span></div></div>`;
  if (type === "estabraq") return `<div class="estabraq-ui"><div class="estabraq-nav"><b>EA</b><i></i><i></i><em>Book a project ↗</em></div><div class="estabraq-body"><div class="estabraq-copy"><small>FULL-STACK DEVELOPER · UI/UX</small><strong>Building high-converting<br><span>digital solutions.</span></strong><i></i><i></i></div><div class="estabraq-panel"><b>Developer workspace</b><strong>Product intelligence</strong><div class="estabraq-chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="estabraq-stats"><i></i><i></i></div></div></div></div>`;
  if (type === "consult-v2") return `<div class="consult-v2-ui"><div class="consult-v2-nav"><b>Aura<span>Consult</span></b><i></i><i></i><em>Book a call ↗</em></div><div class="consult-v2-body"><div class="consult-v2-copy"><small>CORE ADVISORY SERVICES</small><strong>Make growth<br><span>durable.</span></strong><i></i><i></i></div><div class="consult-v2-panel"><b>Executive dashboard</b><strong>Growth operating system</strong><div class="consult-v2-metrics"><i></i><i></i><i></i></div><div class="consult-v2-form"><i></i><i></i><i></i></div></div></div></div>`;
  if (type === "consult") return `<div class="consult-ui"><div class="consult-nav"><b>Aura<span>Consult</span></b><i></i><i></i><em>Book a call ↗</em></div><div class="consult-body"><div class="consult-copy"><small>STRATEGY BUILT FOR WHAT'S NEXT</small><strong>Scaling high-growth<br><span>enterprises.</span></strong><i></i><i></i><i></i></div><div class="consult-visual"><img src="./projects/auraconsult/assets/aura-hero.svg" alt="" /></div></div></div>`;
  if (type === "aura") return `<div class="aura-ui"><div class="aura-side"><b>A</b><i></i><i></i><i></i><i></i></div><div class="aura-main"><div class="aura-nav"><span></span><span></span><span></span></div><div class="aura-profile"><div class="aura-avatar"></div><div><b></b><i></i></div><em></em></div><div class="aura-grid"><i></i><i></i><i></i></div><div class="aura-row"><i></i><i></i></div></div></div>`;
  if (type === "store") return `<div class="store-ui"><div class="store-header"><span class="store-brand">رَواق</span><span class="store-icons"><i></i><i></i><i></i></span></div><div class="store-hero"><div class="store-copy"><i></i><i></i><i></i></div><div class="store-product"></div></div><div class="store-row"><i></i><i></i><i></i></div></div>`;
  if (type === "phone") return `<div class="phone-ui"><div class="phone-top"><i></i><b></b></div><div class="phone-content"><div class="phone-greeting">صباح الخير <b>خطوة صغيرة اليوم</b></div><div class="phone-ring">68%<small>هذا الأسبوع</small></div><div class="phone-list"><i></i><i></i><i></i></div></div></div>`;
  return `<div class="mock-ui"><div class="mock-nav"><span class="mock-dot"></span><span class="mock-bar"></span></div><div class="mock-body"><div class="mock-sidebar"><i></i><i></i><i></i><i></i></div><div class="mock-board"><div class="mock-title"><b></b><em></em></div><div class="mock-stat-row"><i class="mock-stat"></i><i class="mock-stat"></i><i class="mock-stat"></i></div><div class="mock-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div></div>`;
}

function imageMarkup(project, modalView = false) {
  if (!project.image) return visualMarkup(project.visual);
  return `<div class="project-image-wrap"><img src="${project.image}" alt="معاينة واجهة ${project.title}" loading="${modalView ? "eager" : "lazy"}" onerror="this.closest('.project-image-wrap').classList.add('image-missing')" /></div>`;
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
        ${project.image ? imageMarkup(project) : visualMarkup(project.visual)}
        <div class="card-badges"><span class="category-badge">${project.categoryLabel}</span><span class="status-badge ${project.link ? "live" : "pending"}"><i></i>${project.link ? "نسخة حية" : "قيد النشر"}</span></div>
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
  });
}

function modalVisual(project) {
  if (!project.gallery) return project.image ? imageMarkup(project, true) : visualMarkup(project.visual);
  return `<div class="modal-gallery"><div class="gallery-frame"><img id="gallery-image" src="${project.gallery[0]}" alt="واجهة ${project.title} 1" onerror="this.closest('.gallery-frame').classList.add('image-missing')" /></div><div class="gallery-controls"><button type="button" data-gallery-prev aria-label="الصورة السابقة">→</button><span id="gallery-counter">1 / ${project.gallery.length}</span><button type="button" data-gallery-next aria-label="الصورة التالية">←</button></div></div>`;
}

function openModal(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;
  document.querySelector("#modal-visual").innerHTML = modalVisual(project);
  document.querySelector("#modal-visual").style.background = project.visual === "store" ? "#f1e0d4" : project.visual === "phone" ? "#e7e4fa" : project.visual === "aura" ? "#e4ebdf" : project.visual === "consult" ? "#172033" : project.visual === "consult-v2" ? "#111827" : project.visual === "estabraq" ? "#111827" : project.visual === "estabraq-final" ? "#111827" : project.visual === "silex" ? "#f5f2ea" : project.visual === "ride" ? "#eef5fb" : "#edf1f7";
  document.querySelector("#modal-title").textContent = project.title;
  document.querySelector("#modal-category").textContent = project.categoryLabel;
  document.querySelector("#modal-number").textContent = `${String(projects.indexOf(project) + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
  document.querySelector("#modal-description").textContent = project.description;
  document.querySelector("#modal-tags").innerHTML = project.tags.map((tag) => `<span>${tag}</span>`).join("");
  const projectLink = document.querySelector("#modal-project-link");
  projectLink.hidden = !project.link;
  projectLink.href = project.link || "#";
  projectLink.innerHTML = project.link ? "فتح النسخة الحية <span>↗</span>" : "";

  if (project.gallery) {
    let current = 0;
    const galleryImage = document.querySelector("#gallery-image");
    const counter = document.querySelector("#gallery-counter");
    const updateGallery = (step) => { current = (current + step + project.gallery.length) % project.gallery.length; galleryImage.src = project.gallery[current]; galleryImage.alt = `واجهة ${project.title} ${current + 1}`; counter.textContent = `${current + 1} / ${project.gallery.length}`; };
    document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => updateGallery(1));
    document.querySelector("[data-gallery-next]")?.addEventListener("click", () => updateGallery(-1));
  }
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
