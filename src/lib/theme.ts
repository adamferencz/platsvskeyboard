/** Světlý / tmavý režim: klíč v localStorage a skript, který motiv nastaví ještě před vykreslením. */
export const THEME_STORAGE_KEY = "pvk_theme";

export const THEME_INIT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
