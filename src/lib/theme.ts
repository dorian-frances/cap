// Thème : "system" suit le réglage de l'OS. Appliqué via data-theme sur <html> (voir globals.css).
export type Theme = "light" | "dark" | "system";
const KEY = "cap:theme";

export const getTheme = (): Theme => {
  try { return (localStorage.getItem(KEY) as Theme) || "system"; } catch { return "system"; }
};

export function applyTheme(t: Theme = getTheme()) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch {}
  applyTheme(t);
}

/** Script exécuté avant le premier rendu : pas de flash clair au chargement en mode sombre. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(e){if((localStorage.getItem("${KEY}")||"system")==="system")document.documentElement.dataset.theme=e.matches?"dark":"light"})}catch(e){}})()`;
