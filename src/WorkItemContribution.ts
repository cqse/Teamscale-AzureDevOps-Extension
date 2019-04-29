/**
 * Contribution for the work item UI. It shows a test gap badge when Teamscale URL and project are properly set up via
 * the project settings contribution
 */
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";
import {ProjectSettings} from "./Settings/ProjectSettings";

let teamscaleClient: TeamscaleClient = null;
let teamscaleProject: string = "";
let projectSettings: Settings = null;
let organizationSettings: Settings = null;

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
    loadTgaBadge();
});

function loadTgaBadge() {
    let azureProjectName = VSS.getWebContext().project.name;
    projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    organizationSettings = new Settings(Scope.ProjectCollection);

    projectSettings.get(Settings.TEAMSCALE_URL).then((url) => {
        if (!url) {
            return Promise.reject({status: -2});
        }
        teamscaleClient = new TeamscaleClient(url);
        return projectSettings.get(Settings.TEAMSCALE_PROJECT)
    }).then(project => {
        if (!project) {
            return Promise.reject({status: -1});
        }
        teamscaleProject = project;
        return workItemService.WorkItemFormService.getService();
    }).then(service => {
        return service.getId();
    }).then((id) => {
        return teamscaleClient.queryIssueTestGapBadge(teamscaleProject, id);
    }).then((tgaBadge) => {
        const tgaBadgeElement = $('#tga-badge');
        tgaBadgeElement.html(tgaBadge);
        resizeHost();
        VSS.notifyLoadSucceeded();
    }, (reason) => {
        organizationSettings.get(Settings.EMAIL_CONTACT).then(email => {
            switch (reason.status) {
                case -2:
                    showInfoBanner(`Teamscale is not configured for this project. ${generateContactText(email)}`);
                    VSS.notifyLoadSucceeded();
                    break;
                case -1:
                    showInfoBanner(`Please make sure <a href="${teamscaleClient.url}" target="_top">Teamscale</a> is reachable from your computer. ` +
                        `If the problem persists: ${generateContactText(email)}`);
                    VSS.notifyLoadSucceeded();
                    break;
                case 403:
                    showNotLoggedInMessage();
                    VSS.notifyLoadSucceeded();
                    break;
                case 404:
                    showInfoBanner(`Could not find project "${teamscaleProject}" ` +
                        `on the Teamscale server <a href="${teamscaleClient.url}" target="_top">${teamscaleClient.url}</a>. ` +
                        `${generateContactText(email)}`);
                    VSS.notifyLoadSucceeded();
                    break;
                default:
                    let message = `Failed with error code ${reason.status}`;
                    if (reason.statusText) {
                        message += `: ${reason.statusText}`;
                    }
                    message += `. ${generateContactText(email)}`;
                    showErrorBanner(message);
                    VSS.notifyLoadSucceeded();
            }
        });
    });
}

/**
 * Generates a text that can be appended to info/error messages. If the email is set, a mailto link to the Teamscale team
 * is generated, otherwise a note to contact the administrator
 */
function generateContactText(email: String) {
    let contact = "your administrator";
    if (email) {
        contact = `<a href="mailto:${email}">the Teamscale-Team</a>`;
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
                    loadTgaBadge();
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
