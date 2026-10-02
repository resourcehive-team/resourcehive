export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8088"

const configuredMarketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:5173"

export const marketingUrl = configuredMarketingUrl.replace(/\/$/, "")

export function marketingPath(path: `/${string}`) {
  return `${marketingUrl}${path}`
}
