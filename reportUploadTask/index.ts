import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';
import * as os from 'os';
import * as fs from 'fs';
import * as toolRunner from 'azure-pipelines-task-lib/toolrunner';
import * as utils from './utils';

type TaskParameters = {
	filesPattern: string,
	codeCoverageExePath: string,
	codeCoverageConversionBatchSize: number,
	teamscaleUrl: string,
	format: string,
	username: string,
	accessKey: string,
	project: string,
	partition: string,
	insecure: Boolean,
	stacktrace: Boolean,
	trustedKeystoreWithPassword: string | null
}

// this variable is undocumented, unfortunately, c.f. https://github.com/MicrosoftDocs/azure-devops-docs/issues/4588
const pullRequestRevision = task.getVariable('System.PullRequest.SourceCommitId');

// c.f. https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml#build-variables
let revision = task.getVariable('Build.SourceVersion');
if (pullRequestRevision && pullRequestRevision !== '') {
	// if this is a pull request build, the revision to which results should be uploaded is stored in a different variable
	revision = pullRequestRevision;
}
const buildId = task.getVariable('Build.BuildNumber');

async function run() {
	try {
		return runUnsafe();
	} catch (e) {
		task.error(e.message);
		task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${e.message}`);
	}
}

/** Converts the given binary .coverage files into .xml files readable by Teamscale and stores them in the given tmp directory. */
async function convertCoverageFiles(coverageFiles: string[], tmpUploadDir: string, codeCoverageExePath: string, batchSize: number): Promise<void> {
	if(coverageFiles.length === 0) {
		task.debug('No coverage files found that need conversion.');
		return;
	}
	task.debug(`Found the following coverage files that need conversion: ${coverageFiles}`);

	task.checkPath(codeCoverageExePath, 'code-coverage-exe-path');

	if(batchSize <= 0) {
		task.debug('Batch conversion of coverage files disabled, will process all files at once. If a "spawn ENAMETOOLONG" error occurs, please enable batch conversion in the task settings.');
		return runCodeCoverageExeForFiles(codeCoverageExePath, coverageFiles, path.join(tmpUploadDir, 'coverage.xml'));
	}

	const batchCount = Math.ceil(coverageFiles.length * 1.0 / batchSize);
	task.debug(`Will convert coverage files in ${batchCount} batches containing ${batchSize} files each.`);

	for(let i = 0; i < batchCount; i++) {
		const startIndex = i * batchSize;
		const endIndex = Math.min((i+1) * batchSize, coverageFiles.length);
		const coverageFileBatch = coverageFiles.slice(startIndex, endIndex);
		const outputXmlFile = path.join(tmpUploadDir, `coverage-${i+1}.xml`);
		await runCodeCoverageExeForFiles(codeCoverageExePath, coverageFileBatch, outputXmlFile);
	}
}

/** Runs the given CodeCoverage.exe for the given files to convert them to an xml file. */
async function runCodeCoverageExeForFiles(codeCoverageExePath: string, coverageFiles: string[], outputXmlFile: string): Promise<void> {
	const codeCoverageRunner: toolRunner.ToolRunner = task.tool(codeCoverageExePath);
	codeCoverageRunner.arg('analyze');
	codeCoverageRunner.arg(`/output:${outputXmlFile}`);
	for (const file of coverageFiles) {
		codeCoverageRunner.arg(file);
	}

	codeCoverageRunner.on('stdout', (buffer: Buffer) => {
		process.stdout.write(buffer);
	});

	codeCoverageRunner.on('stderr', (buffer: Buffer) => {
		process.stdout.write(buffer);
	});

	const exitCode = await codeCoverageRunner.exec();
	if (exitCode !== 0) {
		throw new Error(`CodeCoverage.exe failed with exit code ${exitCode}`);
	}
}

function readValuesFromTask(): TaskParameters {
	let codeCoverageExePath: string = task.getInput('codeCoverageExePath');
	if (utils.isEmpty(codeCoverageExePath)) {
		codeCoverageExePath = path.join(__dirname, 'CodeCoverage/CodeCoverage.exe');
	}
	let codeCoverageConversionBatchSize: string = task.getInput('codeCoverageConversionBatchSize')
	if(utils.isEmpty(codeCoverageConversionBatchSize)) {
		codeCoverageConversionBatchSize = '1000';
	}

	return {
		filesPattern: task.getInput('files', true),
		codeCoverageExePath: codeCoverageExePath,
		codeCoverageConversionBatchSize: parseInt(codeCoverageConversionBatchSize),
		teamscaleUrl: task.getInput('url', true).trim(),
		format: task.getInput('format', true),
		username: task.getInput('username', true),
		accessKey: readAccessKeyFromTask(),
		project: task.getInput('project', true),
		partition: task.getInput('partition', true),
		insecure: task.getBoolInput('insecure', false),
    	stacktrace: task.getBoolInput('stacktrace', false),
		trustedKeystoreWithPassword: readKeyStoreAndPasswordFromTask()
	}
}

/** Returns the user defined keystore and its password in the format <keystore path>;<password>
 * or null if no custom keystore is defined.
 */
function readKeyStoreAndPasswordFromTask(): string | null {
	const trustedKeystore: string = task.getInput('trustedKeystore', false);
	if (utils.isEmpty(trustedKeystore)) {
		return null;
	}
	task.checkPath(trustedKeystore, 'custom-keystore-path');
	let keystorePassword = task.getInput('keystorePassword', false);
	if (utils.isEmpty(keystorePassword)) {
		keystorePassword = task.getVariable('teamscale.keystorePassword');
	}
	// Don't reveal secrets in the logs
	if (!utils.isEmpty(keystorePassword)) {
		task.setSecret(keystorePassword);
	}
	return `${trustedKeystore};${keystorePassword}`;
}

function readAccessKeyFromTask(): string {
	let accessKey: string = task.getInput('accessKey', false);
	if (utils.isEmpty(accessKey)) {
		accessKey = task.getVariable('teamscale.accessKey');
	}

	// Don't reveal secrets in the logs
	if (!utils.isEmpty(accessKey)) {
		task.setSecret(accessKey);
	}
	return accessKey;
}

async function runUnsafe() {
	task.setResourcePath(path.join(__dirname, 'task.json'));

	const taskParameters = readValuesFromTask();

	let filesToUpload: string[] = utils.resolveFiles(taskParameters.filesPattern);
	if (!filesToUpload || filesToUpload.length === 0) {
		task.logIssue(task.IssueType.Warning, `Did not find any files matching '${taskParameters.filesPattern}'. Skipping upload.`)
		task.setResult(task.TaskResult.Succeeded, 'Task finished successfully. No files to upload.');
		return;
	}
	task.debug(`Found the following files to upload: ${filesToUpload}`);
	// we store the files in a tmp directory to pass a file pattern to teamscale-upload instead of a potentially large number of individual files.
	const tmpUploadDir = createTmpUploadDir();
	await prepareFilesToUpload(taskParameters, filesToUpload, tmpUploadDir);
	task.debug(`Collected the following files in upload dir (first item): ${task.find(tmpUploadDir)}`);
	// We want to upload all files in the directory, but not the directory itself and this is an ant-pattern.
	// "?" matches at least one arbitrary character, so this excludes the directory itself.
	await uploadFiles(taskParameters, path.join(tmpUploadDir, '?*'));
}

/** Creates a new directory for the upload files in the agent's tmp directory and returns its path. */
function createTmpUploadDir(): string {
	const tmpDir = task.getVariable('Agent.TempDirectory');
	const uploadDirBaseName = 'teamscale-upload';
	// make sure to use a use a new and unique directory
	const tmpUploadDir = createUniquePath(path.join(tmpDir, uploadDirBaseName));
	task.debug(`Creating temporary directory for upload files: ${tmpUploadDir}`);
	task.mkdirP(tmpUploadDir);
	return tmpUploadDir;
}

function createUniquePath(originalPath: string) {
	if(!task.exist(originalPath)) {
		return originalPath;
	}
	const fileExtension = path.extname(originalPath);
	const pathWithoutFileExtension = originalPath.substring(0, originalPath.length - fileExtension.length);
	let counter = 1;
	let currentPath: string;
	do {
		currentPath = `${pathWithoutFileExtension}-${counter}${fileExtension}`;
		counter++;
	}
	while(task.exist(currentPath));
	return currentPath;
}

/** Converts binary .coverage files to .xml files and collects all files to be uploaded in the temporary upload directory.  */
async function prepareFilesToUpload(taskParameters: TaskParameters, filesToUpload: string[], tmpUploadDir: string): Promise<void> {
	await convertCoverageFiles(filesToUpload.filter(utils.isCoverageFile), tmpUploadDir, taskParameters.codeCoverageExePath, taskParameters.codeCoverageConversionBatchSize);
	
	task.debug(`Copying files to ${tmpUploadDir}`);
	filesToUpload.filter(file => !utils.isCoverageFile(file)).forEach(file => {
		// make sure to not overwrite files with the same name from different directories
		const target = createUniquePath(path.join(tmpUploadDir, path.basename(file)));
		task.cp(file, target);
	});
}

/** Uploads the specified files to Teamscale. */
async function uploadFiles(taskParameters: TaskParameters, dirPatternToUpload: string) {
	const message = `Build ${buildId}`;
	const teamscaleUploadRunner: toolRunner.ToolRunner = createTeamscaleUploadRunner(taskParameters, message, dirPatternToUpload);

	let output: string = '';
	teamscaleUploadRunner.on('stdout', (buffer: Buffer) => {
		process.stdout.write(buffer);
		if (buffer) {
			output = output.concat(buffer.toString());
		}
	});

	const exitCode: number = await teamscaleUploadRunner.exec({
		silent: false
	} as toolRunner.IExecOptions);
	if (exitCode === 0) {
		task.setResult(task.TaskResult.Succeeded, 'Upload finished successfully');
	} else {
		task.setResult(task.TaskResult.Failed, `Upload failed with exit code ${exitCode}`);
	}
}

function createTeamscaleUploadRunner(taskParameters: TaskParameters, message: string, dirPatternToUpload: string) {
	const isWindows = os.type().match(/^Win/);
	let teamscaleUploadPath = path.join(__dirname, 'teamscaleUpload/teamscale-upload.exe');
	if (!isWindows) {
		teamscaleUploadPath = path.join(__dirname, 'teamscaleUpload/teamscale-upload');
		// the vsix is a zip which does not preserve permissions
		// so our teamscale-upload binary is not executable by default
		fs.chmodSync(teamscaleUploadPath, '777');
	}

    const teamscaleUploadRunner = task.tool(teamscaleUploadPath);
    teamscaleUploadRunner.arg(['--server', taskParameters.teamscaleUrl]);
    teamscaleUploadRunner.arg(['--project', taskParameters.project]);
    teamscaleUploadRunner.arg(['--user', taskParameters.username]);
    teamscaleUploadRunner.arg(['--partition', "'"+taskParameters.partition+"'"]);
    teamscaleUploadRunner.arg(['--format', taskParameters.format]);
    teamscaleUploadRunner.arg(['--commit', revision]);
    teamscaleUploadRunner.arg(['--append-to-message', "'"+message+"'"]);
	teamscaleUploadRunner.argIf(!utils.isEmpty(taskParameters.accessKey), ['--accesskey', taskParameters.accessKey]);
	teamscaleUploadRunner.argIf(taskParameters.insecure, '--insecure');
	teamscaleUploadRunner.argIf(!utils.isEmpty(taskParameters.trustedKeystoreWithPassword), ['--trusted-keystore', taskParameters.trustedKeystoreWithPassword]);
	teamscaleUploadRunner.argIf(taskParameters.stacktrace, '--stacktrace');
	teamscaleUploadRunner.arg(dirPatternToUpload);
    return teamscaleUploadRunner;
}

process.on('unhandledRejection', (error: Error) => {
	task.error(`Task failed. Please check the log for further details.\n${error.stack}`);
	task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${error.message}`);
});

run();
