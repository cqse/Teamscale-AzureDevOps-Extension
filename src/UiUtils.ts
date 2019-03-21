/**
 * Logs a message the start of a div as a paragraph
 */
export function logToDiv(div: HTMLDivElement, message: string) {
    const newLogElement = document.createElement("p");
    newLogElement.innerHTML = message;
    div.insertBefore(newLogElement, div.firstChild);
}

/**
 * Adds as many padding characters to a string so that it has length toSize afterwards
 * @param string String to be padded
 * @param toSize Desired size
 * @param padding Padding character
 */
export function padStart(string: String, toSize: number, padding: String): String {
    let paddedString = string;
    while (paddedString.length < toSize) {
        paddedString = `${padding}${paddedString}`;
    }
    return paddedString
}

/**
 * Returns the current timestamp in the format "HH:mm:ss"
 */
export function getCurrentTimestamp() {
    const now = new Date();
    return `${padStart(now.getHours().toString(), 2, "0")}` +
        `:${padStart(now.getMinutes().toString(), 2, "0")}` +
        `:${padStart(now.getSeconds().toString(), 2, "0")}`;
}