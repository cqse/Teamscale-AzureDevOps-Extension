import UiUtils = require("./UiUtils");

export default class NotificationUtils {

    private displayedErrorMessage: boolean = false;
    private teamscaleProject: string;
    private teamscaleUrl: string;
    private emailContact: string;
    private callbackOnLoginClose: any;
    private controlService: any;
    private notificationService: any;
    private useDialogInsteadOfNewWindow: boolean;

    constructor(controlService, notificationService, callbackOnLoginClose, teamscaleProject, teamscaleUrl, emailContact, useDialog) {
        this.controlService = controlService;
        this.notificationService = notificationService;

        this.teamscaleProject = teamscaleProject;
        this.teamscaleUrl = teamscaleUrl;
        this.emailContact = emailContact;
        this.callbackOnLoginClose = callbackOnLoginClose;
        this.useDialogInsteadOfNewWindow = useDialog;
    }

    public showLoginDialog() {
        return VSS.getService(VSS.ServiceIds.Dialog).then((dialogService: IHostDialogService) => {
            const extensionCtx = VSS.getExtensionContext();
            // Build absolute contribution ID for dialogContent
            const contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".teamscale-login-dialog";

            // Show dialog
            const dialogOptions = {
                title: "Teamscale Login",
                width: 600,
                height: 720,
                buttons: null,
                close: this.callbackOnLoginClose
            };

            dialogService.openDialog(contributionId, dialogOptions);
        });
    }

    /**
     * If receiving the badges from the Teamscale server failed, available information is displayed as info or error banner.
     */
    public handleErrorsInRetrievingBadges(reason: any) {
        if (this.displayedErrorMessage) {
            return;
        }

        this.displayedErrorMessage = true;
        switch (reason.status) {
            case 403:
                this.showNotLoggedInMessage();
                VSS.notifyLoadSucceeded();
                break;
            case 404:
                if (this.teamscaleProject.length > 0) {
                    this.showInfoBanner(`Could not find project "${this.teamscaleProject}" ` +
                        `on the Teamscale server <a href="${this.teamscaleUrl}" target="_top">${this.teamscaleUrl}</a>. ` +
                        `${this.generateContactText()}`);
                } else {
                    this.showInfoBanner(`Could not find <a href="${this.teamscaleUrl}" target="_top">${this.teamscaleUrl}</a> ` +
                        `which is configured as Teamscale server.` +
                        `${this.generateContactText()}`);
                }

                VSS.notifyLoadSucceeded();
                break;
            default:
                let message = `Failed with error code ${reason.status}`;
                if (reason.statusText) {
                    message += `: ${reason.statusText}`;
                }
                message += `. ${this.generateContactText()}`;
                this.showErrorBanner(message);
                VSS.notifyLoadSucceeded();
        }
    }

    /**
     * Generates a text that can be appended to info/error messages. If the email is set, a mailto link to the Teamscale team
     * is generated, otherwise a note to contact the administrator
     */
    public generateContactText() {
        let contact = "your administrator";
        if (this.emailContact) {
            contact = `<a href="mailto:${this.emailContact}">the Teamscale-Team</a>`;
        }
        return `Please contact ${contact}.`;
    }

    /**
     * Shows an info message with a link to open the login dialog for Teamscale
     */
    public showNotLoggedInMessage() {
        if (this.useDialogInsteadOfNewWindow) {
           this.showInfoBanner(`Please log into <a id="login-link">Teamscale</a>`);
            $("#login-link").click(() => this.showLoginDialog());
        } else {
            this.showInfoBanner(`Please log into <a href="${this.teamscaleUrl}" target="_blank">Teamscale</a> and repeat.`);
        }
    }

    /**
     * Shows an info banner (vss notification).
     * @param message The message to display. It may contain HTML.
     */
    public showInfoBanner(message: String) {
        const notification = this.generateNotification();
        notification.setMessage($(`<div>${message}</div>`), this.notificationService.MessageAreaType.Info);
        UiUtils.resizeHost();
    }

    /**
     * Shows an error banner (vss notification).
     * @param message The message to display. It may contain HTML.
     */
    public showErrorBanner(message: String) {
        const notification = this.generateNotification();
        notification.setMessage($(`<div>${message}</div>`), this.notificationService.MessageAreaType.Error);
        UiUtils.resizeHost();
    }

    /**
     * Generates a notification control (banner) with an icon and which is not closeable
     */
    public generateNotification() {
        const notificationContainer = $('#message-div');
        return this.controlService.create(this.notificationService.MessageAreaControl, notificationContainer, {
            closeable: false,
            showIcon: true,
        });
    }

}