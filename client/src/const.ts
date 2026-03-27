export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Retorna sempre /login pois usamos autenticação local (não OAuth)
export const getLoginUrl = () => "/login";
