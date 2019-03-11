import {Scope} from "./Settings/Scope";
import {ProjectSettings} from "./Settings/ProjectSettings";
import {Settings} from "./Settings/Settings";
import UiUtils = require("./UiUtils");

VSS.init({
    explicitNotifyLoaded: true,
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    const settings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    let teamscaleUrlInput = document.getElementById("teamscale-url") as HTMLInputElement;
    let teamscaleProjectInput = document.getElementById("teamscale-project") as HTMLInputElement;
    let logDiv = document.getElementById("log") as HTMLDivElement;

    document.getElementById("save-button").onclick = function () {
        // TODO: const?
        let teamscaleProject = teamscaleProjectInput.value;
        let teamscaleUrl = teamscaleUrlInput.value;
        if (teamscaleUrl.endsWith("/")) {
            teamscaleUrl = teamscaleUrl.substring(0, teamscaleUrl.length - 1);
        }

        // TODO: reset log div here? Otherwise if you keep clicking on save it'll just add more and more <p>
        settings.save(Settings.TEAMSCALE_URL, teamscaleUrl).then(
            (url) => UiUtils.logToDiv(logDiv, `Saving Teamscale URL "${url}" successful.`),
            () => UiUtils.logToDiv(logDiv, "Error saving Teamscale URL."));
        settings.save(Settings.TEAMSCALE_PROJECT, teamscaleProject).then(
            (project) => UiUtils.logToDiv(logDiv, `Saving Teamscale project "${project}" successful.`),
            () => UiUtils.logToDiv(logDiv, "Error saving Teamscale project"));
    };

    settings.get(Settings.TEAMSCALE_URL).then((url) => {
        if (url) {
            teamscaleUrlInput.value = url;
        }
        return settings.get(Settings.TEAMSCALE_PROJECT);
    }).then((project) => {
        if (project) {
            teamscaleProjectInput.value = project
        }
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});
