import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://rpcunbkstadgngqrjafp.supabase.co",
  "sb_publishable_7v_FIgTjWjJgtT1YHIAYSw_bRBmQjZO"
);

let registerMode = false;

const getSafeRedirect = () => {
  const fallback = "./dashboard.html";
  const returnTo = sessionStorage.getItem("hr_return_after_login");
  if (!returnTo) return fallback;

  sessionStorage.removeItem("hr_return_after_login");
  return returnTo.startsWith("../minijuegos/") ? returnTo : fallback;
};

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  window.location.href = getSafeRedirect();
}

const form = document.getElementById("login-form");
const submitButton = form.querySelector(".login-submit");
const registerLink = document.getElementById("js-register-link");
const passwordResetLink = document.getElementById("js-password-reset");

function ensureRegisterFields() {
  if (document.getElementById("js-register-fields")) return;

  const emailField = document.getElementById("usuario")?.closest(".login-field");
  const passwordField = document.getElementById("password")?.closest(".login-field");

  const registerWrap = document.createElement("div");
  registerWrap.id = "js-register-fields";
  registerWrap.innerHTML = `
    <div class="login-field">
      <label class="login-label" for="display_name">Nombre</label>
      <input class="login-input" id="display_name" type="text" name="display_name" placeholder="Nombre" autocomplete="name" required>
    </div>
    <div class="login-field">
      <label class="login-label" for="whatsapp">WhatsApp</label>
      <input class="login-input" id="whatsapp" type="tel" name="whatsapp" placeholder="WhatsApp" inputmode="numeric" pattern="[0-9]*" autocomplete="tel" required>
    </div>
  `;

  if (emailField) {
    form.insertBefore(registerWrap.children[0], emailField);
  }
  if (passwordField) {
    form.insertBefore(registerWrap.children[0], passwordField);
  }
}

function removeRegisterFields() {
  document.getElementById("display_name")?.closest(".login-field")?.remove();
  document.getElementById("whatsapp")?.closest(".login-field")?.remove();
}

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
    button.setAttribute("aria-label", "Ver contraseÃ±a");
    button.innerHTML = '<span class="password-eye" aria-hidden="true"></span>';
    wrapper.appendChild(button);
  });
}

function syncRegisterMode() {
  if (registerMode) ensureRegisterFields();
  else removeRegisterFields();

  const emailLabel = document.querySelector('label[for="usuario"]');
  const emailInput = document.getElementById("usuario");
  const title = document.querySelector(".login-title");
  if (emailLabel) emailLabel.textContent = registerMode ? "Email" : "Correo";
  if (emailInput) emailInput.placeholder = "Correo";
  if (title) title.innerHTML = registerMode ? "Registrarse" : "Inicia<br>Sesion";

  submitButton.textContent = registerMode ? "Registrarse" : "Entrar";
  registerLink.textContent = registerMode ? "Iniciar sesion" : "Registrarse";
  enhancePasswordToggles();
}

document.addEventListener("input", (e) => {
  if (e.target?.id === "whatsapp") {
    e.target.value = e.target.value.replace(/\D/g, "");
  }
});

document.addEventListener("click", (e) => {
  const button = e.target.closest('[data-action="toggle-password"]');
  if (!button) return;

  const input = button.closest(".password-field")?.querySelector("input");
  if (!input) return;

  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  input.dataset.passwordVisible = visible ? "false" : "true";
  button.innerHTML = '<span class="password-eye" aria-hidden="true"></span>';
  button.setAttribute("aria-label", visible ? "Ver contraseÃ±a" : "Ocultar contraseÃ±a");
});

const registeredEmailMessage = "ERROR. E-mail ya REGISTRADO. Si has USADO nuestros productos PREVIAMENTE tu registro fue generado por Kairen en automÃ¡tico. SOLICITA un email con tu contraseÃ±a.";

function isAlreadyRegisteredError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("already registered")
    || message.includes("user already")
    || message.includes("already exists")
    || message.includes("registered");
}

async function isRegisteredEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.info("[HR] recovery user check skipped:", error.message);
    return true;
  }

  return Boolean(data);
}

passwordResetLink?.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("usuario").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Usuario no registrado");
    return;
  }

  const registered = await isRegisteredEmail(email);
  if (!registered) {
    alert("Usuario no registrado");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("./recovery.html", window.location.href).href,
  });

  if (error) {
    alert(error.message || "No se pudo enviar el email de recuperaciÃ³n.");
    return;
  }

  alert("Email de recuperaciÃ³n enviado.");
});

registerLink?.addEventListener("click", (e) => {
  e.preventDefault();
  registerMode = !registerMode;
  syncRegisterMode();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value;
  const displayName = document.getElementById("display_name")?.value.trim() ?? "";
  const whatsapp = document.getElementById("whatsapp")?.value.trim() ?? "";
  const cleanWhatsapp = whatsapp.replace(/\D/g, "");

  if (registerMode) {
    if (!displayName || !cleanWhatsapp) {
      alert("Ingresa nombre y WhatsApp para registrarte.");
      return;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      phone: cleanWhatsapp,
      password,
      options: {
        emailRedirectTo: new URL("./dashboard.html", window.location.href).href,
        data: {
          display_name: displayName,
          email,
          whatsapp: cleanWhatsapp,
        },
      },
    });

    if (error) {
      alert(isAlreadyRegisteredError(error) ? registeredEmailMessage : (error.message || "No se pudo registrar la cuenta"));
      return;
    }

    if (signUpData?.session) {
      localStorage.setItem("session", JSON.stringify(signUpData.session));
      window.location.href = getSafeRedirect();
      return;
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      alert("Registro creado, pero no se pudo iniciar sesion automaticamente.");
      return;
    }

    localStorage.setItem("session", JSON.stringify(loginData.session));
    window.location.href = getSafeRedirect();
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login incorrecto");
    return;
  }

  localStorage.setItem("session", JSON.stringify(data.session));
  window.location.href = getSafeRedirect();
});

syncRegisterMode();
