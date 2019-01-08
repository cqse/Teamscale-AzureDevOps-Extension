import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: false
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    const settings = new Settings(Scope.ProjectCollection, azureProjectName);
    let teamscaleUrlInput = document.getElementById("teamscale-project-url") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let teamscaleUrl = teamscaleUrlInput.value;
        if (teamscaleUrl.endsWith("/")) {
            teamscaleUrl = teamscaleUrl.substring(0, teamscaleUrl.length - 1);
        }
        settings.save(Settings.TEAMSCALE_PROJECT_URL_KEY, teamscaleUrl);
    };

    settings.get(Settings.TEAMSCALE_PROJECT_URL_KEY).then((value) => {
        if (value) {
            teamscaleUrlInput.value = value;
        }
        VSS.notifyLoadSucceeded();
    });
});
