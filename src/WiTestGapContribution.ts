import {IWorkItemFormService} from "TFS/WorkItemTracking/Services"
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";


let teamscaleClient = null;
let teamscaleProject = "";
let settings = null;
let controlService = null;
let notificationService = null;

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.require(["TFS/WorkItemTracking/Services", "VSS/Controls", "VSS/Controls/Notifications"], function (workItemServices, controls, notifications) {
    controlService = controls;
    notificationService = notifications;

    // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService(): IWorkItemFormService {
        return workItemServices.WorkItemFormService.getService();
    }

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
    settings = new Settings(Scope.ProjectCollection, azureProjectName);

    settings.get(Settings.TEAMSCALE_URL).then((url) => {
        if (!url) {
            return Promise.reject({status: -1});
        }
        teamscaleClient = new TeamscaleClient(url);
        return settings.get(Settings.TEAMSCALE_PROJECT)
    }).then(project => {
        if (!project) {
            return Promise.reject({status: -1});
        }
        teamscaleProject = project;
        return getWorkItemFormService();
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
        switch (reason.status) {
            case -1:
                showNotConfiguredMessage();
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

function showNotConfiguredMessage() {
    const notificationContainer = $('body,html');
    const notification = controlService.create(notificationService.MessageAreaControl, notificationContainer, {
        closeable: false,
        showIcon: true,
        type: 1,
        showHeader: true,
        expanded: false,
        hidden: false
    });
    //TODO
    notification.setMessage($(`<div>TGA is not configure for this project, please <a href="TODO">contact the TGA-Team</a></div>`), 1);
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
    notification.setMessage($(`<div>Please log into <a href="${teamscaleClient.url}">TGA</a></div>`), 1);
    resizeHost();
}

function resizeHost() {
    const bodyElement = $('body,html');
    VSS.resize(bodyElement.width(), bodyElement.height());
}
