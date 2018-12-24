import {IWorkItemFormService} from "TFS/WorkItemTracking/Services"
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";

const TEAMSCALE_URL_KEY = "teamscale_url";
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

    assignOnClickSaveUrl();

    settings.get(TEAMSCALE_URL_KEY).then((teamscaleUrl) => {
        $('#teamscale_url').val(teamscaleUrl);
        teamscaleClient = new TeamscaleClient(teamscaleUrl);
        return getWorkItemFormService();
    }).then((workItemFormService) => {
        return workItemFormService.getId();
    }).then((id) => {
        return teamscaleClient.queryIssueTestGap(id, 'azure-devops-plugin-test');
    }).then((issueTestGap) => {
        let tgaRatio = JSON.parse(issueTestGap).summary.testGapRatio;
        $('#tga-badge').text(`${ratioToPercent(tgaRatio)}%`);
        VSS.notifyLoadSucceeded();
    }, (reason) => {
        VSS.notifyLoadFailed(reason);
    });

});

function assignOnClickSaveUrl() {
    $('#save_url').click(function (event) {
        let teamscaleUrl = $('#teamscale_url').val();
        settings.save(TEAMSCALE_URL_KEY, teamscaleUrl.toString()); //TODO handle errors
    });
}

function ratioToPercent(ratio: number) {
    return (ratio * 100).toFixed(0);
}
