/**
 * Logs a message the start of a div as a paragraph
 */
export function logToDiv(div: HTMLDivElement, message: string) {
    const newLogElement = document.createElement('p');
    newLogElement.innerHTML = message;
    div.insertBefore(newLogElement, div.firstChild);
}

/**
 * Adds as many padding characters to a string so that it has length toSize afterwards
 * @param text String to be padded
 * @param toSize Desired size
 * @param padding Padding character
 */
export function padStart(text: string, toSize: number, padding: string): string {
    let paddedString = text;
    while (paddedString.length < toSize) {
        paddedString = `${padding}${paddedString}`;
    }
    return paddedString;
}

/**
 * Returns the current timestamp in the format "HH:mm:ss"
 */
export function getCurrentTimestamp() {
    const now = new Date();
    return `${padStart(now.getHours().toString(), 2, '0')}` +
        `:${padStart(now.getMinutes().toString(), 2, '0')}` +
        `:${padStart(now.getSeconds().toString(), 2, '0')}`;
}

/**
 * Resize the body of the host iframe to match the height of the body of the extension
 */
export function resizeHost() {
    const bodyElement = $('body,html');
    VSS.resize(bodyElement.width(), bodyElement.height());
}

/**
 * Teamscale delivers all Badges with the same clipPath. When having multiple badges-svgs with the same clipPath on one
 * html page, Chrome uses the first defined clipPath which leads to incorrect cropped (second) svg.
 *
 */
export function replaceClipPathId(plainSvg: string, clipPathId: string): string {
    plainSvg = plainSvg.replace(
        new RegExp('(<clipPath[^>]*id=\\")a\\"', 'gm'), '$1' + clipPathId + '"');
    return plainSvg.replace(
        new RegExp('(<g[^>]*clip-path=")url\\(#a\\)\\"', 'gm'), '$1' + 'url(#' + clipPathId + ')"');
}

/**
 * Converts a string representation of a boolean value back to a Boolean value. Return undefined in case of an
 * unexpected error.
 */
export function convertToBoolean(input: string): boolean | undefined {
    try {
        return JSON.parse(input);
    } catch (e) {
        return undefined;
    }
}

/** Checks if a string is empty or contains only whitespaces. */
export function isEmptyOrWhitespace(string: string | null | undefined): string is '' | null | undefined {
    return string == null || string.trim() === '';
}
