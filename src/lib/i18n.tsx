import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "fr";

const dict = {
  en: {
    home: "Home", shop: "Shop", orders: "Orders", sell: "Sell", account: "Account",
    sign_in: "Sign In", sign_up: "Sign Up", sign_out: "Sign Out",
    buy_now: "Buy Now", see_all: "See all products",
    hot: "Hot", new_badge: "New", featured: "Featured", trending: "Trending",
    full_name: "Full Name", email: "Email", phone: "Phone / WhatsApp", password: "Password",
    create_account: "Create Account", continue_google: "Continue with Google",
    forgot_password: "Forgot password?",
    back_home: "Home",
    welcome: "Welcome to Digistore",
    hero_sub: "Discover, buy, and sell premium digital products. Pay with SoleasPay, get delivery within 24h.",
    explore: "Explore products", become_seller: "Become a seller",
    categories: "Categories", all: "All",
    sort_popular: "Popular", sort_new: "Newest", sort_top: "Top rated",
    search_ph: "Search products…",
    no_products: "No products yet — be the first to upload!",
    by: "by", level: "Level",
  },
  fr: {
    home: "Accueil", shop: "Boutique", orders: "Commandes", sell: "Vendre", account: "Compte",
    sign_in: "Connexion", sign_up: "Inscription", sign_out: "Déconnexion",
    buy_now: "Acheter", see_all: "Voir tous les produits",
    hot: "Hot", new_badge: "Nouveau", featured: "À la une", trending: "Tendance",
    full_name: "Nom complet", email: "Email", phone: "Téléphone / WhatsApp", password: "Mot de passe",
    create_account: "Créer un compte", continue_google: "Continuer avec Google",
    forgot_password: "Mot de passe oublié ?",
    back_home: "Accueil",
    welcome: "Bienvenue sur Digistore",
    hero_sub: "Découvrez, achetez et vendez des produits numériques premium. Payez via SoleasPay, livraison sous 24h.",
    explore: "Explorer", become_seller: "Devenir vendeur",
    categories: "Catégories", all: "Tous",
    sort_popular: "Populaires", sort_new: "Récents", sort_top: "Mieux notés",
    search_ph: "Rechercher un produit…",
    no_products: "Aucun produit pour l'instant — soyez le premier à publier !",
    by: "par", level: "Niveau",
  },
} as const;

type Key = keyof typeof dict["en"];

const Ctx = createContext<{ lang: Lang; t: (k: Key) => string; setLang: (l: Lang) => void }>({
  lang: "en", t: (k) => k, setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("digistore_lang") as Lang | null;
    if (saved === "en" || saved === "fr") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("digistore_lang", l);
  };
  const t = (k: Key) => dict[lang][k] ?? k;
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
