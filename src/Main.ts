import {IWorkItemFormService} from "TFS/WorkItemTracking/Services"
import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";

VSS.init({
    explicitNotifyLoaded: true,
});

VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices) {
    // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService(): IWorkItemFormService {
        return _WorkItemServices.getService();
    }

    VSS.register(VSS.getContribution().id, function () {
        return {
            // Called when the active work item is modified
            onFieldChanged: function (args) {
            },

            // Called when a new work item is being loaded in the UI
            onLoaded: function (args) {
                let issueId: number;
                let azureProjectName = VSS.getWebContext().project.name;

                let settings = new Settings(Scope.ProjectCollection, azureProjectName);

                let key = "teamscale_url";
                settings.get(key).then(value => $('#teamscale_url').val(value));

                $('#save_url').click(function (event) {
                    let teamscaleUrl = $('#teamscale_url').val();
                    console.log(`Teamscale URL is ${teamscaleUrl}`);
                    settings.save(key, teamscaleUrl.toString())
                        .then(() => {
                                console.log("Saved teamscale url successfully");
                                settings.get(key).then(value => console.log(`Got value ${value}`));
                            }
                            , () =>
                                console.log("Error saving teamscale url")
                        );
                });

                console.log(`projectId = ${azureProjectName}`);

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

    VSS.notifyLoadSucceeded();
});
