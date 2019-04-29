import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import UiUtils = require("./Utils/UiUtils");
import {getCurrentTimestamp} from "./Utils/UiUtils";

let settings: Settings = new Settings(Scope.ProjectCollection);
let mailContactInput: HTMLInputElement = null;
let logDiv: HTMLDivElement = null;

VSS.init({
    explicitNotifyLoaded: true,
});

VSS.ready(() => {
    mailContactInput = document.getElementById("email-contact") as HTMLInputElement;
    logDiv = document.getElementById("log") as HTMLInputElement;

    assignOnClickSave();

    // Load current settings
    settings.get(Settings.EMAIL_CONTACT).then((email) => {
        if (email) {
            mailContactInput.value = email;
        }
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});

function assignOnClickSave() {
    document.getElementById("save-button").onclick = function () {
        let mailContact = mailContactInput.value;

        // Log success/error events to have some feedback
        logDiv.innerHTML = "";
        let timestamp = getCurrentTimestamp();
        settings.save(Settings.EMAIL_CONTACT, mailContact).then(
            (email) => UiUtils.logToDiv(logDiv, `${timestamp} Saving Email address "${email ? email : ""}" successful.`),
            () => UiUtils.logToDiv(logDiv, `${timestamp} Error saving Email address.`));
    };

}
