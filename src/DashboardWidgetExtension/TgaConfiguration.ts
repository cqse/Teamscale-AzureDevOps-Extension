import { ITeamscaleWidgetSettings } from '../Settings/ITeamscaleWidgetSettings';
import { ExtensionSetting } from '../Settings/ExtensionSetting';
import { ProjectSettings } from '../Settings/ProjectSettings';
import TeamscaleClient from '../TeamscaleClient';
import DropdownWithMessageArea from './DropdownWithMessageArea';
import UiUtils = require('../Utils/UiUtils');

import type TomSelectControl from 'tom-select';

declare const TomSelect: typeof TomSelectControl;

/**
 * The Test Gap Analysis part of the widget configuration form: the checkbox that enables the Test Gap badge, the
 * option to use a separate Teamscale server for it and the project dropdown for that server. The corresponding form
 * controls are not grouped in one section of the dialog, but this class owns all of them, including their visibility
 * rules and the loading of the TGA project list.
 */
export default class TgaConfiguration {

    private readonly testGapCheckbox = $('#show-test-gap');
    private readonly separateTgaServerCheckbox = $('#separate-tga-server');
    private readonly tsTgaProjectDropdown: DropdownWithMessageArea;

    private tgaTeamscaleClient: TeamscaleClient = null;

    /** Whether the project settings enable a separate Teamscale server for Test Gap Analysis. */
    private projectUsesSeparateTgaServer: boolean = false;

    /**
     * Whether the TGA project dropdown currently holds a project list that was loaded from the server. Tracked
     * explicitly rather than derived from the number of options, because the dropdown is pre-seeded with the stored
     * value (see {@link applyStoredSettings}) and therefore has options even before anything was loaded.
     */
    private tgaProjectsLoaded: boolean = false;

    constructor(private readonly projectSettings: ProjectSettings, notifyWidgetChange: () => void) {
        this.tsTgaProjectDropdown = new DropdownWithMessageArea(new TomSelect('#teamscale-tga-project-select', {}),
            '#tga-project-message-area');
        this.tsTgaProjectDropdown.onChange(notifyWidgetChange);

        this.testGapCheckbox.on('input', notifyWidgetChange);
        this.testGapCheckbox.on('change', () => this.zipTgaConfiguration());

        this.separateTgaServerCheckbox.on('input', notifyWidgetChange);
        this.separateTgaServerCheckbox.on('change', () => {
            this.zipTgaConfiguration();
            // Lazily load the TGA project list when the user enables the separate server option. The initial load
            // for a widget that was stored with the option enabled happens in loadProjects() instead.
            if (this.usesSeparateTgaServer() && !this.tgaProjectsLoaded) {
                this.fillTgaDropdownWithProjects().catch(() => this.handleTgaDropdownFailure());
            }
        });
    }

    /**
     * Applies the stored configuration to the checkboxes and seeds the dropdown with the stored TGA project, before
     * any list has been loaded from a Teamscale server. This must happen synchronously, because the widget change
     * notification may fire (and thus read the controls) while the lists are still loading.
     */
    public applyStoredSettings(widgetSettings: ITeamscaleWidgetSettings | null) {
        if (widgetSettings) {
            this.testGapCheckbox.prop('checked', widgetSettings.showTestGapBadge);
            this.separateTgaServerCheckbox.prop('checked', widgetSettings.useSeparateTgaServer);
        }
        this.zipTgaConfiguration();
        this.tsTgaProjectDropdown.seedWithStoredValue(widgetSettings ? widgetSettings.tgaTeamscaleProject : null);
    }

    /**
     * Creates the notification handling for the dropdown's message area (see
     * {@link DropdownWithMessageArea#initializeNotifications}).
     */
    public initializeNotifications(controlService, notificationService, emailContact: string) {
        this.tsTgaProjectDropdown.initializeNotifications(controlService, notificationService, emailContact);
    }

    /**
     * Disables the widget-level "use separate Teamscale server" checkbox (with an explanatory tooltip) when the project
     * does not have a separate Teamscale server for Test Gap Analysis configured. This keeps the two settings in sync
     * and prevents the widget from talking to a server the project has disabled (see TS-46229).
     */
    public async applyProjectLevelGating(): Promise<void> {
        this.projectUsesSeparateTgaServer = UiUtils.convertToBoolean(
            await this.projectSettings.get(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER));
        if (this.projectUsesSeparateTgaServer) {
            return;
        }
        const tooltip = 'The project does not have a separate Teamscale server for Test Gap Analysis configured.';
        this.separateTgaServerCheckbox.prop('checked', false);
        this.separateTgaServerCheckbox.prop('disabled', true);
        this.separateTgaServerCheckbox.attr('title', tooltip);
        // Grey out the surrounding label so the disabled option is clearly distinguishable from the enabled ones.
        this.separateTgaServerCheckbox.closest('label').addClass('disabled-option');
        const configContainer = document.getElementById('config-container-separate-tga-server');
        if (configContainer) {
            configContainer.title = tooltip;
        }
        this.zipTgaConfiguration();
    }

    /**
     * Loads the projects of the separate TGA Teamscale server into the dropdown, if the separate server option is
     * enabled. Failures are handled here and never reject the returned promise: they disable only the TGA dropdown
     * and must not fail the widget's load chain (which would hide the entire configuration form). See TS-46229.
     */
    public async loadProjects(): Promise<void> {
        if (!this.usesSeparateTgaServer()) {
            return;
        }
        return this.fillTgaDropdownWithProjects().catch(() => this.handleTgaDropdownFailure());
    }

    /**
     * Returns the TGA related part of the widget settings as currently configured in the form.
     */
    public contributeSettings(): Pick<ITeamscaleWidgetSettings,
        'showTestGapBadge' | 'useSeparateTgaServer' | 'tgaTeamscaleProject'> {
        return {
            showTestGapBadge: this.testGapCheckbox.is(':checked'),
            useSeparateTgaServer: this.separateTgaServerCheckbox.is(':checked'),
            tgaTeamscaleProject: this.tsTgaProjectDropdown.getValue(),
        };
    }

    /**
     * The widget only uses a separate Teamscale server for the Test Gap badge when BOTH the widget-level option and the
     * project-level option are enabled. Returns the effective (AND-combined) value.
     *
     * Deliberately reads the live checkbox state instead of the stored settings: the form persists what it displays,
     * so a checkbox that was force-unchecked (e.g. by the project-level gating) is also saved as disabled. Only the
     * selected TGA project survives for a later re-enable.
     */
    private usesSeparateTgaServer(): boolean {
        return this.separateTgaServerCheckbox.is(':checked') && this.projectUsesSeparateTgaServer;
    }

    /**
     * Shows or hides the TGA related parts of the form to match the checkbox states.
     */
    private zipTgaConfiguration() {
        const separateTgaServerConfigContainer = document.getElementById('config-container-separate-tga-server');
        if (this.testGapCheckbox.is(':checked')) {
            separateTgaServerConfigContainer.style.display = 'block';
        } else {
            this.separateTgaServerCheckbox.prop('checked', false);
            separateTgaServerConfigContainer.style.display = 'none';
        }

        const elementIds: string[] = ['config-container-teamscale-tga-project-select', 'baseline-tga-hint'];

        const displayAttribute = this.separateTgaServerCheckbox.is(':checked') ? 'block' : 'none';
        for (const elementId of elementIds) {
            document.getElementById(elementId).style.display = displayAttribute;
        }
    }

    /**
     * Loads a list of accessible projects from the separate TGA Teamscale server and appends them to the dropdown
     * menu.
     */
    private async fillTgaDropdownWithProjects() {
        const tgaUrl = await this.projectSettings.get(ExtensionSetting.TGA_TEAMSCALE_URL);
        if (UiUtils.isEmptyOrWhitespace(tgaUrl)) {
            return this.handleMissingTgaServerConfig();
        }
        this.tgaTeamscaleClient = new TeamscaleClient(tgaUrl);
        await this.tsTgaProjectDropdown.loadProjects(this.tgaTeamscaleClient,
            'loading the list of Teamscale projects for Test Gap Analysis');
        this.tgaProjectsLoaded = true;
    }

    /**
     * The separate-server option is enabled but no TGA server URL is configured in the project settings. Unlike an
     * unreachable server, this does not produce an error banner on its own, so one is shown in the dropdown's
     * message area here.
     */
    private handleMissingTgaServerConfig() {
        this.tgaProjectsLoaded = false;
        this.tsTgaProjectDropdown.showErrorBannerWithContact('No Teamscale server for Test Gap Analysis is configured '
            + 'for this Azure DevOps project. Please configure one in the project settings or deactivate the separate '
            + 'server option.');
        this.tsTgaProjectDropdown.disable(
            'No Teamscale server for Test Gap Analysis is configured for this Azure DevOps project.');
    }

    /**
     * Populating the TGA project dropdown failed (e.g. the configured separate Teamscale server is unreachable).
     * The corresponding error banner is already shown in the dropdown's message area by
     * {@link DropdownWithMessageArea#loadProjects}.
     */
    private handleTgaDropdownFailure() {
        this.tgaProjectsLoaded = false;
        this.tsTgaProjectDropdown.disable('The projects of the separate Teamscale server for Test Gap Analysis could '
            + 'not be loaded. The configured project is kept.');
    }
}
