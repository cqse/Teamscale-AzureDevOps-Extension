import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';
import * as os from 'os';
import * as fs from 'fs';
import * as toolRunner from 'azure-pipelines-task-lib/toolrunner';
import * as utils from './utils';

type TaskParameters = {
	filesPattern: string,
	teamscaleUrl: string,
	format: string,
	username: string,
	accessKey: string,
	project: string,
	partition: string,
	insecure: Boolean,
	stacktrace: Boolean,
	trustedKeystoreWithPassword: string
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

const isWindows = os.type().match(/^Win/);
let teamscaleUploadPath = path.join(__dirname, 'teamscaleUpload/windows/teamscale-upload.exe');
if (!isWindows) {
	teamscaleUploadPath = path.join(__dirname, 'teamscaleUpload/linux/teamscale-upload');
	// the vsix is a zip which does not preserve permissions
	// so our teamscale-upload binary is not executable by default
	fs.chmodSync(teamscaleUploadPath, '777');
}

async function run() {
	try {
		return runUnsafe();
	} catch (e) {
		task.error(e.message);
		task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${e.message}`);
	}
}

async function convertCoverageFiles(coverageFiles: string[]): Promise<string> {
	const outputXmlFile = path.join(path.dirname(coverageFiles[0]), 'coverage.xml');

	let codeCoverageExePath: string = task.getInput('codeCoverageExePath');
	if (utils.isNullOrEmpty(codeCoverageExePath)) {
		codeCoverageExePath = path.join(__dirname, 'CodeCoverage/CodeCoverage.exe');
	} else {
		task.checkPath(codeCoverageExePath, 'code-coverage-exe-path')
	}

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

	return outputXmlFile;
}

function readValuesFromTask(): TaskParameters {
	const trustedKeystore: string = task.getInput('trustedKeystore', false);
	let keystorePassword: string = null;
	let trustedKeystoreWithPassword: string = null;
	if (!utils.isNullOrEmpty(trustedKeystore)) {
		task.checkPath(trustedKeystore, 'custom-keystore-path');
		keystorePassword = task.getInput('keystorePassword', false);
		if (utils.isNullOrEmpty(keystorePassword)) {
			keystorePassword = task.getVariable('teamscale.keystorePassword');
		}
		trustedKeystoreWithPassword = `${trustedKeystore};${keystorePassword}`;
	}

	let accessKey: string = task.getInput('accessKey', false);
	if (utils.isNullOrEmpty(accessKey)) {
		accessKey = task.getVariable('teamscale.accessKey');
	}

	// Don't reveal secrets in the logs
	if (!utils.isNullOrEmpty(keystorePassword)) {
		task.setSecret(keystorePassword);
	}
	if (!utils.isNullOrEmpty(accessKey)) {
		task.setSecret(accessKey);
	}

	return {
		filesPattern: task.getInput('files', true),
		teamscaleUrl: task.getInput('url', true).trim(),
		format: task.getInput('format', true),
		username: task.getInput('username', true),
		accessKey: accessKey,
		project: task.getInput('project', true),
		partition: task.getInput('partition', true),
		insecure: task.getBoolInput('insecure', false),
    	stacktrace: task.getBoolInput('stacktrace', false),
		trustedKeystoreWithPassword: trustedKeystoreWithPassword
	}
}

async function runUnsafe() {
	task.setResourcePath(path.join(__dirname, 'task.json'));

	const taskParameters = readValuesFromTask();
	const message = `${taskParameters.partition} Upload (Build ${buildId})`;
	let filesToUpload = utils.resolveFiles(taskParameters.filesPattern);
	task.debug(`Uploading ${filesToUpload}`);
	const coverageFiles = filesToUpload.filter(utils.isCoverageFile);
	task.debug(`Coverage files: ${coverageFiles}`);
	if (coverageFiles.length > 0) {
		const convertedCoverageFile = await convertCoverageFiles(coverageFiles);
		filesToUpload = filesToUpload.filter(file => !utils.isCoverageFile(file)).concat(convertedCoverageFile);
		task.debug(`Now uploading ${filesToUpload}`);
	}

	const teamscaleUploadRunner: toolRunner.ToolRunner = createTeamscaleUploadRunner(taskParameters, message, filesToUpload);

	let output: string = '';
	teamscaleUploadRunner.on('stdout', (buffer: Buffer) => {
		process.stdout.write(buffer);
		output = output.concat(buffer ? buffer.toString() : '');
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

function createTeamscaleUploadRunner(taskParameters: TaskParameters, message, filesToUpload) {
    const teamscaleUploadRunner = task.tool(teamscaleUploadPath);
    teamscaleUploadRunner.arg(['-s', taskParameters.teamscaleUrl]);
    teamscaleUploadRunner.arg(['-p', taskParameters.project]);
    teamscaleUploadRunner.arg(['-u', taskParameters.username]);
    teamscaleUploadRunner.arg(['-t', taskParameters.partition]);
    teamscaleUploadRunner.arg(['-f', taskParameters.format]);
    teamscaleUploadRunner.arg(['-c', revision]);
    teamscaleUploadRunner.arg(['--message', message]);
	teamscaleUploadRunner.argIf(!utils.isNullOrEmpty(taskParameters.accessKey), ['-a', taskParameters.accessKey]);
	teamscaleUploadRunner.argIf(taskParameters.insecure, '--insecure');
	teamscaleUploadRunner.argIf(!utils.isNullOrEmpty(taskParameters.trustedKeystoreWithPassword), ['--trusted-keystore', taskParameters.trustedKeystoreWithPassword]);
	teamscaleUploadRunner.argIf(taskParameters.stacktrace, '--stacktrace');
    for (const file of filesToUpload) {
        teamscaleUploadRunner.arg(file);
    }
    return teamscaleUploadRunner;
}

process.on('unhandledRejection', (error: Error) => {
	task.error(`Task failed. Please check the log for further details.\n${error.stack}`);
	task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${error.message}`);
});

run();
