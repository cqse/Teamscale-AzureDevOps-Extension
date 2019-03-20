export function logToDiv(div: HTMLDivElement, message: string) {
    const newLogElement = document.createElement("p");
    newLogElement.innerHTML = message;
    div.insertBefore(newLogElement, div.firstChild);
}

export function padStart(string: String, toSize: number, padding: String): String {
    let paddedString = string;
    while (paddedString.length < toSize) {
        paddedString = `${padding}${paddedString}`;
    }
    return paddedString
}