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

export class Configuration {
    private projectSettings: Settings = null;
    private organizationSettings: Settings = null;

    private widgetSettings: ITeamscaleWidgetSettings = null;

    private teamscaleClient: TeamscaleClient = null;
    private notificationUtils: NotificationUtils = null;
    private emailContact: string = '';

    private teamscaleProjectSelect = document.getElementById('teamscale-project-select') as HTMLSelectElement;
    private teamscaleBaselineSelect = document.getElementById('ts-baseline-select') as HTMLSelectElement;
    private baselineDaysInput = document.getElementById('baseline-days-input') as HTMLInputElement;
    private datepicker = $('#datepicker');
    private testGapCheckbox = $('#show-test-gap');

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
        this.datepicker.datepicker();

        if (this.widgetSettings) {
            this.baselineDaysInput.value = String(this.widgetSettings.baselineDays);
            this.datepicker.datepicker('setDate', new Date(this.widgetSettings.startFixedDate));
            this.testGapCheckbox.prop('checked', this.widgetSettings.showTestGapBadge);
        }
        $('#teamscale-project-select').chosen({width: '100%'}).change(() => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange));
        $('#ts-baseline-select').chosen({width: '95%'});

        this.loadAndCheckConfiguration().then(() => this.fillDropdownWithProjects())
            .then(() => this.fillDropdownWithTeamscaleBaselines(notifyWidgetChange)).catch(() => $('.teamscale-config-group').hide());

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
        const inputIds: string[] = ['datepicker', 'baseline-days-input', 'ts-baseline-select', 'teamscale-project-select', 'show-test-gap'];
        for (const inputId of inputIds) {
            document.getElementById(inputId).onchange = notifyWidgetChange;
        }
        let activeTabIndex: number = 0;
        if (this.widgetSettings) {
            activeTabIndex = $('#tabs a[href="#' + this.widgetSettings.activeTimeChooser + '"]').parent().index();
        }
        $('#tabs').tabs({
            activate: notifyWidgetChange,
            active: activeTabIndex,
        });
    }

    /**
     * Loads a list of accessible projects from the Teamscale server and appends them to the dropdown menu.
     */
    private async fillDropdownWithProjects() {
        let projects: string[];
        try {
            projects = await this.teamscaleClient.retrieveTeamscaleProjects();
        } catch (error) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(error);
            return Promise.reject(error);
        }

        for (const project of projects) {
            const element = document.createElement('option');
            element.textContent = project;
            element.value = project;
            if (this.widgetSettings) {
                element.selected = this.widgetSettings.teamscaleProject === project;
            }
            this.teamscaleProjectSelect.appendChild(element);
        }

        $('#teamscale-project-select').trigger('chosen:updated');
    }

    /**
     * Loads the list configured baselines for a project from the Teamscale server and appends them to the dropdown menu.
     */
    private async fillDropdownWithTeamscaleBaselines(notifyWidgetChange) {
        // use input value and not widgetSetting Object which might hold an outdated project name
        // since the chosen change event of the project selector is fired before the settings object update
        const teamscaleProject: string = this.teamscaleProjectSelect.value;

        let baselines: ITeamscaleBaseline[];
        try {
            baselines = await this.teamscaleClient.retrieveBaselinesForProject(teamscaleProject);
        } catch (error) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(error);
            return Promise.reject(error);
        }

        while (this.teamscaleBaselineSelect.firstChild) {
            this.teamscaleBaselineSelect.removeChild(this.teamscaleBaselineSelect.firstChild);
        }

        this.disableBaselineDropdownForProjectsWithoutBaselines(baselines, teamscaleProject);

        for (const baseline of baselines) {
            const element = document.createElement('option');
            const date = new Date(baseline.timestamp);
            element.textContent = baseline.name + ' (' + date.toLocaleDateString() + ')';
            element.value = baseline.name;
            if (this.widgetSettings) {
                element.selected = this.widgetSettings.tsBaseline === baseline.name;
            }
            this.teamscaleBaselineSelect.appendChild(element);
        }

        // update widget settings to get rid of a baseline which belongs to the formally chosen project
        this.getAndUpdateCustomSettings();
        $('#ts-baseline-select').trigger('chosen:updated');
        notifyWidgetChange();
    }

    /**
     * Disables the baseline chooser for projects without configured Teamscale baselines.
     */
    private disableBaselineDropdownForProjectsWithoutBaselines(baselines: ITeamscaleBaseline[], teamscaleProject: string) {
        if (baselines.length === 0) {
            const element = document.createElement('option');
            element.textContent = 'No baseline configured for project »' + teamscaleProject + '«';
            this.teamscaleBaselineSelect.appendChild(element);
            $('#ts-baseline-select').prop('disabled', true);
        } else {
            $('#ts-baseline-select').prop('disabled', false);
        }
    }

    /**
     * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
     * name is set in the Azure DevOps project settings.
     */
    private async loadAndCheckConfiguration() {
        const azureProjectName = VSS.getWebContext().project.name;
        this.projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
        this.organizationSettings = new Settings(Scope.ProjectCollection);

        this.emailContact = await this.organizationSettings.get(Settings.EMAIL_CONTACT);
        return Promise.all([this.initializeTeamscaleClient(), this.initializeNotificationUtils()]);
    }

    /**
     * Initializes the Teamscale Client with the url configured in the project settings.
     */
    private async initializeTeamscaleClient() {
        const url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        if (!url) {
            this.notificationUtils.showErrorBanner(`Teamscale is not configured for this Azure Dev Ops project.`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
    }

    /**
     * Initializes the notification and login management handling errors in Teamscale communication.
     */
    private async initializeNotificationUtils() {
        const url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService,
            null, '', url, this.emailContact, false);
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
        const teamscaleProject: string = this.teamscaleProjectSelect.value;
        const baselineDays: number = Number(this.baselineDaysInput.value);
        let startFixedDate: number;
        if (this.datepicker.datepicker('getDate')) {
            startFixedDate = this.datepicker.datepicker('getDate').getTime();
        }
        const tsBaseline: string = this.teamscaleBaselineSelect.value;
        const showTestGapBadge: boolean = document.getElementById('show-test-gap').checked;

        const activeTimeChooser: string = $('.ui-tabs-active').attr('aria-controls');

        this.widgetSettings = {
            teamscaleProject,
            activeTimeChooser,
            startFixedDate,
            baselineDays,
            tsBaseline,
            showTestGapBadge,
        } as ITeamscaleWidgetSettings;

        return this.widgetSettings;
    }
}

VSS.require(['TFS/Dashboards/WidgetHelpers', 'VSS/Controls', 'VSS/Controls/Notifications'],
    (widgetHelpers, controlService, notificationService) => {
        VSS.register('Teamscale-Configuration', () => {
            const configuration = new Configuration(widgetHelpers, controlService, notificationService);
            return configuration;
        });

        VSS.notifyLoadSucceeded();
    });
