/**
 * VSS extension that represents the login dialog which is shown if the user click "login to Teamscale" in the work item contribution UI.
 */
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
        const body = $('#teamscale-login-container');
        body.html(`<iframe id="teamscale-frame" width="520" height="634" src="${url}"></iframe>`);
    });

    VSS.notifyLoadSucceeded();
});

