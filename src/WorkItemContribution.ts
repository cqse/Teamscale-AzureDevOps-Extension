import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";
import {ProjectSettings} from "./Settings/ProjectSettings";


let teamscaleClient: TeamscaleClient = null;
let teamscaleProject: string = "";
let projectSettings: Settings = null;
let organizationSettings: Settings = null;
let controlService = null;
let notificationService = null;

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true,
    applyTheme: true
});

VSS.require(["TFS/WorkItemTracking/Services", "VSS/Controls", "VSS/Controls/Notifications"], function (workItemServices, controls, notifications) {
    controlService = controls;
    notificationService = notifications;

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

    let azureProjectName = VSS.getWebContext().project.name;
    projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    organizationSettings = new Settings(Scope.ProjectCollection);

    projectSettings.get(Settings.TEAMSCALE_URL).then((url) => {
        if (!url) {
            return Promise.reject({status: -1});
        }
        teamscaleClient = new TeamscaleClient(url);
        return projectSettings.get(Settings.TEAMSCALE_PROJECT)
    }).then(project => {
        if (!project) {
            return Promise.reject({status: -1});
        }
        teamscaleProject = project;
        return workItemServices.WorkItemFormService.getService();
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
                case -1:
                    showNotConfiguredMessage(email);
                    VSS.notifyLoadSucceeded();
                    break;
                case 403:
                    showNotLoggedInMessage();
                    VSS.notifyLoadSucceeded();
                    break;
                default:
                    VSS.notifyLoadFailed('');
            }
        });
    });
});

function showNotConfiguredMessage(email: string) {
    const notificationContainer = $('body,html');
    const notification = controlService.create(notificationService.MessageAreaControl, notificationContainer, {
        closeable: false,
        showIcon: true,
        type: 1,
        showHeader: true,
        expanded: false,
        hidden: false
    });

    if (email) {
        notification.setMessage($(`<div>Teamscale is not configure for this project, please <a href="mailto:${email}">contact the Teamscale-Team</a></div>`), 1);
    } else {
        notification.setMessage($(`<div>Teamscale is not configure for this project, please contact your administrator</div>`), 1);
    }
    resizeHost();
}

function showNotLoggedInMessage() {
    const notificationContainer = $('body,html');
    const notification = controlService.create(notificationService.MessageAreaControl, notificationContainer, {
        closeable: false,
        showIcon: true,
        type: 1,
        showHeader: true,
        expanded: false,
        hidden: false
    });
    notification.setMessage($(`<div>Please log into <a id="login-link">Teamscale</a></div>`), 1);
    $("#login-link").click(function () {
        VSS.getService(VSS.ServiceIds.Dialog).then((dialogService: IHostDialogService)  => {
            const extensionCtx = VSS.getExtensionContext();
            // Build absolute contribution ID for dialogContent
            const contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".teamscale-login-dialog";

            // Show dialog
            const dialogOptions = {
                title: "Teamscale Login",
                width: 600,
                height: 770
            };

            dialogService.openDialog(contributionId, dialogOptions);
        });
    });
    resizeHost();
}

function resizeHost() {
    const bodyElement = $('body,html');
    VSS.resize(bodyElement.width(), bodyElement.height());
}
