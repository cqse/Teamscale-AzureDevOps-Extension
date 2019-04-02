import path = require('path');
import task = require('azure-pipelines-task-lib/task');

export function firstWildcardIndex(str: string) {
    const starIndex = str.indexOf('*');
    const questionMarkIndex = str.indexOf('?');
    if (starIndex === -1 && questionMarkIndex === -1) {
        return null;
    }
    if (starIndex === -1) {
        return questionMarkIndex
    }
    if (questionMarkIndex === -1) {
        return starIndex;
    }
    return Math.min(starIndex, questionMarkIndex);
}

export function resolveFiles(filesPattern: string) : string[] {
    task.debug('Matching glob pattern: ' + filesPattern);

    const idx = firstWildcardIndex(filesPattern);
    task.debug('Index of first wildcard: ' + idx);
    if (idx == null) {
        task.checkPath(filesPattern, "filesPattern");
        return [filesPattern];
    }

    const findPathRoot = path.dirname(filesPattern.slice(0, idx));
    task.debug('find root dir: ' + findPathRoot);

    const allFiles = task.find(findPathRoot);
    const uploadFilesList = task.match(allFiles, filesPattern, undefined, { matchBase: true });

    if (!uploadFilesList || uploadFilesList.length == 0) {
        throw new Error(`Did not find any files matching '${filesPattern}'`);
    }
    return uploadFilesList;
}

export function isCoverageFile(file: string) : boolean {
    return path.extname(file).toLowerCase() === ".coverage";
}

