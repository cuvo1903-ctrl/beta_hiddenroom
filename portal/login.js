import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://rpcunbkstadgngqrjafp.supabase.co",
  "sb_publishable_7v_FIgTjWjJgtT1YHIAYSw_bRBmQjZO"
);

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login incorrecto");
    return;
  }

  // guardar sesión simple (opcional)
  localStorage.setItem("session", JSON.stringify(data.session));

  window.location.href = getSafeRedirect();
});
