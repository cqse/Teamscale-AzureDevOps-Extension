import { Scope } from './Settings/Scope';
import { Settings } from './Settings/Settings';
import UiUtils = require('./Utils/UiUtils');
import {convertToBoolean, getCurrentTimestamp} from './Utils/UiUtils';
import {ExtensionSetting} from "./Settings/ExtensionSetting";

const settings: Settings = new Settings(Scope.ProjectCollection);
let mailContactInput: HTMLInputElement = null;
let minimizeWarningsInput: HTMLInputElement = null;
let logDiv: HTMLDivElement = null;

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
});

VSS.ready(() => {
    mailContactInput = document.getElementById('email-contact') as HTMLInputElement;
    minimizeWarningsInput = document.getElementById('minimize-warnings') as HTMLInputElement;

    logDiv = document.getElementById('log') as HTMLInputElement;

    assignOnClickSave();

    // Load current settings
    settings.get(ExtensionSetting.EMAIL_CONTACT).then(email => {
        if (email) {
            mailContactInput.value = email;
        }
    });
    settings.get(ExtensionSetting.MINIMIZE_WARNINGS).then(minimize => {
        minimizeWarningsInput.checked = convertToBoolean(minimize);
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});

/**
 * Saves the entered mail address in the Organization settings.
 * There is no validation check performed.
 */
function assignOnClickSave() {
    document.getElementById('save-button').onclick = () => {
        const mailContact = mailContactInput.value;
        const minimizeWarnings = minimizeWarningsInput.checked;
        // Log success/error events to have some feedback
        logDiv.innerHTML = '';
        const timestamp = getCurrentTimestamp();
        settings
            .save(ExtensionSetting.EMAIL_CONTACT.key, mailContact)
            .then(email => UiUtils.logToDiv(logDiv, `${timestamp} Saving Email address "${email ? email : ''}" successful.`),
                () => UiUtils.logToDiv(logDiv, `${timestamp} Error saving Email address.`));
        settings
            .save(ExtensionSetting.MINIMIZE_WARNINGS.key, String(minimizeWarnings))
            .then(() => UiUtils.logToDiv(logDiv, `${timestamp} Saving minimize warnings preference successful.`),
                () => UiUtils.logToDiv(logDiv, `${timestamp} Error saving minimize preferences.`));
    };
}
