/**
 * Shows the TS Delta findings view in a tab in the Azure Devops Pull Request perspective.
 */

import { GitHttpClient4_1 } from "TFS/VersionControl/GitRestClient";
import { ProjectSettings } from '../Settings/ProjectSettings';
import { Scope } from '../Settings/Scope';
import { Settings } from '../Settings/Settings';
import { PullRequestTabExtensionConfig, GitPullRequest } from 'TFS/VersionControl/Contracts';

VSS.init({
    explicitNotifyLoaded: true,
    applyTheme: true,
    usePlatformStyles: true,
    usePlatformScripts: true,
});


VSS.require(["TFS/VersionControl/GitRestClient"], function (GitService) {
    let gitClient: GitHttpClient4_1 = GitService.getClient();

    showTeamscaleIframe(gitClient);
    VSS.notifyLoadSucceeded();
});


async function showTeamscaleIframe(gitClient) {
    const azureProjectName: string = VSS.getWebContext().project.name;
    const projectSettings: ProjectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    const teamscaleProject: string = await projectSettings.get(Settings.TEAMSCALE_PROJECT);
    const teamscaleUrl = await projectSettings.get(Settings.TEAMSCALE_URL);

    const SUPPORTED_BRANCH_PREFIX = 'refs/heads/';
    const configuration: PullRequestTabExtensionConfig = VSS.getConfiguration();
    const pullRequest: GitPullRequest = await gitClient.getPullRequest(configuration.repositoryId,
        configuration.pullRequestId);

    if (!pullRequest) {
        VSS.notifyLoadFailed('Could not retrieve pull request information.');
        return;
    }

    if (!pullRequest.sourceRefName.startsWith(SUPPORTED_BRANCH_PREFIX) ||
            !pullRequest.targetRefName.startsWith(SUPPORTED_BRANCH_PREFIX) ) {
        VSS.notifyLoadFailed('Expected source and target branch reference to start with ' + SUPPORTED_BRANCH_PREFIX);
        return;
    }

    const sourceBranch = pullRequest.sourceRefName.substring(SUPPORTED_BRANCH_PREFIX.length);
    const targetBranch = pullRequest.targetRefName.substring(SUPPORTED_BRANCH_PREFIX.length);

    const deltaPerspectiveUrl = teamscaleUrl + '/delta.html#findings/' + teamscaleProject + '/?from=' + sourceBranch +
        ':HEAD&to=' + targetBranch + ':HEAD&showMergeFindings=true&kioskViewMode=true';

    let iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.src = deltaPerspectiveUrl;
    iframe.id = 'iframe';
    document.getElementById('container').appendChild(iframe);
}

