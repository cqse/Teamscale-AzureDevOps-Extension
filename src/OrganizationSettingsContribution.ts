import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import UiUtils = require("./UiUtils");


VSS.init({
    explicitNotifyLoaded: true,
});

VSS.ready(() => {
    const settings = new Settings(Scope.ProjectCollection);
    let mailContactInput = document.getElementById("email-contact") as HTMLInputElement;
    let logDiv = document.getElementById("log") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let mailContact = mailContactInput.value;

        settings.save(Settings.EMAIL_CONTACT, mailContact).then(
            (email) => UiUtils.logToDiv(logDiv, `Saving Email address "${email}" successful.`),
            () => UiUtils.logToDiv(logDiv, "Error saving Email address."));
    };

    settings.get(Settings.EMAIL_CONTACT).then((email) => {
        if (email) {
            mailContactInput.value = email;
        }
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});
