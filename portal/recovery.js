import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://rpcunbkstadgngqrjafp.supabase.co",
  "sb_publishable_7v_FIgTjWjJgtT1YHIAYSw_bRBmQjZO"
);

const form = document.getElementById("recovery-form");
const statusEl = document.getElementById("recovery-status");
const submitButton = form?.querySelector(".login-submit");

function enhancePasswordToggles(root = document) {
  root.querySelectorAll('input[type="password"]:not([data-password-toggle-ready]), input[type="text"][data-password-visible="true"]:not([data-password-toggle-ready])').forEach((input) => {
    input.dataset.passwordToggleReady = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "password-toggle";
    button.dataset.action = "toggle-password";
    button.setAttribute("aria-label", "Ver contraseña");
    button.innerHTML = '<span class="password-eye" aria-hidden="true"></span>';
    wrapper.appendChild(button);
  });
}

document.addEventListener("click", (e) => {
  const button = e.target.closest('[data-action="toggle-password"]');
  if (!button) return;

  const input = button.closest(".password-field")?.querySelector("input");
  if (!input) return;

  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  input.dataset.passwordVisible = visible ? "false" : "true";
  button.innerHTML = '<span class="password-eye" aria-hidden="true"></span>';
  button.setAttribute("aria-label", visible ? "Ver contraseña" : "Ocultar contraseña");
});

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function getHashParams() {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

async function ensureRecoverySession() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session;

  const params = getHashParams();
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error("[HR] recovery setSession:", error);
    return null;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
  return data.session;
}

const session = await ensureRecoverySession();
if (!session) {
  setStatus("El enlace de recuperación no es válido o ya expiró. Solicita un nuevo email.");
  if (submitButton) submitButton.disabled = true;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password")?.value ?? "";
  const confirm = document.getElementById("password_confirm")?.value ?? "";

  if (password.length < 8) {
    setStatus("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (password !== confirm) {
    setStatus("Las contraseñas no coinciden.");
    return;
  }

  if (submitButton) submitButton.disabled = true;
  setStatus("Guardando nueva contraseña...");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[HR] recovery updateUser:", error);
    setStatus(error.message || "No se pudo actualizar la contraseña.");
    if (submitButton) submitButton.disabled = false;
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    const { error: clearError } = await supabase
      .from("users")
      .update({ temp_password: null })
      .eq("id", user.id);

    if (clearError) {
      console.info("[HR] recovery clear temp_password skipped:", clearError.message);
    }
  }

  setStatus("Contraseña actualizada. Entrando al dashboard...");
  setTimeout(() => {
    window.location.href = "./dashboard.html";
  }, 900);
});

enhancePasswordToggles();
