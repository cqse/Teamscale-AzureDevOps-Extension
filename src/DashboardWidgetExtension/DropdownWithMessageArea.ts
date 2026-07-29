import NotificationUtils from '../Utils/NotificationUtils';
import UiUtils = require('../Utils/UiUtils');

import type TomSelectControl from 'tom-select';

/**
 * A TomSelect dropdown of the widget configuration form together with its own message area. Problems with loading the
 * dropdown's content are reported as a banner directly at the affected control and are cleared again once a reload
 * succeeds.
 */
export default class DropdownWithMessageArea {

    /** Notification handling scoped to this dropdown's message area. Created in {@link initializeNotifications}. */
    private notificationUtils: NotificationUtils = null;

    /**
     * @param select The Tom Select control this message area belongs to.
     * @param messageContainer Selector of the container to place this dropdown's banners in.
     */
    constructor(private readonly select: TomSelectControl, private readonly messageContainer: string) {
    }

    /**
     * Attaches a handler to value changes of the dropdown.
     */
    public onChange(handler: () => void) {
        this.select.on('change', handler);
    }

    /**
     * Creates the notification handling for the message area. Separated from the constructor because the email contact
     * is only known once the organization settings have been loaded, while the dropdown itself has to exist as soon as
     * the form is built. Until this is called, the banner methods do nothing.
     */
    public initializeNotifications(controlService, notificationService, emailContact: string) {
        // The configuration dialog does not support the login dialog, hence no callback and no dialog option.
        this.notificationUtils = new NotificationUtils(controlService, notificationService, null, emailContact,
            false, this.messageContainer);
    }

    /**
     * Selects the stored value of the dropdown's setting, before any list has been loaded from a Teamscale server. The
     * value is added as the only option, because TomSelect can only select values it knows as options.
     */
    public seedWithStoredValue(storedValue: string) {
        if (UiUtils.isEmptyOrWhitespace(storedValue)) {
            return;
        }
        this.select.addOption({value: storedValue, text: storedValue});
        this.select.setValue(storedValue, true);
    }

    /**
     * Shows a banner for a failed request to a Teamscale server in this dropdown's message area.
     */
    public handleCommunicationError(reason: any, teamscaleServer: string, teamscaleProject?: string, action?: string) {
        if (this.notificationUtils) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(reason, teamscaleServer, teamscaleProject,
                action);
        }
    }

    /**
     * Shows an error banner in this dropdown's message area, appending the standard contact hint. The message may
     * contain HTML.
     */
    public showErrorBannerWithContact(message: string) {
        if (this.notificationUtils) {
            this.notificationUtils.showErrorBanner(message + ' ' + this.notificationUtils.generateContactText());
        }
    }

    /** Shows an info banner in this dropdown's message area. The message may contain HTML. */
    public showInfoBanner(message: string) {
        if (this.notificationUtils) {
            this.notificationUtils.showInfoBanner(message);
        }
    }

    /**
     * Disables the dropdown and explains why in its tooltip, keeping the value it currently holds (normally the stored
     * configuration selected by {@link seedWithStoredValue}).
     */
    public disable(tooltip: string) {
        this.select.disable();
        // Tom Select hides the original <select> and renders its own markup, so the tooltip has to go on the wrapper.
        this.select.wrapper.title = tooltip;
    }

    /**
     * Replaces all options of the dropdown with the given, freshly loaded list and selects the given value (silently
     * ignored if it is not among the options). Since a replacement means the load succeeded, this also re-enables the
     * dropdown and clears the message area and the tooltip, so that no stale error message survives a successful
     * retry.
     */
    public replaceOptions(options: Array<{ value: string, text: string }>, valueToSelect?: string) {
        this.select.enable();
        this.select.wrapper.removeAttribute('title');
        $(this.messageContainer).empty();

        this.select.clear(true);
        this.select.clearOptions();
        for (const option of options) {
            this.select.addOption(option);
        }
        if (valueToSelect) {
            this.select.setValue(valueToSelect, true);
        }
    }

    /**
     * Returns the value currently selected in the dropdown.
     */
    public getValue(): string {
        // All dropdowns of the configuration form are single-select, so getValue() yields a plain string here. The
        // array half of its return type only applies to multi-select controls.
        return this.select.getValue() as string;
    }
}
