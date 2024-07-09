import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';

/** Returns the index of the first occurence of a wildcard (* or ?) in the given string. */
export function firstWildcardIndex(str: string): number | null {
	const starIndex = str.indexOf('*');
	const questionMarkIndex = str.indexOf('?');
	if (starIndex === -1 && questionMarkIndex === -1) {
		return null;
	}
	if (starIndex === -1) {
		return questionMarkIndex;
	}
	if (questionMarkIndex === -1) {
		return starIndex;
	}
	return Math.min(starIndex, questionMarkIndex);
}

/** Returns the files that match the given pattern. */
export function resolveFiles(filesPattern: string): string[] {
	task.debug('Matching glob pattern: ' + filesPattern);

	const idx = firstWildcardIndex(filesPattern);
	task.debug('Index of first wildcard: ' + idx);
	if (idx == null) {
		task.checkPath(filesPattern, 'filesPattern');
		return [filesPattern];
	}

	const findPathRoot = filesPattern.slice(0, idx);
	task.debug('find root dir: ' + findPathRoot);

	const allFiles = task.find(findPathRoot, {
		followSymbolicLinks: false,
		allowBrokenSymbolicLinks: true,
		followSpecifiedSymbolicLink: true
	});
	return task.match(allFiles, filesPattern, undefined, {
		matchBase: true
	});
}

/** Returns whether the given file is a coverage file based on its file extension. */
export function isCoverageFile(file: string): boolean {
	return path.extname(file).toLowerCase() === '.coverage';
}

/** Returns whether the given string is null, undefined or empty. */
export function isEmpty(s: string): boolean {
	return !s || s === '';
}

/**
* Returns the string itself, if count is 1. Otherwise, returns the string with
* appended "s".
*/
export function pluralize(str: string, count: number): string {
	if (count === 1) {
		return str;
	}
	return str + "s";
}
