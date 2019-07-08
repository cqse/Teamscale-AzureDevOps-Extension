/**
 * Utils class to handle display of notification or information in the Teamscale ADOS extension.
 */

import UiUtils = require('./UiUtils');

export default class NotificationUtils {

    private readonly emailContact: string;
    private readonly callbackOnLoginClose: any;
    private readonly useDialogInsteadOfNewWindow: boolean;
    private controlService: any;
    private notificationService: any;

    constructor(controlService, notificationService, callbackOnLoginClose, emailContact, useDialog) {
        this.controlService = controlService;
        this.notificationService = notificationService;

        this.emailContact = emailContact;
        this.callbackOnLoginClose = callbackOnLoginClose;
        this.useDialogInsteadOfNewWindow = useDialog;
    }

    /**
     * Opens the Teamscale login dialog. Assigns the predefined callback function to the dialog close event.
     */
    public showLoginDialog(serverUrl: string) {
        return VSS.getService(VSS.ServiceIds.Dialog).then((dialogService: IHostDialogService) => {
            const extensionCtx = VSS.getExtensionContext();
            // Build absolute contribution ID for dialogContent
            const contributionId = extensionCtx.publisherId + '.' + extensionCtx.extensionId + '.teamscale-login-dialog';

            // Show dialog
            const dialogOptions = {
                title: 'Teamscale Login',
                width: 600,
                height: 720,
                buttons: null,
                close: this.callbackOnLoginClose,
                urlReplacementObject: { server: encodeURIComponent(serverUrl)}
            };

            dialogService.openDialog(contributionId, dialogOptions);
        });
    }

    /**
     * If receiving the badges from the Teamscale server failed, available information is displayed as info or error banner.
     */
    public handleErrorInTeamscaleCommunication(reason: any, teamscaleServer: string, teamscaleProject?: string,
                                               action?: string) {
        let projectInfo: string = '';
        if (teamscaleProject) {
            projectInfo = `Configured Teamscale project is: <i>${teamscaleProject}</i> `;
        }

        switch (reason.status) {
            case 401:
            case 403:
                this.showNotLoggedInMessage(teamscaleServer);
                VSS.notifyLoadSucceeded();
                break;
            case 404:
                this.showInfoBanner(`Server <a href="${teamscaleServer}" target="_top">${teamscaleServer}</a> which is `
                    + 'configured as Teamscale server, returned a <i>Not found</i> (404) error. ' +
                    + projectInfo + this.generateContactText());

                VSS.notifyLoadSucceeded();
                break;
            default:
                let message = `Failed ${action ? action + ' ' : ''}with error code ${reason.status}`;
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
        let contact = 'your administrator';
        if (this.emailContact) {
            contact = `<a href="mailto:${this.emailContact}">the Teamscale-Team</a>`;
        }
        return `Please contact ${contact}.`;
    }

    /**
     * Shows an info message with a link to open the login dialog for Teamscale
     */
    public showNotLoggedInMessage(serverUrl: string) {
        if (this.useDialogInsteadOfNewWindow) {
            this.showInfoBanner(`Please log into <a id="login-link">Teamscale</a>`);
            $('#login-link').click(() => this.showLoginDialog(serverUrl));
        } else {
            this.showInfoBanner(`Please log into <a href="${serverUrl}" target="_blank">Teamscale</a> and repeat.`);
        }
    }

    /**
     * Shows an info banner (vss notification).
     * @param message The message to display. It may contain HTML.
     */
    public showInfoBanner(message: string) {
        this.showBanner(message, this.notificationService.MessageAreaType.Info);
    }

    /**
     * Shows an error banner (vss notification).
     * @param message The message to display. It may contain HTML.
     */
    public showErrorBanner(message: string) {
        this.showBanner(message, this.notificationService.MessageAreaType.Error);
    }

    private showBanner(message: string, bannerType: any) {
        const notificationContainer = $('#message-div');
        if (notificationContainer.html().includes(message)) {
            // do not display the same message more than once
            return;
        }

        const notification = this.generateNotification();
        notification.setMessage($(`<div>${message}</div>`), bannerType);
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
