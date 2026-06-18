const SITE_STATUS = "BETA Sitio en contrucción";
const SITE_VERSION = "V. 0.7.0";
const GA_MEASUREMENT_ID = "G-VNHC1Z3FXZ";
const ECOSYSTEM_LINKS = [
  ["home", "/", "Home"],
  ["events", "/#events", "Eventos"],
  ["studio", "/#studio", "Estudios"],
  ["demonz", "/#demonz", "dem00nz"],
  ["media", "/media/", "Media"],
  ["store", "/store/", "Tienda"],
  ["games", "/minijuegos/", "Minijuegos"],
  ["portal", "/portal/", "Portal"],
];

function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
}

function cleanIndexURL() {
  const { pathname, search, hash } = window.location;
  if (!pathname.endsWith('/index.html')) return;

  const cleanPath = pathname.slice(0, -'index.html'.length);
  window.history.replaceState(null, '', `${cleanPath}${search}${hash}`);
}

function hydrateCanonicalMeta() {
  const cleanURL = new URL(window.location.href);
  if (cleanURL.pathname.endsWith('/index.html')) {
    cleanURL.pathname = cleanURL.pathname.slice(0, -'index.html'.length);
  }

  document.querySelectorAll('meta[property="og:url"]').forEach((meta) => {
    meta.setAttribute('content', cleanURL.href);
  });
}

cleanIndexURL();
hydrateCanonicalMeta();
initAnalytics();

function renderSubNav(module) {
  const path = window.location.pathname;
  const hash = window.location.hash.slice(1);
  const page = document.body.dataset.page || "";
  const item = (href, label, active = false, attrs = "") => (
    `<a class="hr-nav__sub-link" href="${href}"${active ? ' aria-current="page"' : ""}${attrs}>${label}</a>`
  );

  if (module === "media") {
    return [
      item("/media/", "Publicaciones", !path.includes("/admin")),
      item("/media/#media-filters", "Categorías"),
      item(
        "/media/admin.html",
        "CMS",
        path.includes("/admin"),
        ` data-media-admin-link${path.includes("/admin") ? "" : " hidden"}`,
      ),
    ].join("");
  }

  if (module === "store") {
    return [
      item("/store/", "Tienda", page === "catalog" || page === "product"),
      item("/store/cart.html", 'Carrito <span class="cart-count">0</span>', page === "cart"),
      item(
        "/store/orders.html",
        "Mis compras",
        path.endsWith("/orders.html"),
        path.endsWith("/orders.html") ? "" : " data-auth-link hidden",
      ),
    ].join("");
  }

  if (module === "games") {
    return [
      item("/minijuegos/", "Juegos", true),
      item("/portal/dashboard.html#client-rewards", "Ranking"),
    ].join("");
  }

  if (module === "portal") {
    return [
      item("/portal/dashboard.html#overview", "Inicio", path.endsWith("/dashboard.html") && (!hash || hash === "overview"), ' data-portal-section="overview"'),
      item("/portal/dashboard.html#client-membership", "Cliente", hash.startsWith("client-"), ' data-portal-section="client-membership"'),
      item("/portal/dashboard.html#collab-tasks", "Colaborador", hash.startsWith("collab-"), ' data-portal-section="collab-tasks"'),
      item("/portal/dashboard.html#erp-ops", "ERP", hash.startsWith("erp-") || hash === "admin-table-editor", ' data-portal-section="erp-ops"'),
      '<span class="hr-nav__context-title" id="js-topbar-section" aria-live="polite"></span>',
    ].join("");
  }

  if (module === "tickets") {
    return [
      item("/tickets/", "Eventos", path.endsWith("/tickets/") || path.endsWith("/tickets/index.html")),
      item("/tickets/validate.html", "Validar", path.endsWith("/validate.html")),
      item("/tickets/generate.html", "Admin", path.endsWith("/generate.html") || path.endsWith("/view.html")),
    ].join("");
  }

  return "";
}

function renderNavActions(module) {
  if (document.body.classList.contains("db-body")) {
    return `
      <button class="db-topbar__icon-btn" id="js-notifications-toggle" aria-label="Notificaciones"
        aria-expanded="false" aria-controls="js-notifications-panel">
        <span class="db-icon db-icon--bell" aria-hidden="true"></span>
        <span class="db-badge" id="js-notif-count" aria-label="notificaciones sin leer" hidden></span>
      </button>
      <button class="db-user-chip" id="js-user-menu-toggle" aria-haspopup="true" aria-expanded="false"
        aria-controls="js-user-menu js-sidebar" aria-label="Abrir menú">
        <span class="db-icon db-icon--menu" aria-hidden="true"></span>
        <span class="db-user-chip__avatar" id="js-user-avatar" aria-hidden="true"></span>
        <span class="db-user-chip__name" id="js-user-display-name">—</span>
      </button>
      <nav class="db-user-menu" id="js-user-menu" aria-label="Menú de usuario" hidden>
        <ul class="db-user-menu__list" role="list">
          <li><a class="db-user-menu__item" href="/">Volver al sitio</a></li>
          <li><button class="db-user-menu__item" data-action="profile">Perfil</button></li>
          <li><button class="db-user-menu__item" data-action="settings">Ajustes</button></li>
          <li><button class="db-user-menu__item db-user-menu__item--danger" data-action="logout">Cerrar sesión</button></li>
        </ul>
      </nav>
    `;
  }

  if (module === "store") {
    return `
      <a class="hr-nav__action hr-nav__action--cart" href="/store/cart.html">
        Carrito <span class="cart-count">0</span>
      </a>
      <a class="hr-nav__action" href="/portal/" data-hr-account>Portal</a>
    `;
  }

  if (module === "media" && document.body.classList.contains("media-admin")) {
    return `
      <a class="hr-nav__action" href="/media/" target="_blank" rel="noopener">Ver Media</a>
      <button class="hr-nav__action" id="logout-button" type="button">Cerrar sesión</button>
    `;
  }

  if (module === "tickets") {
    return `
      <span id="session-user" class="hr-nav__user">Verificando sesión…</span>
      <a class="hr-nav__action" href="/portal/dashboard.html">Portal</a>
    `;
  }

  return `<a class="hr-nav__action" href="/portal/" data-hr-account>Portal</a>`;
}

function renderGlobalNav() {
  const target = document.getElementById("hr-global-nav");
  if (!target) return;

  const module = document.body.dataset.hrContext || "home";
  const accent = module === "media" ? "media" : "brand";
  const activeModule = module === "tickets" ? "events" : module;
  const subnav = renderSubNav(module);
  const actionsClass = document.body.classList.contains("db-body")
    ? "hr-nav__actions db-topbar__actions"
    : "hr-nav__actions";

  target.innerHTML = `
    <header class="hr-nav" data-module="${module}" data-accent="${accent}">
      <div class="hr-nav__main">
        <a class="hr-nav__brand" href="/" aria-label="Hidden Room, inicio">
          <img src="/assets/img/white_logo.webp" alt="">
          <span>Hidden Room</span>
        </a>
        <nav class="hr-nav__links" aria-label="Navegación principal">
          ${ECOSYSTEM_LINKS.map(([key, href, label]) => `
            <a href="${href}"${key === activeModule ? ' aria-current="page"' : ""}>${label}</a>
          `).join("")}
        </nav>
        <div class="${actionsClass}">
          ${renderNavActions(module)}
          <button class="hr-nav__mobile-toggle" id="hr-global-menu-toggle" type="button"
            aria-label="Abrir navegación global" aria-expanded="false" aria-controls="hr-global-menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <nav class="hr-nav__mobile-menu" id="hr-global-menu" aria-label="Navegación global móvil" hidden>
        ${ECOSYSTEM_LINKS.map(([key, href, label]) => `
          <a href="${href}"${key === activeModule ? ' aria-current="page"' : ""}>${label}</a>
        `).join("")}
      </nav>
      ${subnav ? `<nav class="hr-nav__sub" aria-label="Navegación contextual">${subnav}</nav>` : ""}
    </header>
  `;

  document.body.classList.toggle("hr-has-subnav", Boolean(subnav));
}

function globalMenuIsOpen() {
  return !document.getElementById("hr-global-menu")?.hidden;
}

function portalDrawerIsOpen() {
  return !document.getElementById("hr-portal-drawer")?.hidden;
}

function setGlobalMenu(open) {
  const menu = document.getElementById("hr-global-menu");
  const toggle = document.getElementById("hr-global-menu-toggle");
  if (!menu || !toggle) return;

  if (open) setPortalDrawer(false);
  if (open) {
    const portalUserMenu = document.getElementById("js-user-menu");
    if (portalUserMenu) portalUserMenu.hidden = true;
    document.getElementById("js-user-menu-toggle")?.setAttribute("aria-expanded", "false");
  }
  menu.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Cerrar navegación global" : "Abrir navegación global");
  document.body.classList.toggle("hr-global-menu-open", open);
  if (open) showGlobalHeader();
}

function portalSource(section) {
  return document.querySelector(`.db-sidebar__item[data-section="${CSS.escape(section)}"]`);
}

function sourceIsAvailable(source) {
  if (!source || source.hidden) return false;
  return !source.closest("[hidden]");
}

function navigatePortalSource(source) {
  if (!sourceIsAvailable(source)) return;
  setPortalDrawer(false);

  if (source.matches("a[href]")) {
    window.location.href = source.href;
    return;
  }

  const section = source.dataset.section;
  if (section) window.history.replaceState(null, "", `#${section}`);
  source.click();
}

function setPortalDrawer(open) {
  const drawer = document.getElementById("hr-portal-drawer");
  const backdrop = document.getElementById("hr-portal-backdrop");
  const toggle = document.querySelector('[data-portal-mobile-action="more"]');
  if (!drawer || !backdrop) return;

  if (open) setGlobalMenu(false);
  if (open) {
    const portalUserMenu = document.getElementById("js-user-menu");
    if (portalUserMenu) portalUserMenu.hidden = true;
  }
  drawer.hidden = !open;
  backdrop.hidden = !open;
  toggle?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("hr-portal-drawer-open", open);
  if (open) showGlobalHeader();
}

function renderPortalMobileNavigation() {
  if (!document.body.classList.contains("db-body")) return;

  const nav = document.createElement("nav");
  nav.className = "hr-portal-bottom-nav";
  nav.setAttribute("aria-label", "Navegación móvil del Portal");
  nav.innerHTML = `
    <button type="button" data-portal-mobile-section="overview"><span>IN</span>Inicio</button>
    <button type="button" data-portal-mobile-section="client-membership"><span>CL</span>Cliente</button>
    <button type="button" data-portal-mobile-section="collab-tasks"><span>CO</span>Colaborador</button>
    <button type="button" data-portal-mobile-section="erp-ops"><span>ER</span>ERP</button>
    <button type="button" data-portal-mobile-action="more" aria-expanded="false"
      aria-controls="hr-portal-drawer"><span>•••</span>Más</button>
  `;

  const backdrop = document.createElement("button");
  backdrop.className = "hr-portal-backdrop";
  backdrop.id = "hr-portal-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Cerrar menú del Portal");
  backdrop.hidden = true;

  const drawer = document.createElement("section");
  drawer.className = "hr-portal-drawer";
  drawer.id = "hr-portal-drawer";
  drawer.setAttribute("aria-label", "Más secciones del Portal");
  drawer.hidden = true;
  drawer.innerHTML = `
    <header>
      <span>Portal / Más</span>
      <button type="button" data-portal-drawer-close aria-label="Cerrar">×</button>
    </header>
    <div class="hr-portal-drawer__grid"></div>
  `;

  document.body.append(backdrop, drawer, nav);

  const drawerItems = [
    ["client-downloads", "Descargas"],
    ["client-sessions", "Sesiones"],
    ["client-transactions", "Transacciones"],
    ["client-contracts", "Contratos"],
    ["client-membership", "Membresía"],
    ["client-tickets", "Tickets"],
    ["client-store", "Tienda"],
    ["client-rewards", "Premios"],
    ["@minigames", "Minijuegos"],
    ["collab-docs", "Documentos/Contratos"],
    ["collab-finance", "Financiero"],
    ["collab-tasks", "SCRUM/Tareas"],
    ["collab-log", "Actividad"],
    ["@tickets", "Boletera"],
  ];

  function syncPortalMobilePermissions() {
    nav.querySelectorAll("[data-portal-mobile-section]").forEach((button) => {
      const source = portalSource(button.dataset.portalMobileSection);
      button.hidden = !sourceIsAvailable(source);
    });
    const visiblePrimary = [...nav.querySelectorAll("button")].filter((button) => !button.hidden).length;
    nav.style.setProperty("--hr-portal-nav-items", String(visiblePrimary));

    const grid = drawer.querySelector(".hr-portal-drawer__grid");
    grid.replaceChildren();

    for (const [target, label] of drawerItems) {
      let source;
      if (target === "@minigames") {
        source = document.querySelector('.db-sidebar__item[data-sidebar-action="minigames"]');
      } else if (target === "@tickets") {
        source = [...document.querySelectorAll('.db-sidebar__item[href*="tickets"]')]
          .find(sourceIsAvailable);
      } else {
        source = portalSource(target);
      }

      if (!sourceIsAvailable(source)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => navigatePortalSource(source));
      grid.append(button);
    }
  }

  nav.addEventListener("click", (event) => {
    const sectionButton = event.target.closest("[data-portal-mobile-section]");
    if (sectionButton) {
      navigatePortalSource(portalSource(sectionButton.dataset.portalMobileSection));
      return;
    }

    if (event.target.closest('[data-portal-mobile-action="more"]')) {
      setPortalDrawer(!portalDrawerIsOpen());
    }
  });

  backdrop.addEventListener("click", () => setPortalDrawer(false));
  drawer.querySelector("[data-portal-drawer-close]")
    ?.addEventListener("click", () => setPortalDrawer(false));

  const sidebar = document.getElementById("js-sidebar");
  if (sidebar) {
    new MutationObserver(syncPortalMobilePermissions).observe(sidebar, {
      attributes: true,
      attributeFilter: ["hidden"],
      subtree: true,
    });
  }

  document.addEventListener("click", (event) => {
    const active = event.target.closest(".db-sidebar__item[data-section]");
    if (!active) return;
    const section = active.dataset.section;
    const primarySection = section.startsWith("client-")
      ? "client-membership"
      : section.startsWith("collab-")
        ? "collab-tasks"
        : section.startsWith("erp-") || section === "admin-table-editor"
          ? "erp-ops"
          : section;
    nav.querySelectorAll("[data-portal-mobile-section]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.portalMobileSection === primarySection,
      );
    });
  });

  syncPortalMobilePermissions();
  nav.querySelector('[data-portal-mobile-section="overview"]')?.classList.add("is-active");
}

let lastHeaderScroll = 0;

function showGlobalHeader() {
  document.body.classList.remove("hr-nav-is-hidden");
}

function focusedFormControl() {
  return document.activeElement?.matches?.("input, textarea, select, [contenteditable='true']");
}

function handleHeaderAutoHide(scrollTop) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showGlobalHeader();
    return;
  }

  const delta = scrollTop - lastHeaderScroll;
  const locked = globalMenuIsOpen() || portalDrawerIsOpen() || focusedFormControl();

  if (locked || scrollTop < 24 || delta < -6) {
    showGlobalHeader();
  } else if (delta > 8) {
    document.body.classList.add("hr-nav-is-hidden");
  }

  lastHeaderScroll = Math.max(0, scrollTop);
}

function initNavigationInteractions() {
  document.getElementById("hr-global-menu-toggle")?.addEventListener("click", () => {
    setGlobalMenu(!globalMenuIsOpen());
  });

  document.getElementById("hr-global-menu")?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setGlobalMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setGlobalMenu(false);
    setPortalDrawer(false);
  });

  document.addEventListener("focusin", showGlobalHeader);
  window.addEventListener("scroll", () => handleHeaderAutoHide(window.scrollY), { passive: true });

  const portalScroller = document.querySelector(".db-main");
  portalScroller?.addEventListener(
    "scroll",
    () => handleHeaderAutoHide(portalScroller.scrollTop),
    { passive: true },
  );

  renderPortalMobileNavigation();
}

function syncPortalSubNav() {
  if (!document.body.classList.contains("db-body")) return;
  const section = window.location.hash.slice(1);
  if (!section) return;

  const sidebarItem = document.querySelector(`.db-sidebar__item[data-section="${CSS.escape(section)}"]`);
  if (sidebarItem && !sidebarItem.closest("[hidden]")) sidebarItem.click();
}

window.addEventListener("hashchange", syncPortalSubNav);
window.addEventListener("DOMContentLoaded", syncPortalSubNav);
window.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(syncPortalSubNav, 500);
  window.setTimeout(syncPortalSubNav, 1400);
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-portal-section]");
  if (!link || !document.body.classList.contains("db-body")) return;

  const section = link.dataset.portalSection;
  const sidebarItem = document.querySelector(`.db-sidebar__item[data-section="${CSS.escape(section)}"]`);
  if (!sidebarItem || sidebarItem.closest("[hidden]")) return;

  event.preventDefault();
  window.history.replaceState(null, "", `#${section}`);
  document.querySelectorAll("[data-portal-section]").forEach((item) => {
    item.removeAttribute("aria-current");
  });
  link.setAttribute("aria-current", "page");
  sidebarItem.click();
});

function initGlobalFooter() {
  const body = document.body;
  if (!body?.hasAttribute("data-hr-chrome")) return;

  const existingFooter = body.querySelector(":scope > footer");
  if (existingFooter) {
    existingFooter.classList.add("hr-site-footer");

    if (!existingFooter.querySelector("img")) {
      const logoLink = document.createElement("a");
      logoLink.href = "/";
      logoLink.setAttribute("aria-label", "Hidden Room");
      logoLink.innerHTML = '<img class="hr-site-footer__logo" src="/assets/img/white_logo.webp" alt="Hidden Room">';
      existingFooter.prepend(logoLink);
    }

    if (!existingFooter.querySelector(".site-status")) {
      const meta = document.createElement("div");
      meta.className = "hr-site-footer__meta";
      meta.innerHTML = `
        <span>Una marca de Grupo Mysauth</span>
        <span class="site-status"></span>
        <a href="/changelog.html" class="site-version"></a>
      `;
      existingFooter.insertBefore(meta, existingFooter.lastElementChild);
    }
  }

  if (body.dataset.hrFooter !== "false" && !existingFooter) {
    const footer = document.createElement("footer");
    footer.className = "hr-site-footer";
    footer.innerHTML = `
      <a href="/" aria-label="Hidden Room">
        <img class="hr-site-footer__logo" src="/assets/img/white_logo.webp" alt="Hidden Room">
      </a>
      <div class="hr-site-footer__meta">
        <span>Una marca de Grupo Mysauth</span>
        <span class="site-status"></span>
        <a href="/changelog.html" class="site-version"></a>
      </div>
      <div class="hr-site-footer__tagline">La Casa del Under</div>
    `;
    body.append(footer);
  }
}

renderGlobalNav();
initNavigationInteractions();
initGlobalFooter();

document.querySelectorAll(".site-status").forEach(el => {
  el.textContent = SITE_STATUS;
});

document.querySelectorAll(".site-version").forEach(el => {
  el.textContent = SITE_VERSION;
});


/* =========================================================
   GLOBAL CUSTOM CURSOR
========================================================= */

const cursor = document.getElementById("cursor");
const ring = document.getElementById("cursorRing");

if (cursor && ring) {

  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;

    cursor.style.transform =
      `translate(${mx - 5}px, ${my - 5}px)`;
  });

  function animRing() {

    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;

    ring.style.transform =
      `translate(${rx - 18}px, ${ry - 18}px)`;

    requestAnimationFrame(animRing);
  }

  animRing();

  function isCursorTarget(target) {
    return target?.closest?.('a, button, input, [role="button"], .event-row');
  }

  document.addEventListener('mouseenter', (event) => {
    if (isCursorTarget(event.target)) {
      ring.style.borderColor = 'rgba(219,1,0,0.8)';
      ring.style.scale = "1.5";
    }
  }, true);

  document.addEventListener('mouseleave', (event) => {
    if (isCursorTarget(event.target)) {
      ring.style.borderColor = 'rgba(219,1,0,0.5)';
      ring.style.scale = "1";
    }
  }, true);

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

const revealElements = document.querySelectorAll('.reveal');

if (revealElements.length > 0) {

  const observer = new IntersectionObserver(entries => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, 80);

        observer.unobserve(entry.target);
      }

    });

  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}


/* =========================================================
   EVENT ROW STAGGER
========================================================= */

document.querySelectorAll('.event-row').forEach((row, i) => {
  row.style.transitionDelay = `${i * 60}ms`;
});


/* =========================================================
   GALLERY SLIDER
========================================================= */

const track = document.getElementById('galleryTrack');

if (track) {

  let galleryIndex = 0;
  const total = track.children.length;

  window.slideGallery = function(dir) {

    galleryIndex =
      (galleryIndex + dir + total) % total;

    track.style.transform =
      `translateX(-${galleryIndex * 100}%)`;
  };

  document.querySelectorAll('[data-gallery-dir]').forEach((button) => {
    button.addEventListener('click', () => {
      window.slideGallery(Number(button.dataset.galleryDir || 0));
    });
  });

}
