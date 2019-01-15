import {Scope} from "./Settings/Scope";
import {ProjectSettings} from "./Settings/ProjectSettings";
import {Settings} from "./Settings/Settings";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    const settings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    let teamscaleUrlInput = document.getElementById("teamscale-url") as HTMLInputElement;
    let teamscaleProjectInput = document.getElementById("teamscale-project") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let teamscaleProject = teamscaleProjectInput.value;
        let teamscaleUrl = teamscaleUrlInput.value;
        if (teamscaleUrl.endsWith("/")) {
            teamscaleUrl = teamscaleUrl.substring(0, teamscaleUrl.length - 1);
        }

        //TODO UI feedback (e.g. color botton green/red or sth)
        settings.save(Settings.TEAMSCALE_URL, teamscaleUrl).then(() => console.log("Saving successful"), error => console.dir(error));
        settings.save(Settings.TEAMSCALE_PROJECT, teamscaleProject).then(() => console.log("Saving successful"), error => console.dir(error));
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
