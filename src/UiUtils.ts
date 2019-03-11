export function logToDiv(div: HTMLDivElement, message: string) {
    // TODO: doesn't really matter here, but in bigger projects it is preferable to use appendChild() etc.
    div.innerHTML = `<p>${message}</p>${div.innerHTML}`;
}