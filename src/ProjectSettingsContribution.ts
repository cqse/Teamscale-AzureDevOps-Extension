import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    const settings = new Settings(Scope.ProjectCollection, azureProjectName);
    let teamscaleUrlInput = document.getElementById("teamscale-url") as HTMLInputElement;
    let teamscaleProjectInput = document.getElementById("teamscale-project") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let teamscaleProject = teamscaleProjectInput.value;
        let teamscaleUrl = teamscaleUrlInput.value;
        if (teamscaleUrl.endsWith("/")) {
            teamscaleUrl = teamscaleUrl.substring(0, teamscaleUrl.length - 1);
        }
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
