import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';
import * as os from 'os';
import * as fs from 'fs';
import * as toolRunner from 'azure-pipelines-task-lib/toolrunner';
import * as utils from './utils';

// c.f. https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml#build-variables
const revision = task.getVariable('Build.SourceVersion');
const buildId = task.getVariable('Build.BuildNumber');

const isWindows = os.type().match(/^Win/)
let curlPath = path.join(__dirname, `curl/windows/curl.exe`);
if (!isWindows) {
    curlPath = path.join(__dirname, `curl/linux/curl`);
    // the vsix is a zip which does not preserve permissions
    // so our curl binary is not executable by default
    fs.chmodSync(curlPath, '777');
}

async function run() {
    try {
        return runUnsafe();
    } catch (e) {
        task.error(e.message);
        task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${e.message}`);
    }
}

async function convertCoverageFiles(coverageFiles: string[]) : Promise<string> {
    const outputXmlFile = path.join(path.dirname(coverageFiles[0]), 'coverage.xml');

    let codeCoverageExePath: string = task.getInput('codeCoverageExePath');
    if (!codeCoverageExePath || codeCoverageExePath.trim() === "") {
        codeCoverageExePath = path.join(__dirname, 'CodeCoverage/CodeCoverage.exe');
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

async function runUnsafe() {
    task.setResourcePath(path.join(__dirname, 'task.json'));

    const filesPattern: string = task.getInput('files', true);
    const teamscaleUrl: string = task.getInput('url', true).trim();
    const format: string = task.getInput('format', true);
    const username: string = task.getInput('username', true);
    const accessKey: string = task.getInput('accessKey', true);
    const project: string = task.getInput('project', true);
    const partition: string = task.getInput('partition', true);

    const message = `${partition} Upload (Build ${buildId})`;
    const uploadUrl = utils.createUploadUrl(teamscaleUrl, project, format, partition, message, revision);

    let filesToUpload = utils.resolveFiles(filesPattern);
    task.debug(`Uploading ${filesToUpload}`);
    const coverageFiles = filesToUpload.filter(utils.isCoverageFile);
    task.debug(`Coverage files: ${coverageFiles}`);
    if (coverageFiles.length > 0) {
        const convertedCoverageFile = await convertCoverageFiles(coverageFiles);
        filesToUpload = filesToUpload.filter(file => !utils.isCoverageFile(file)).concat(convertedCoverageFile);
        task.debug(`Now uploading ${filesToUpload}`);
    }

    const curlRunner: toolRunner.ToolRunner = createCurlRunner(username, accessKey, filesToUpload, uploadUrl);

    let output: string = '';
    curlRunner.on('stdout', (buffer: Buffer) => {
        process.stdout.write(buffer);
        output = output.concat(buffer ? buffer.toString() : '');
    });

    const exitCode: number = await curlRunner.exec({silent: true} as toolRunner.IExecOptions);
    if (exitCode === 0) {
        task.setResult(task.TaskResult.Succeeded, "Upload finished successfully");
    } else {
        task.setResult(task.TaskResult.Failed, `Upload failed with exit code ${exitCode}`);
    }
}

function createCurlRunner(username: string, accessKey: string, filesToUpload: string[], uploadUrl: string) {
    const curlRunner: toolRunner.ToolRunner = task.tool(curlPath);
    // we don't validate SSL certificates to allow for self-signed certs
    curlRunner.arg('--insecure');
    curlRunner.arg('-v');

    curlRunner.arg('-X');
    curlRunner.arg('POST');
    curlRunner.arg(`-u${username}:${accessKey}`);
    for (const file of filesToUpload) {
        curlRunner.arg(`-Freport=@${file}`);
    }
    // redirects stderr to stdout
    curlRunner.arg('--stderr');
    curlRunner.arg('-');
    // makes curl fail if the returned HTTP code is not 2xx, e.g. if the user does not have the right
    // permissions in Teamscale
    curlRunner.arg('--fail');
    curlRunner.arg(uploadUrl);
    return curlRunner;
}

process.on('unhandledRejection', (error : Error) => {
    task.error(`Task failed. Please check the log for further details.\n${error.stack}`);
    task.setResult(task.TaskResult.Failed, `Upload to Teamscale failed with error: ${error.message}`);
});

run();
