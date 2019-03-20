import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import UiUtils = require("./UiUtils");
import {padStart} from "./UiUtils";


VSS.init({
    explicitNotifyLoaded: true,
});

VSS.ready(() => {
    const settings = new Settings(Scope.ProjectCollection);
    let mailContactInput = document.getElementById("email-contact") as HTMLInputElement;
    let logDiv = document.getElementById("log") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let mailContact = mailContactInput.value;

        logDiv.innerHTML = "";
        const now = new Date();
        const timestamp = `${padStart(now.getHours().toString(), 2, "0")}` +
            `:${padStart(now.getMinutes().toString(), 2, "0")}` +
            `:${padStart(now.getSeconds().toString(), 2, "0")}`;
        settings.save(Settings.EMAIL_CONTACT, mailContact).then(
            (email) => UiUtils.logToDiv(logDiv, `${timestamp}: Saving Email address "${email}" successful.`),
            () => UiUtils.logToDiv(logDiv, `${timestamp}: Error saving Email address.`));
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
