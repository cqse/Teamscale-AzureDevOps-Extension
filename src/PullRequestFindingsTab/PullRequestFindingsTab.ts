/**
 * Shows the TS Delta findings view in a tab in the Azure Devops Pull Request perspective.
 */

import { GitHttpClient4_1 } from "TFS/VersionControl/GitRestClient";
import { ProjectSettings } from '../Settings/ProjectSettings';
import TeamscaleClient from '../TeamscaleClient';
import { getFirstProjectHavingGivenBranches } from '../Utils/ProjectsUtils';
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
    const teamscaleUrl = await projectSettings.get(Settings.TEAMSCALE_URL_KEY);

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

    try {
        const teamscaleProject: string = await getFirstProjectHavingGivenBranches(getTeamscaleClient(teamscaleUrl),
            await projectSettings.getProjectsList(Settings.TEAMSCALE_PROJECTS_KEY), [sourceBranch, targetBranch]);

        const deltaPerspectiveUrl = teamscaleUrl + '/delta.html#findings/' + teamscaleProject + '/?from=' + sourceBranch +
            ':HEAD&to=' + targetBranch + ':HEAD&showMergeFindings=true&kioskViewMode=true';

        appendIframe(deltaPerspectiveUrl);
    } catch (error) {
        // disable loading spinner
        document.getElementById('container').style.background = 'transparent';

        if (error && error.status && (error.status === 401 || error.status === 403)) {
            const messageElement: HTMLParagraphElement = document.createElement('p');
            messageElement.id = 'message';
            messageElement.innerText = 'Please log in to Teamscale first and reload this Azure DevOps page.';
            document.getElementById('container').appendChild(messageElement);

            const loginUrl = teamscaleUrl + '/login.html?target=delta.html';
            appendIframe(loginUrl);
            return;
        }

        if (error.message) {
            VSS.notifyLoadFailed(error.message);
        } else {
            VSS.notifyLoadFailed('Failed with unknown error.');
        }
    }
}

/**
 * Appends an iframe targeting the given url.
 */
function appendIframe(targetUrl) {
    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.src = targetUrl;
    iframe.id = 'iframe';
    document.getElementById('container').appendChild(iframe);
}


/**
 * Initializes the Teamscale Client with the url configured in the project settings.
 */
function getTeamscaleClient(url: string) {
    if (!url) {
        throw new Error('Teamscale is not configured for this Azure Dev Ops project.');
    }

    return new TeamscaleClient(url);
}