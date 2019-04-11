import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';
import * as urlLib from 'url';

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

export function createUploadUrl(teamscaleUrl: string, project: string, format: string, partition: string, message: string, revision: string) : string {
    if (!teamscaleUrl.endsWith("/")) {
        teamscaleUrl += "/";
    }

    const url = urlLib.parse(`${teamscaleUrl}p/${project}/external-report`, true);
    url.query['format'] = format;
    url.query['revision'] = revision;
    url.query['partition'] = partition;
    url.query['message'] = message;
    return urlLib.format(url);
}

