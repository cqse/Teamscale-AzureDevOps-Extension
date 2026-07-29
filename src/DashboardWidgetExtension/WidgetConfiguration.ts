/**
 * Logic for the configuration of the Teamscale dashboard widget.
 * Configurable are
 *  - TS project to use
 *  - number of days to respect in the badges
 */
import { ITeamscaleBaseline } from '../ITeamscaleBaseline';
import { ITeamscaleWidgetSettings } from '../Settings/ITeamscaleWidgetSettings';
import { ProjectSettings } from '../Settings/ProjectSettings';
import { Scope } from '../Settings/Scope';
import { Settings } from '../Settings/Settings';
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from '../Utils/NotificationUtils';
import DropdownWithMessageArea from './DropdownWithMessageArea';
import {ExtensionSetting} from "../Settings/ExtensionSetting";
import {removeLegacyPlaceholders} from '../Settings/WidgetSettingsCleaner';
import UiUtils = require('../Utils/UiUtils');

import type TomSelectControl from 'tom-select';

declare const TomSelect: typeof TomSelectControl;

export class Configuration {
    private projectSettings: ProjectSettings = null;
    private organizationSettings: Settings = null;

    private widgetSettings: ITeamscaleWidgetSettings = null;

    private teamscaleClient: TeamscaleClient = null;
    private tgaTeamscaleClient: TeamscaleClient = null;

    /** Whether the project settings enable a separate Teamscale server for Test Gap Analysis. */
    private projectUsesSeparateTgaServer: boolean = false;

    /**
     * Whether the TGA project dropdown currently holds a project list that was loaded from the server. Tracked
     * explicitly rather than derived from the number of options, because the dropdown is pre-seeded with the stored
     * value (see {@link seedDropdownWithStoredValue}) and therefore has options even before anything was loaded.
     */
    private tgaProjectsLoaded: boolean = false;

    private notificationUtils: NotificationUtils = null;
    private emailContact: string = '';

    private baselineDaysInput = document.getElementById('baseline-days-input') as HTMLInputElement;
    private datepicker = $('#datepicker');
    private testGapCheckbox = $('#show-test-gap');
    private separateTgaServerCheckbox = $('#separate-tga-server');

    private tsProjectDropdown: DropdownWithMessageArea;
    private tsTgaProjectDropdown: DropdownWithMessageArea;
    private tsBaselineDropdown: DropdownWithMessageArea;

    private widgetHelpers: any;
    private readonly notificationService: any;
    private readonly controlService: any;

    constructor(widgetHelpers, controlService, notificationService) {
        this.widgetHelpers = widgetHelpers;
        this.notificationService = notificationService;
        this.controlService = controlService;
    }

    /**
     * Prepares the configuration dialog; called by ADOS.
     */
    public load(widgetSettings, widgetConfigurationContext) {
        this.widgetSettings = removeLegacyPlaceholders(
            JSON.parse(widgetSettings.customSettings.data) as ITeamscaleWidgetSettings);
        const notifyWidgetChange = () =>
            widgetConfigurationContext.notify(this.widgetHelpers.WidgetEvent.ConfigurationChange,
                this.widgetHelpers.WidgetEvent.Args(this.getWrappedCustomSettings()));

        this.initializeOnchangeListeners(notifyWidgetChange);
        this.datepicker.datepicker({onSelect: notifyWidgetChange});

        if (this.widgetSettings) {
            this.baselineDaysInput.value = String(this.widgetSettings.baselineDays);
            this.datepicker.datepicker('setDate', new Date(this.widgetSettings.startFixedDate));
            this.testGapCheckbox.prop('checked', this.widgetSettings.showTestGapBadge);
            this.separateTgaServerCheckbox.prop('checked', this.widgetSettings.useSeparateTgaServer);
        }
        this.zipTgaConfiguration();

        // Each dropdown owns a message area, so problems with loading its content are shown right at the affected
        // control and can be cleared again once a retry succeeds. Errors of the main project dropdown go to the page
        // level message area instead, since they make the whole form unusable.
        this.tsProjectDropdown = new DropdownWithMessageArea(new TomSelect('#teamscale-project-select', {}),
            NotificationUtils.DEFAULT_MESSAGE_CONTAINER);
        this.tsProjectDropdown.onChange(() => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange));

        this.tsTgaProjectDropdown = new DropdownWithMessageArea(new TomSelect('#teamscale-tga-project-select', {}),
            '#tga-project-message-area');
        this.tsTgaProjectDropdown.onChange(notifyWidgetChange);

        this.tsBaselineDropdown = new DropdownWithMessageArea(new TomSelect('#ts-baseline-select', {}),
            '#baseline-message-area');
        this.tsBaselineDropdown.onChange(notifyWidgetChange);

        // Seed the dropdowns with the stored configuration before the first request is sent. This must happen
        // synchronously, because notifyWidgetChange may fire (and thus read the dropdowns) while the lists are still
        // loading.
        this.seedDropdownWithStoredValue(this.tsProjectDropdown, 'teamscaleProject');
        this.seedDropdownWithStoredValue(this.tsTgaProjectDropdown, 'tgaTeamscaleProject');
        this.seedDropdownWithStoredValue(this.tsBaselineDropdown, 'tsBaseline');

        this.initializeFrameResizing();

        this.loadAndCheckConfiguration().then(() => this.applyProjectLevelTgaGating())
            .then(() => this.fillDropdownsWithProjects())
            .then(() => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange))
            .catch(reason => this.handleFatalLoadFailure(reason));

        return this.widgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Handles a failure that makes the whole configuration form unusable (e.g. no Teamscale server configured or the
     * main server unreachable): hides the form and makes sure the reason is discoverable. Most rejections have already
     * shown a specific banner; unexpected ones (i.e. programming errors) would otherwise be swallowed silently, leaving
     * a blank dialog with no trace of what went wrong.
     */
    private handleFatalLoadFailure(reason: any) {
        console.error('Loading the Teamscale widget configuration failed.', reason);
        $('.teamscale-config-group').hide();
        if (!this.notificationUtils) {
            // The failure happened before the notification handling could be set up; a plain text message is all
            // that is left to show.
            $(NotificationUtils.DEFAULT_MESSAGE_CONTAINER).text('Could not load the Teamscale widget configuration.');
            return;
        }
        if (!this.notificationUtils.hasDisplayedMessage()) {
            this.notificationUtils.showErrorBanner('Could not load the Teamscale widget configuration. '
                + this.notificationUtils.generateContactText());
        }
    }

    /**
     * Requests a fitting iframe height from the host whenever the form content changes size (async loads, error
     * banners, tab switches, toggling optional rows). The host does not reliably honor resize requests, especially
     * for content that only grows after the initial load; .container therefore scrolls internally as a fallback so
     * no option ever becomes unreachable (see settings.css).
     */
    private initializeFrameResizing() {
        const observer = new ResizeObserver(() => this.resize());
        // Observe the content blocks rather than .container itself, which is fixed at 100% of the iframe height.
        observer.observe(document.getElementById('message-div'));
        observer.observe(document.querySelector('.teamscale-config-group'));
    }

    /**
     * Resizes the host iframe to match the current content height.
     */
    private resize() {
        const container = document.querySelector('.container');
        // scrollHeight is the full content height, even while the container is clipped and scrolling internally.
        VSS.resize(document.body.scrollWidth, container.scrollHeight);
    }

    /**
     * On save action called by ADOS.
     */
    public onSave() {
        return this.widgetHelpers.WidgetConfigurationSave.Valid(this.getWrappedCustomSettings());
    }

    /**
     * Propagates configuration changes to the widget. Enables live preview/feedback on configuring the widget settings.
     */
    private initializeOnchangeListeners(notifyWidgetChange) {
        const inputIds: string[] = ['baseline-days-input', 'show-test-gap', 'separate-tga-server'];
        for (const inputId of inputIds) {
            document.getElementById(inputId).addEventListener('input', notifyWidgetChange);
        }
        let activeTabIndex: number = 0;
        if (this.widgetSettings) {
            activeTabIndex = $('#tabs a[href="#' + this.widgetSettings.activeTimeChooser + '"]').parent().index();
        }
        $('#tabs').tabs({
            activate: notifyWidgetChange,
            active: activeTabIndex,
        });
        document.getElementById('show-test-gap').addEventListener('change', () => this.zipTgaConfiguration());
        document.getElementById('separate-tga-server').addEventListener('change', () => {
            this.zipTgaConfiguration();
            // Lazily load the TGA project list when the user enables the separate server option. The initial load
            // for a widget that was stored with the option enabled happens in fillDropdownsWithProjects() instead.
            if (this.separateTgaServerCheckbox.is(':checked') && !this.tgaProjectsLoaded) {
                this.fillTgaDropdownWithProjects().catch(() => this.handleTgaDropdownFailure());
            }
        });
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
     * Selects the stored value of the given setting in the dropdown, before any list has been loaded from a Teamscale
     * server (see {@link DropdownWithMessageArea#seedWithStoredValue}).
     */
    private seedDropdownWithStoredValue(dropdown: DropdownWithMessageArea, settingsKey: string) {
        dropdown.seedWithStoredValue(this.widgetSettings ? this.widgetSettings[settingsKey] : null);
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
     * {@link fillDropdownWithProjects}.
     */
    private handleTgaDropdownFailure() {
        this.tgaProjectsLoaded = false;
        this.tsTgaProjectDropdown.disable('The projects of the separate Teamscale server for Test Gap Analysis could '
            + 'not be loaded. The configured project is kept.');
    }

    /**
     * The widget only uses a separate Teamscale server for the Test Gap badge when BOTH the widget-level option and the
     * project-level option are enabled. Returns the effective (AND-combined) value.
     */
    private usesSeparateTgaServer(): boolean {
        return this.separateTgaServerCheckbox.is(':checked') && this.projectUsesSeparateTgaServer;
    }

    /**
     * Disables the widget-level "use separate Teamscale server" checkbox (with an explanatory tooltip) when the project
     * does not have a separate Teamscale server for Test Gap Analysis configured. This keeps the two settings in sync
     * and prevents the widget from talking to a server the project has disabled (see TS-46229).
     */
    private applyProjectLevelTgaGating() {
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

    private async fillDropdownsWithProjects() {
        const fills: Array<PromiseLike<any>> = [this.fillTqeDropdownWithProjects()];
        if (this.usesSeparateTgaServer()) {
            // Isolate the TGA fetch: a failure here disables only the TGA dropdown and must not reject the whole chain
            // (which would hide the entire configuration form). See TS-46229.
            fills.push(this.fillTgaDropdownWithProjects().catch(() => this.handleTgaDropdownFailure()));
        }
        return Promise.all(fills);
    }

    /**
     * Loads a list of accessible projects from the Teamscale server and appends them to the TQE dropdown menu.
     */
    private async fillTqeDropdownWithProjects() {
        return this.fillDropdownWithProjects(this.teamscaleClient, this.tsProjectDropdown, 'teamscaleProject',
            'loading the list of Teamscale projects');
    }

    /**
     * Loads a list of accessible projects from the Teamscale server and appends them to the TGA dropdown menu.
     */
    private async fillTgaDropdownWithProjects() {
        let tgaUrl: string;
        if (this.projectSettings) {
            tgaUrl = await this.projectSettings.get(ExtensionSetting.TGA_TEAMSCALE_URL);
            if (UiUtils.isEmptyOrWhitespace(tgaUrl)){
                return this.handleMissingTgaServerConfig();
            }
            this.tgaTeamscaleClient = new TeamscaleClient(tgaUrl);
        }
        await this.fillDropdownWithProjects(this.tgaTeamscaleClient, this.tsTgaProjectDropdown, 'tgaTeamscaleProject',
            'loading the list of Teamscale projects for Test Gap Analysis');
        this.tgaProjectsLoaded = true;
    }

    /**
     * Loads a list of accessible projects from the Teamscale server and appends them to the dropdown menu. On failure,
     * an error banner is shown in the dropdown's message area.
     */
    private async fillDropdownWithProjects(teamscaleClient: TeamscaleClient, dropdown: DropdownWithMessageArea,
                                           settingsKey: string, action: string) {
        let projects: string[];
        try {
            projects = await teamscaleClient.retrieveTeamscaleProjects();
        } catch (error) {
            dropdown.handleCommunicationError(error, teamscaleClient.url, null, action);
            return Promise.reject(error);
        }

        const savedValue = this.widgetSettings && this.widgetSettings[settingsKey];
        const valueToSelect = savedValue && projects.indexOf(savedValue) !== -1 ? savedValue : projects[0];
        dropdown.replaceOptions(projects.map(project => ({value: project, text: project})), valueToSelect);
    }

    /**
     * Loads the list configured baselines for a project from the Teamscale server and appends them to the dropdown menu.
     */
    private async fillDropdownWithTeamscaleBaselines(notifyWidgetChange) {
        // use input value and not widgetSetting Object which might hold an outdated project name
        // since the change event of the project selector is fired before the settings object update
        const teamscaleProject: string = this.getDropdownValue(this.tsProjectDropdown);
        if (!teamscaleProject) {
            return;
        }

        let baselines: ITeamscaleBaseline[];
        try {
            baselines = await this.teamscaleClient.retrieveBaselinesForProject(teamscaleProject);
        } catch (error) {
            // Isolate the failure: a baseline load error disables only the baseline dropdown and must not reject the
            // load chain (which would hide the entire configuration form). The main Teamscale server is still usable
            // for the rest of the form. The configured baseline is kept, since it may well still exist. See TS-46229.
            this.tsBaselineDropdown.handleCommunicationError(error, this.teamscaleClient.url, teamscaleProject,
                'loading the baselines');
            this.tsBaselineDropdown.disable(
                'The baselines could not be loaded from the Teamscale server. The configured baseline is kept.');
            return;
        }

        const baselineOptions = baselines.map(baseline => ({
            value: baseline.name,
            text: baseline.name + ' (' + new Date(baseline.timestamp).toLocaleDateString() + ')',
        }));
        this.tsBaselineDropdown.replaceOptions(baselineOptions,
            this.widgetSettings ? this.widgetSettings.tsBaseline : null);

        if (baselines.length === 0) {
            // Unlike a failed load this is not an error, and the configured baseline is deliberately not kept: it
            // belongs to a project that is no longer selected.
            // Banners are rendered as HTML, so the project name has to be escaped.
            this.tsBaselineDropdown.showInfoBanner('No baseline is configured for project <i>'
                + $('<div/>').text(teamscaleProject).html()
                + '</i> on the Teamscale server. Please choose a different starting point for this widget.');
            this.tsBaselineDropdown.disable(
                'No baseline is configured for project »' + teamscaleProject + '« on the Teamscale server.');
        }

        // update widget settings to get rid of a baseline which belongs to the formerly chosen project
        this.getAndUpdateCustomSettings();
        notifyWidgetChange();
    }

    /**
     * Loads the Teamscale email contact from the organization settings and assures that a Teamscale server url and project
     * name is set in the Azure DevOps project settings.
     */
    private async loadAndCheckConfiguration() {
        const azureProjectName = VSS.getWebContext().project.name;
        this.projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
        this.organizationSettings = new Settings(Scope.ProjectCollection);

        this.emailContact = await this.organizationSettings.get(ExtensionSetting.EMAIL_CONTACT);
        await this.initializeNotificationUtils();
        return Promise.all([this.initializeTeamscaleClient()]);
    }

    /**
     * Initializes the Teamscale Client with the url configured in the project settings.
     */
    private async initializeTeamscaleClient() {
        const url = await this.projectSettings.get(ExtensionSetting.TEAMSCALE_URL);

        if (UiUtils.isEmptyOrWhitespace(url)) {
            this.notificationUtils.showErrorBanner(`Teamscale is not configured for this Azure Dev Ops project.`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
        this.tgaTeamscaleClient = this.teamscaleClient;

        this.projectUsesSeparateTgaServer = UiUtils.convertToBoolean(
            await this.projectSettings.get(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER));

        if (!this.usesSeparateTgaServer()) {
            return Promise.resolve();
        }

        const tgaUrl = await this.projectSettings.get(ExtensionSetting.TGA_TEAMSCALE_URL);
        if (!UiUtils.isEmptyOrWhitespace(tgaUrl)) {
            this.tgaTeamscaleClient = new TeamscaleClient(tgaUrl);
        }
    }

    /**
     * Initializes the notification and login management handling errors in Teamscale communication, both for the page
     * level message area and for the per-dropdown message areas.
     */
    private async initializeNotificationUtils() {
        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService,
            null, this.emailContact, false);
        for (const dropdown of [this.tsProjectDropdown, this.tsTgaProjectDropdown, this.tsBaselineDropdown]) {
            dropdown.initializeNotifications(this.controlService, this.notificationService, this.emailContact);
        }
    }

    /**
     * Returns the widget settings as they get stored in ADOS.
     */
    private getWrappedCustomSettings(): { data: string } {
        const customSettings: ITeamscaleWidgetSettings = this.getAndUpdateCustomSettings();
        return {data: JSON.stringify(customSettings)};
    }

    /**
     * Returns the value currently selected in the given dropdown, or an empty string if it has not been created yet
     * (an input event may fire before {@link load} finished building the dropdowns).
     */
    private getDropdownValue(dropdown: DropdownWithMessageArea): string {
        if (!dropdown) {
            return '';
        }
        return dropdown.getValue();
    }

    /**
     * Read the current configuration as specified in the configuration form. Stores it as class member and returns it.
     */
    private getAndUpdateCustomSettings(): ITeamscaleWidgetSettings {
        const teamscaleProject: string = this.getDropdownValue(this.tsProjectDropdown);
        const tgaTeamscaleProject: string = this.getDropdownValue(this.tsTgaProjectDropdown);
        const baselineDays: number = Number(this.baselineDaysInput.value);
        let startFixedDate: number;
        if (this.datepicker.datepicker('getDate')) {
            startFixedDate = this.datepicker.datepicker('getDate').getTime();
        }
        const tsBaseline: string = this.getDropdownValue(this.tsBaselineDropdown);
        const showTestGapBadge: boolean = document.getElementById('show-test-gap').checked;
        const useSeparateTgaServer: boolean = document.getElementById('separate-tga-server').checked;

        const activeTimeChooser: string = $('.ui-tabs-active').attr('aria-controls');

        this.widgetSettings = {
            teamscaleProject,
            tgaTeamscaleProject,
            useSeparateTgaServer,
            activeTimeChooser,
            startFixedDate,
            baselineDays,
            tsBaseline,
            showTestGapBadge
        } as ITeamscaleWidgetSettings;
        return this.widgetSettings;
    }
}

VSS.require(['TFS/Dashboards/WidgetHelpers', 'VSS/Controls', 'VSS/Controls/Notifications'],
    (widgetHelpers, controlService, notificationService) => {
        VSS.register('Teamscale-Configuration', () => {
            return new Configuration(widgetHelpers, controlService, notificationService);
        });

        VSS.notifyLoadSucceeded();
    });
