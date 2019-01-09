import {IWorkItemFormService} from "TFS/WorkItemTracking/Services"
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";

let teamscaleClient = null;
let settings = null;

VSS.init({
    explicitNotifyLoaded: true,
});

VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices) {
    // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService(): IWorkItemFormService {
        return _WorkItemServices.WorkItemFormService.getService();
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

    settings.get(Settings.TEAMSCALE_PROJECT_URL_KEY).then((teamscaleProjectUrl) => {
        teamscaleClient = new TeamscaleClient(teamscaleProjectUrl);
        return getWorkItemFormService();
    }).then((workItemFormService) => {
        return workItemFormService.getId();
    }).then((id) => {
        return teamscaleClient.queryIssueTestGapBadge(id);
    }).then((tgaBadge) => {
        const tgaBadgeElement = $('#tga-badge');
        tgaBadgeElement.html(tgaBadge);
        resizeHost();
        VSS.notifyLoadSucceeded();
    }, (reason) => {
        VSS.notifyLoadFailed('');
    });
});

function resizeHost() {
    const bodyElement = $('body,html');
    VSS.resize(bodyElement.width(), bodyElement.height());
}
