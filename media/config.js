import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://rpcunbkstadgngqrjafp.supabase.co",
  "sb_publishable_7v_FIgTjWjJgtT1YHIAYSw_bRBmQjZO"
);

export const MEDIA_CATEGORIES = [
  "Noticias",
  "Coberturas",
  "Entrevistas",
  "Artículos",
  "Comunicados",
  "Live Sessions",
  "Lanzamientos",
];

export function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

export function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatDate(value, options = {}) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function sanitizeContent(html = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const allowedTags = new Set([
    "DIV", "P", "BR", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "U",
    "BLOCKQUOTE", "UL", "OL", "LI", "A", "FIGURE", "FIGCAPTION", "IMG", "HR",
  ]);
  const allowedAttributes = {
    A: new Set(["href", "target", "rel"]),
    IMG: new Set(["src", "alt", "title", "loading"]),
  };

  [...doc.body.querySelectorAll("*")].forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    [...node.attributes].forEach((attribute) => {
      if (!allowedAttributes[node.tagName]?.has(attribute.name)) {
        node.removeAttribute(attribute.name);
      }
    });

    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!/^(https?:|mailto:|\/|#)/i.test(href)) node.removeAttribute("href");
      node.setAttribute("rel", "noopener noreferrer");
    }

    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") || "";
      if (!/^(https?:|\/)/i.test(src)) node.remove();
      else node.setAttribute("loading", "lazy");
    }
  });

  return doc.body.firstElementChild?.innerHTML || "";
}

export function postURL(slug) {
  return `/media/post.html?slug=${encodeURIComponent(slug)}`;
}

export function setMeta(selector, value, attribute = "content") {
  const element = document.querySelector(selector);
  if (element && value) element.setAttribute(attribute, value);
}
