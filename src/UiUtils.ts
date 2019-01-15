export function logToDiv(div: HTMLDivElement, message: string) {
    div.innerHTML = `<p>${message}</p>${div.innerHTML}`;
}