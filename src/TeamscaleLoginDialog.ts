import {ProjectSettings} from "./Settings/ProjectSettings";
import {Scope} from "./Settings/Scope";
import {Settings} from "./Settings/Settings";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true,
    applyTheme: true
});

VSS.ready(() => {
    let azureProjectName = VSS.getWebContext().project.name;
    const projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);

    projectSettings.get(Settings.TEAMSCALE_URL).then(url => {
        const body = $('body,html');
        console.log(`width: ${body.width()}, height: ${body.height()}`);
        body.html(`<iframe id="teamscale-frame" width="520" height="634" src="${url}"></iframe>`);
        document.getElementById('teamscale-frame').onload = teamscaleLoginLoadedCallback;
    });

    VSS.notifyLoadSucceeded();
});

function teamscaleLoginLoadedCallback() {
    document.getElementById('teamscale-frame').onload = teamscaleLoggedInCallback;
}

function teamscaleLoggedInCallback() {
    console.log("Logged in");
}
