export async function copyTextToClipboard(value: string): Promise<void> {
  if (!value) {
    throw new Error("There is no text to copy.");
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through for browsers where clipboard permission is unavailable.
    }
  }

  const textArea = document.createElement("textarea");
  const activeElement = document.activeElement;

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.inset = "-9999px auto auto -9999px";
  document.body.append(textArea);
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  const copied = document.execCommand("copy");
  textArea.remove();

  if (activeElement instanceof HTMLElement) {
    activeElement.focus();
  }

  if (!copied) {
    throw new Error("The booking reference could not be copied.");
  }
}
