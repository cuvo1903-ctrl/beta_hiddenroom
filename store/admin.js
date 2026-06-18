import { supabase, escapeHtml } from "./store.js";

const shell = document.getElementById("admin-shell");
const denied = document.getElementById("admin-denied");
const deniedMessage = document.getElementById("admin-denied-message");
const form = document.getElementById("product-form");
const list = document.getElementById("admin-products");
const statusElement = document.getElementById("admin-status");
const errorElement = document.getElementById("admin-form-error");
const cancelButton = document.getElementById("cancel-edit");
let adminProducts = [];

initializeAdmin();

async function initializeAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    sessionStorage.setItem("hr_return_after_login", "../store/admin.html");
    window.location.replace("../portal/");
    return;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("roles")
    .eq("id", session.user.id)
    .maybeSingle();

  const isAdmin = String(profile?.roles ?? "")
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .includes("admin");

  if (error || !isAdmin) {
    deniedMessage.textContent = error ? `No se pudo validar el acceso: ${error.message}` : "Esta sección requiere rol admin.";
    return;
  }

  denied.hidden = true;
  shell.hidden = false;
  await loadProducts();
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    statusElement.textContent = `No se pudieron cargar productos: ${error.message}`;
    return;
  }

  adminProducts = data ?? [];
  statusElement.textContent = `${adminProducts.length} producto${adminProducts.length === 1 ? "" : "s"}.`;
  list.innerHTML = adminProducts.map(productAdminMarkup).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorElement.textContent = "";

  const id = document.getElementById("product-id").value;
  const stockValue = document.getElementById("product-stock").value;
  const payload = {
    name: document.getElementById("product-name").value.trim(),
    slug: document.getElementById("product-slug").value.trim().toLowerCase(),
    description: document.getElementById("product-description").value.trim() || null,
    category: document.getElementById("product-category").value,
    price: Number(document.getElementById("product-price").value),
    currency: "MXN",
    image_url: document.getElementById("product-image-url").value.trim() || null,
    file_url: document.getElementById("product-file-url").value.trim() || null,
    stock: stockValue === "" ? null : Number(stockValue),
    is_digital: document.getElementById("product-is-digital").checked,
    featured: document.getElementById("product-featured").checked,
    is_active: document.getElementById("product-is-active").checked,
  };

  const query = id
    ? supabase.from("store_products").update(payload).eq("id", id)
    : supabase.from("store_products").insert(payload);
  const { error } = await query;

  if (error) {
    errorElement.textContent = error.message;
    return;
  }

  resetForm();
  await loadProducts();
});

list.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  const toggleButton = event.target.closest("[data-toggle-product]");
  const featuredButton = event.target.closest("[data-feature-product]");
  const deleteButton = event.target.closest("[data-delete-product]");

  if (editButton) editProduct(editButton.dataset.editProduct);
  if (toggleButton) await updateProduct(toggleButton.dataset.toggleProduct, {
    is_active: toggleButton.dataset.active !== "true",
  });
  if (featuredButton) await updateProduct(featuredButton.dataset.featureProduct, {
    featured: featuredButton.dataset.featured !== "true",
  });
  if (deleteButton && window.confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) {
    const { error } = await supabase.from("store_products").delete().eq("id", deleteButton.dataset.deleteProduct);
    if (error) statusElement.textContent = error.message;
    else await loadProducts();
  }
});

cancelButton.addEventListener("click", resetForm);

async function updateProduct(id, patch) {
  const { error } = await supabase.from("store_products").update(patch).eq("id", id);
  if (error) statusElement.textContent = error.message;
  else await loadProducts();
}

function editProduct(id) {
  const product = adminProducts.find((candidate) => candidate.id === id);
  if (!product) return;

  document.getElementById("product-id").value = product.id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-slug").value = product.slug;
  document.getElementById("product-description").value = product.description ?? "";
  document.getElementById("product-category").value = product.category;
  document.getElementById("product-price").value = product.price;
  document.getElementById("product-image-url").value = product.image_url ?? "";
  document.getElementById("product-file-url").value = product.file_url ?? "";
  document.getElementById("product-stock").value = product.stock ?? "";
  document.getElementById("product-is-digital").checked = product.is_digital;
  document.getElementById("product-featured").checked = product.featured;
  document.getElementById("product-is-active").checked = product.is_active;
  document.getElementById("product-form-title").textContent = "Editar producto";
  cancelButton.hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  form.reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-is-active").checked = true;
  document.getElementById("product-form-title").textContent = "Nuevo producto";
  cancelButton.hidden = true;
  errorElement.textContent = "";
}

function productAdminMarkup(product) {
  return `
    <article class="admin-product-row">
      <div>
        <span class="product-category">${escapeHtml(product.category)} · ${product.is_active ? "Activo" : "Inactivo"}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.slug)} · ${formatPrice(product.price)} · stock ${product.stock ?? "∞"}</p>
      </div>
      <div class="admin-actions">
        <button class="secondary-button" type="button" data-edit-product="${product.id}">Editar</button>
        <button class="secondary-button" type="button" data-toggle-product="${product.id}" data-active="${product.is_active}">${product.is_active ? "Desactivar" : "Activar"}</button>
        <button class="secondary-button" type="button" data-feature-product="${product.id}" data-featured="${product.featured}">${product.featured ? "Quitar featured" : "Featured"}</button>
        <button class="remove-button" type="button" data-delete-product="${product.id}">Eliminar</button>
      </div>
    </article>`;
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}
