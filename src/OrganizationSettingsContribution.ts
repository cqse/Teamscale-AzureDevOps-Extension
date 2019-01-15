import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.ready(() => {
    const settings = new Settings(Scope.ProjectCollection);
    let mailContactInput = document.getElementById("email-contact") as HTMLInputElement;

    document.getElementById("save-button").onclick = function () {
        let mailContact = mailContactInput.value;

        //TODO UI feedback (e.g. color botton green/red or sth)
        settings.save(Settings.EMAIL_CONTACT, mailContact).then(() => console.log("Saving successful"), error => console.dir(error));
    };

    settings.get(Settings.EMAIL_CONTACT).then((email) => {
        if (email) {
            mailContactInput.value = email
        }
        VSS.notifyLoadSucceeded();
    }, () => {
        VSS.notifyLoadFailed('');
    });
});
