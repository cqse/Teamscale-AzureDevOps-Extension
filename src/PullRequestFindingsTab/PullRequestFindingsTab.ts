/**
 * Shows the TS Delta findings view in a tab in the Azure Devops Pull Request perspective.
 */

import { GitHttpClient4_1 } from 'TFS/VersionControl/GitRestClient';
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


VSS.require(['TFS/VersionControl/GitRestClient'], function (GitService) {
    let gitClient: GitHttpClient4_1 = GitService.getClient();

    showTeamscaleIframe(gitClient);
    VSS.notifyLoadSucceeded();
});


/**
 * Includes the Teamscale Findings Kiosk (delta perspective) in an iframe (for Azure DevOps Service) or opens it in a
 * dialog (for Azure DevOps Server; on-premise) for the currently viewed ADOS Pull Request.
 */
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

        if (isHostedAzureDevOpsService()) {
            appendIframe(deltaPerspectiveUrl);
            return;
        }
        openFindingsKioskAsDialog(configuration.pullRequestId, teamscaleUrl, teamscaleProject, sourceBranch, targetBranch);
    } catch (error) {
        disableTeamscaleLoadingSpinner();

        if (error && error.status && (error.status === 401 || error.status === 403)) {
            handleUnauthorized(teamscaleUrl);
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
 * Returns whether the extension is executed on a hosted installation (Azure DevOps Service; return value: true) or
 * on an on-premise installation (Azure DevOps Server; return value: false). This is determined on the host's url.
 */
function isHostedAzureDevOpsService() {
    const serverUri: string = VSS.getWebContext().host.uri;
    return serverUri.match('^https:\/\/([A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?.visualstudio\.com|dev.azure.com)');
}

/**
 * In Azure DevOps Server (on-premise installations) the iframe in which the findings kiosk would normally open is
 * sandboxed and thus the Findings Kiosk is opened in a dialog.
 */
function openFindingsKioskAsDialog(pullRequestId: number, teamscaleUrl: string, teamscaleProject: string,
                                   sourceBranch: string, targetBranch: string) {
    const extensionCtx = VSS.getExtensionContext();
    const contributionId = extensionCtx.publisherId + '.' + extensionCtx.extensionId + '.pull-request-findings-dialog';
    const teamscaleProtocolAndHost = teamscaleUrl.split('://', 2);
    const dialogOptions = {
        title: 'Teamscale Findings for Pull Request ' + pullRequestId,
        width: 1000,
        height: 650,
        resizable: true,
        buttons: null,
        urlReplacementObject: {
            protocol: teamscaleProtocolAndHost[0],
            teamscaleServer: teamscaleProtocolAndHost[1],
            teamscaleProject: teamscaleProject,
            sourceBranch: sourceBranch,
            targetBranch: targetBranch,
        },
    };

    VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
        dialogService.openDialog(contributionId, dialogOptions);
        disableTeamscaleLoadingSpinner();
        const dialogInfoBox: HTMLDivElement = document.createElement('div');
        dialogInfoBox.id = 'dialog-info';
        dialogInfoBox.innerHTML = '<img src="../images/teamscale.png" width="64">' +
            '<p>Findings were opened in a separate dialog.<br><br>' +
            'Loading the findings in the dialog might take some time.</p>';
        document.getElementById('container').appendChild(dialogInfoBox);
    });

    registerTabChangeListenerToReopenDialog(contributionId, dialogOptions);
}

/**
 * On on-premise installations, the dialog with the findings kiosk has to be opened again, when the "Teamscale
 * Findings" tab is reopened. This function listens on navigation changes and opens the dialog again, if the
 * appropriate tab is opened.
 */
function registerTabChangeListenerToReopenDialog(contributionId, dialogOptions) {
    const reopenDialogOnTabChangeCallback = function (state) {
        if (state.action && state.action === 'Teamscale Findings') {
            VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
                dialogService.openDialog(contributionId, dialogOptions);
            });
        }
    };

    VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService: IHostNavigationService) {
        navigationService.onHashChanged(function (hash) {
            VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService: IHostNavigationService) {
                navigationService.getCurrentState().then(reopenDialogOnTabChangeCallback);
            });
        });
    });
}

/**
 * Displays an error message and opens the iframe with the TS login page.
 */
function handleUnauthorized(teamscaleUrl) {
    const messageElement: HTMLParagraphElement = document.createElement('p');
    messageElement.id = 'message';
    messageElement.innerText = 'Please log in to Teamscale first and reload this Azure DevOps page.';

    if (isHostedAzureDevOpsService()) {
        document.getElementById('container').appendChild(messageElement);

        const loginUrl = teamscaleUrl + '/login.html?target=delta.html%23%3FkioskViewMode%3Dtrue';
        appendIframe(loginUrl);
    }
    // sandboxed iframe on on-premise installation does not allow integrated iframe login to Teamscale
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
 * Disables the loading spinner.
 */
function disableTeamscaleLoadingSpinner() {
    document.getElementById('container').style.background = 'transparent';
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