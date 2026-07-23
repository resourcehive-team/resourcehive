const accessTokenKey = "resourcehive_access_token"

// Temporary until the backend supports an HttpOnly cookie session.
// localStorage tokens can be read by JavaScript if the page has an XSS flaw.
export function storeAccessToken(token: string) {
  localStorage.setItem(accessTokenKey, token)
}
