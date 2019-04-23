/**
 * Contribution for the work item UI. It shows a test gap badge when Teamscale URL and project are properly set up via
 * the project settings contribution
 */
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";
import {ProjectSettings} from "./Settings/ProjectSettings";

const titleTestGapBadge: string = 'Tests';
const titleFindingsChurnBadge: string = 'Findings Churn';

let teamscaleClient: TeamscaleClient = null;
let teamscaleProject: string = "";
let emailContact: string = "";
let issueId: number = 0;
let projectSettings: Settings = null;
let organizationSettings: Settings = null;
let displayedErrorMessage: boolean = false;

// VSS services
let controlService = null;
let notificationService = null;
let workItemService = null;

// Set extension properties in VSS
VSS.init({
    /* Require the extension to notify VSS that it's ready loading.
    We do a lot of async processing (querying settings, Teamscale, ...), so this is required.*/
    explicitNotifyLoaded: true,
    // Allow dark theme
    applyTheme: true,
    usePlatformStyles: true, //
    usePlatformScripts: true // Required for theming/styling
});

//Request the required services from VSS. Once retrieved, register a contribution callback (required by VSS) and load the TGA badge
VSS.require(["TFS/WorkItemTracking/Services", "VSS/Controls", "VSS/Controls/Notifications"], function (workItemServices, controls, notifications) {
    controlService = controls;
    notificationService = notifications;
    workItemService = workItemServices;

    VSS.register(VSS.getContribution().id, function () {
        return {
            // Called when the active work item is modified
            onFieldChanged: function (args) {
            },

            // Called when a new work item is being loaded in the UI
            onLoaded: function (args) {
            },

            // Called when the active work item is being unloaded in the UI
            onUnloaded: function (args) {
            },

            // Called after the work item has been saved
            onSaved: function (args) {
            },

            // Called when the work item is reset to its unmodified state (undo)
            onReset: function (args) {
            },

            // Called when the work item has been refreshed from the server
            onRefreshed: function (args) {
            }
        }
    });
    loadAndCheckConfiguration().then(() => loadBadges());
});

/**
 * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
 * name is set in the Azure DevOps project settings.
 */
async function loadAndCheckConfiguration() {
    let azureProjectName = VSS.getWebContext().project.name;
    projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    organizationSettings = new Settings(Scope.ProjectCollection);

    emailContact = await organizationSettings.get(Settings.EMAIL_CONTACT);
    return Promise.all([initializeTeamscaleClient(), resolveProjectName(), resolveIssueId()]);
}

/**
 * Fetches issue specific badges as SVG from the Teamscale server and places them in the work item form.
 */
async function loadBadges() {
    let tgaBadge: string = '';
    let findingsChurnBadge: string = '';

    try {
        tgaBadge = await teamscaleClient.queryIssueTestGapBadge(teamscaleProject, issueId);
        tgaBadge = '<div id="tga-badge">'+titleTestGapBadge+'<br>' + tgaBadge + '</div>';
    } catch (error) {
        handleErrorsInRetrievingBadges(error);
    }

    try {
        findingsChurnBadge = await teamscaleClient.queryFindingsChurnBadge(teamscaleProject, issueId);
        findingsChurnBadge = titleFindingsChurnBadge +'<br>' + findingsChurnBadge;
    } catch (error) {
        handleErrorsInRetrievingBadges(error);
    }

    tgaBadge = replaceClipPathId(tgaBadge, 'tgaBadge');
    findingsChurnBadge = replaceClipPathId(findingsChurnBadge, 'findingsChurnBadge');
    const badgesElement = $('#badges');
    badgesElement.html(tgaBadge.concat(findingsChurnBadge));

    resizeHost();
    VSS.notifyLoadSucceeded();
}

async function initializeTeamscaleClient() {
    let url = await projectSettings.get(Settings.TEAMSCALE_URL);

    if (!url) {
        endLoadingWithInfoMessage(`Teamscale is not configured for this project. ${generateContactText()}`);
        return Promise.reject();
    }

    teamscaleClient = new TeamscaleClient(url);
}

async function resolveProjectName() {
    teamscaleProject = await projectSettings.get(Settings.TEAMSCALE_PROJECT);

    if (!teamscaleProject) {
        endLoadingWithInfoMessage('Please make sure that a Teamscale project name is properly configured in the ' +
          'Azure DevOps Project settings.');
        return Promise.reject();
    }
}

async function resolveIssueId() {
    let service = await workItemService.WorkItemFormService.getService();
    issueId = await service.getId();
}

function endLoadingWithInfoMessage(message: string) {
    showInfoBanner(message);
    VSS.notifyLoadSucceeded();
}

/**
 * If receiving the badges from the Teamscale server failed, available information is displayed as info or error banner.
 */
function handleErrorsInRetrievingBadges(reason: any) {
    if (displayedErrorMessage) {
        return;
    }

    displayedErrorMessage = true;
    switch (reason.status) {
        case 403:
            showNotLoggedInMessage();
            VSS.notifyLoadSucceeded();
            break;
        case 404:
            showInfoBanner(`Could not find project "${teamscaleProject}" ` +
                `on the Teamscale server <a href="${teamscaleClient.url}" target="_top">${teamscaleClient.url}</a>. ` +
                `${generateContactText()}`);
            VSS.notifyLoadSucceeded();
            break;
        default:
            let message = `Failed with error code ${reason.status}`;
            if (reason.statusText) {
                message += `: ${reason.statusText}`;
            }
            message += `. ${generateContactText()}`;
            showErrorBanner(message);
            VSS.notifyLoadSucceeded();
    }
}

/**
 * Generates a text that can be appended to info/error messages. If the email is set, a mailto link to the Teamscale team
 * is generated, otherwise a note to contact the administrator
 */
function generateContactText() {
    let contact = "your administrator";
    if (emailContact) {
        contact = `<a href="mailto:${emailContact}">the Teamscale-Team</a>`;
    }
    return `Please contact ${contact}.`;
}

/**
 * Shows an info message with a link to open the login dialog for Teamscale
 */
function showNotLoggedInMessage() {
    showInfoBanner(`Please log into <a id="login-link">Teamscale</a>`);
    $("#login-link").click(function () {
        VSS.getService(VSS.ServiceIds.Dialog).then((dialogService: IHostDialogService) => {
            const extensionCtx = VSS.getExtensionContext();
            // Build absolute contribution ID for dialogContent
            const contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".teamscale-login-dialog";

            // Show dialog
            const dialogOptions = {
                title: "Teamscale Login",
                width: 600,
                height: 720,
                buttons: null,
                close: function () {
                    $('#tga-badge').empty();
                    $('#message-div').empty();
                    loadBadges();
                }
            };

            dialogService.openDialog(contributionId, dialogOptions);
        });
    });
}

/**
 * Shows an info banner (vss notification).
 * @param message The message to display. It may contain HTML.
 */
function showInfoBanner(message: String) {
    const notification = generateNotification();
    notification.setMessage($(`<div>${message}</div>`), notificationService.MessageAreaType.Info);
    resizeHost();
}

/**
 * Shows an error banner (vss notification).
 * @param message The message to display. It may contain HTML.
 */
function showErrorBanner(message: String) {
    const notification = generateNotification();
    notification.setMessage($(`<div>${message}</div>`), notificationService.MessageAreaType.Error);
    resizeHost();
}

/**
 * Generates a notification control (banner) with an icon and which is not closeable
 */
function generateNotification() {
    const notificationContainer = $('#message-div');
    return controlService.create(notificationService.MessageAreaControl, notificationContainer, {
        closeable: false,
        showIcon: true,
    });
}

/**
 * Resize the body of the host iframe to match the height of the body of the extension
 */
function resizeHost() {
    const bodyElement = $('body,html');
    VSS.resize(bodyElement.width(), bodyElement.height());
}

/**
 * Teamscale delivers all Badges with the same clipPath. When having multiple badges-svgs with the same clipPath on one
 * html page, Chrome uses the first defined clipPath which leads to incorrect cropped (second) svg.
 *
 */
function replaceClipPathId(plainSvg: string, clipPathId: string): string {
    plainSvg = plainSvg.replace(new RegExp("(<clipPath[^>]*id=\\\")a\\\"","gm"), '$1' + clipPathId + '"');
    return plainSvg.replace(new RegExp("(<g[^>]*clip-path=\")url\\(#a\\)\\\"","gm"),   '$1' + 'url(#' + clipPathId + ')"');
}