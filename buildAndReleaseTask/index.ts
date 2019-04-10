import * as path from 'path';
import * as task from 'azure-pipelines-task-lib/task';
import * as os from 'os';
import * as toolRunner from 'azure-pipelines-task-lib/toolrunner';
import * as utils from './utils';

// c.f. https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml#build-variables
const revision = task.getVariable('Build.SourceVersion');
const buildId = task.getVariable('Build.BuildNumber');

const isWindows = os.type().match(/^Win/);

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

    const codeCoverageExePath: string = task.getInput('codeCoverageExePath', true);
    const codeCoverageRunner: toolRunner.ToolRunner = task.tool(codeCoverageExePath);
    codeCoverageRunner.arg('/analyze');
    codeCoverageRunner.arg('/output');
    codeCoverageRunner.arg(outputXmlFile);
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

    const exitCode: number = await curlRunner.exec();
    if (exitCode === 0) {
        task.setResult(task.TaskResult.Succeeded, `Upload finished with exit code ${exitCode}`);
    } else {
        task.setResult(task.TaskResult.Failed, `Upload finished with exit code ${exitCode}`);
    }

    const uploadCount = filesToUpload.length;
    checkNumberOfUploadedFiles(output, uploadCount);
}

function createCurlRunner(username: string, accessKey: string, filesToUpload: string[], uploadUrl: string) {
    const curlPath: string = task.which('curl');
    if (!curlPath) {
        throw new Error(`Could not locate curl. Please make sure it's available on the PATH.`);
    }

    const curlRunner: toolRunner.ToolRunner = task.tool(curlPath);
    curlRunner.arg('-X');
    curlRunner.arg('POST');
    curlRunner.arg(`-u${username}:${accessKey}`);
    for (const file of filesToUpload) {
        curlRunner.arg(`-Freport=@${file}`);
    }
    curlRunner.arg('--stderr');
    curlRunner.arg('-');
    curlRunner.arg(uploadUrl);
    return curlRunner;
}

function checkNumberOfUploadedFiles(output: string, expectedUploadCount: number) {
    let outputMatch: RegExpMatchArray = output.match(/[\n\r]100\s/g);
    let completed: number = outputMatch ? outputMatch.length : 0;
    task.debug(`Successfully uploaded ${completed} files`);
    if (completed !== expectedUploadCount) {
        task.debug('Tested output [' + output + ']');
        task.warning(`Only ${completed} of ${expectedUploadCount} files were uploaded`);
    }
}

run();
