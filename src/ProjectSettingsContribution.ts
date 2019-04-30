/**
 * Contribution for the project settings consisting of the Teamscale URL and project
 */
import {ProjectSettings} from "./Settings/ProjectSettings";
import {Scope} from "./Settings/Scope";
import {Settings} from "./Settings/Settings";
import {getCurrentTimestamp} from "./Utils/UiUtils";
import UiUtils = require("./Utils/UiUtils");

let teamscaleUrlInput: HTMLInputElement = null;
let teamscaleProjectInput: HTMLInputElement = null;
let logDiv: HTMLDivElement = null;
let settings: ProjectSettings = null;

VSS.init({
    explicitNotifyLoaded: true,
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    settings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    teamscaleUrlInput = document.getElementById("teamscale-url") as HTMLInputElement;
    teamscaleProjectInput = document.getElementById("teamscale-project") as HTMLInputElement;
    logDiv = document.getElementById("log") as HTMLDivElement;

    assignOnClickSave();

    // Load the current settings
    settings.get(Settings.TEAMSCALE_URL).then((url) => {
        if (url) {
            teamscaleUrlInput.value = url;
        }
        return settings.get(Settings.TEAMSCALE_PROJECT);
    }).then((project) => {
        if (project) {
            teamscaleProjectInput.value = project;
        }
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});

function assignOnClickSave() {
    document.getElementById("save-button").onclick = function () {
        const teamscaleProject = teamscaleProjectInput.value;
        let teamscaleUrl = teamscaleUrlInput.value;
        if (teamscaleUrl.endsWith("/")) {
            teamscaleUrl = teamscaleUrl.substring(0, teamscaleUrl.length - 1);
        }

        // Log success/error events to have some feedback
        logDiv.innerHTML = "";
        const timestamp = getCurrentTimestamp();
        settings.save(Settings.TEAMSCALE_URL, teamscaleUrl).then(
            (url) => UiUtils.logToDiv(logDiv, `${timestamp} Saving Teamscale URL "${url ? url : ""}" successful.`),
            () => UiUtils.logToDiv(logDiv, `${timestamp} Error saving Teamscale URL.`));
        settings.save(Settings.TEAMSCALE_PROJECT, teamscaleProject).then(
            (project) => UiUtils.logToDiv(logDiv, `${timestamp} Saving Teamscale project "${project ? project: ""}" successful.`),
            () => UiUtils.logToDiv(logDiv, `${timestamp} Error saving Teamscale project`));
    };

}
