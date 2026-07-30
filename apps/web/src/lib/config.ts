export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ??
  "http://localhost:8000"
