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
import {ExtensionSetting} from "../Settings/ExtensionSetting";
import UiUtils = require('../Utils/UiUtils');

declare const TomSelect: any;

export class Configuration {
    private projectSettings: ProjectSettings = null;
    private organizationSettings: Settings = null;

    private widgetSettings: ITeamscaleWidgetSettings = null;

    private teamscaleClient: TeamscaleClient = null;
    private tgaTeamscaleClient: TeamscaleClient = null;

    /** Whether the project settings enable a separate Teamscale server for Test Gap Analysis. */
    private projectUsesSeparateTgaServer: boolean = false;

    private notificationUtils: NotificationUtils = null;
    private emailContact: string = '';

    private baselineDaysInput = document.getElementById('baseline-days-input') as HTMLInputElement;
    private datepicker = $('#datepicker');
    private testGapCheckbox = $('#show-test-gap');
    private separateTgaServerCheckbox = $('#separate-tga-server');

    private tsProjectSelect: any;
    private tsTgaProjectSelect: any;
    private tsBaselineSelect: any;

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
        this.widgetSettings = JSON.parse(widgetSettings.customSettings.data) as ITeamscaleWidgetSettings;
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

        this.tsProjectSelect = new TomSelect('#teamscale-project-select', {});
        this.tsProjectSelect.on('change', () => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange));

        this.tsTgaProjectSelect = new TomSelect('#teamscale-tga-project-select', {});
        this.tsTgaProjectSelect.on('change', notifyWidgetChange);

        this.tsBaselineSelect = new TomSelect('#ts-baseline-select', {});
        this.tsBaselineSelect.on('change', notifyWidgetChange);

        this.loadAndCheckConfiguration().then(() => this.applyProjectLevelTgaGating())
            .then(() => this.fillDropdownsWithProjects())
            .then(() => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange))
            .catch(() => $('.teamscale-config-group').hide());

        VSS.resize();
        return this.widgetHelpers.WidgetStatusHelper.Success();
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
        document.getElementById('separate-tga-server').addEventListener('change', () => this.zipTgaConfiguration());
    }

    private async zipTgaConfiguration() {
        const separateTgaServerConfigContainer = document.getElementById('config-container-separate-tga-server');
        if (this.testGapCheckbox.is(':checked')) {
            separateTgaServerConfigContainer.style.display = 'block';
        } else {
            this.separateTgaServerCheckbox.prop('checked', false);
            separateTgaServerConfigContainer.style.display = 'none';
        }

        const elementIds: string[] = ['config-container-teamscale-tga-project-select', 'baseline-tga-hint'];

        let displayAttribute = 'none';
        if (this.separateTgaServerCheckbox.is(':checked')) {
            displayAttribute = 'block';

            if (Object.keys(this.tsTgaProjectSelect.options).length === 0) {
                this.fillTgaDropdownWithProjects().catch(() => this.handleTgaDropdownFailure());
            }
        }

        for (const elementId of elementIds) {
            document.getElementById(elementId).style.display = displayAttribute;
        }
    }

    /**
     * Puts the given Tom Select dropdown into a disabled state showing the given placeholder message. This signals a
     * problem with a single dropdown while keeping the rest of the configuration form interactive (see TS-46229).
     */
    private disableDropdown(select: any, message: string) {
        select.clear(true);
        select.clearOptions();
        select.addOption({value: message, text: message});
        select.setValue(message, true);
        select.disable();
        return Promise.resolve();
    }

    /**
     * Puts the TGA project dropdown into a disabled state showing the given placeholder message.
     */
    private disableTgaDropdown(message: string) {
        return this.disableDropdown(this.tsTgaProjectSelect, message);
    }

    /**
     * The separate-server option is enabled but no TGA server URL is configured in the project settings.
     */
    private handleMissingTgaServerConfig() {
        return this.disableTgaDropdown('Error: No TGA server configured. Deactivate separate Server option or configure TGA Server.');
    }

    /**
     * Populating the TGA project dropdown failed (e.g. the configured separate Teamscale server is unreachable).
     * The corresponding error banner is already shown by {@link fillDropdownWithProjects}.
     */
    private handleTgaDropdownFailure() {
        return this.disableTgaDropdown('Error: Could not load projects from the separate Test Gap server.');
    }

    /**
     * The widget only uses a separate Teamscale server for the Test Gap badge when BOTH the widget-level option and the
     * project-level option are enabled. Returns the effective (AND-combined) value.
     */
    private usesSeparateTgaServer(): boolean {
        return this.widgetSettings != null && this.widgetSettings.useSeparateTgaServer
            && this.projectUsesSeparateTgaServer;
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
        return this.fillDropdownWithProjects(this.teamscaleClient, this.tsProjectSelect, 'teamscaleProject');
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
        return this.fillDropdownWithProjects(this.tgaTeamscaleClient, this.tsTgaProjectSelect, 'tgaTeamscaleProject');
    }

    /**
     * Loads a list of accessible projects from the Teamscale server and appends them to the dropdown menu.
     */
    private async fillDropdownWithProjects(teamscaleClient: TeamscaleClient, projectSelect: any, settingsKey: string) {
        let projects: string[];
        try {
            projects = await teamscaleClient.retrieveTeamscaleProjects();
        } catch (error) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(error, teamscaleClient.url);
            return Promise.reject(error);
        }

        projectSelect.clear(true);
        projectSelect.clearOptions();
        projectSelect.enable();
        for (const project of projects) {
            projectSelect.addOption({value: project, text: project});
        }

        const savedValue = this.widgetSettings && this.widgetSettings[settingsKey];
        if (savedValue && projects.indexOf(savedValue) !== -1) {
            projectSelect.setValue(savedValue, true);
        } else if (projects.length > 0) {
            projectSelect.setValue(projects[0], true);
        }
    }

    /**
     * Loads the list configured baselines for a project from the Teamscale server and appends them to the dropdown menu.
     */
    private async fillDropdownWithTeamscaleBaselines(notifyWidgetChange) {
        // use input value and not widgetSetting Object which might hold an outdated project name
        // since the change event of the project selector is fired before the settings object update
        const teamscaleProject: string = this.tsProjectSelect.getValue();
        if (!teamscaleProject) {
            return;
        }

        let baselines: ITeamscaleBaseline[];
        try {
            baselines = await this.teamscaleClient.retrieveBaselinesForProject(teamscaleProject);
        } catch (error) {
            // Isolate the failure: a baseline load error disables only the baseline dropdown and must not reject the
            // load chain (which would hide the entire configuration form). The main Teamscale server is still usable
            // for the rest of the form. See TS-46229.
            this.notificationUtils.handleErrorInTeamscaleCommunication(error, this.teamscaleClient.url,
                teamscaleProject);
            return this.disableDropdown(this.tsBaselineSelect,
                'Error: Could not load baselines from the Teamscale server.');
        }

        this.tsBaselineSelect.clear(true);
        this.tsBaselineSelect.clearOptions();

        if (baselines.length === 0) {
            const message = 'No baseline configured for project »' + teamscaleProject + '«';
            this.tsBaselineSelect.addOption({value: message, text: message});
            this.tsBaselineSelect.setValue(message, true);
            this.tsBaselineSelect.disable();
        } else {
            this.tsBaselineSelect.enable();
            for (const baseline of baselines) {
                const date = new Date(baseline.timestamp);
                const text = baseline.name + ' (' + date.toLocaleDateString() + ')';
                this.tsBaselineSelect.addOption({value: baseline.name, text: text});
            }
            if (this.widgetSettings && this.widgetSettings.tsBaseline) {
                this.tsBaselineSelect.setValue(this.widgetSettings.tsBaseline, true);
            }
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
     * Initializes the notification and login management handling errors in Teamscale communication.
     */
    private async initializeNotificationUtils() {
        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService,
            null, this.emailContact, false);
    }

    /**
     * Returns the widget settings as they get stored in ADOS.
     */
    private getWrappedCustomSettings(): { data: string } {
        const customSettings: ITeamscaleWidgetSettings = this.getAndUpdateCustomSettings();
        return {data: JSON.stringify(customSettings)};
    }

    /**
     * Read the current configuration as specified in the configuration form. Stores it as class member and returns it.
     */
    private getAndUpdateCustomSettings(): ITeamscaleWidgetSettings {
        const teamscaleProject: string = this.tsProjectSelect ? this.tsProjectSelect.getValue() : '';
        const tgaTeamscaleProject: string = this.tsTgaProjectSelect ? this.tsTgaProjectSelect.getValue() : '';
        const baselineDays: number = Number(this.baselineDaysInput.value);
        let startFixedDate: number;
        if (this.datepicker.datepicker('getDate')) {
            startFixedDate = this.datepicker.datepicker('getDate').getTime();
        }
        const tsBaseline: string = this.tsBaselineSelect ? this.tsBaselineSelect.getValue() : '';
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
