export function formatOrganizationLabel(value: string): string {
  const label = value.trim().replaceAll(/[_-]+/g, " ").toLowerCase();

  if (!label) {
    return "Unknown";
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatOrganizationPoints(points: number): string {
  return new Intl.NumberFormat().format(points);
}

export function formatOrganizationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}
