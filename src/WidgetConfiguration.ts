/**
 * Logic for the configuration of the Teamscale dashboard widget.
 * Configurable are
 *  - TS project to use
 *  - number of days to respect in the badges
 */
import {Scope} from "./Settings/Scope";
import {ProjectSettings} from "./Settings/ProjectSettings";
import {Settings} from "./Settings/Settings";
import TeamscaleClient from "./TeamscaleClient";

// TODO extract
interface ISettings {
    teamscaleProject: string;
    activeTimeChooser: string;
    startFixedDate: number;
    baselineDays: number;
    tsBaseline: string;
    showTestGapBadge: boolean;
}

interface IBaseline {
    name: string;
    description: string;
    timestamp: number
}

export class Configuration {
    private projectSettings: Settings = null;
    private organizationSettings: Settings = null;

    private widgetSettings: ISettings = null;

    private teamscaleClient: TeamscaleClient = null;
    private emailContact: string = "";

    private teamscaleProjectSelect = document.getElementById('teamscale-project-select') as HTMLSelectElement;
    private teamscaleBaselineSelect = document.getElementById('ts-baseline-select') as HTMLSelectElement;
    private baselineDaysInput = document.getElementById('baseline-days-input') as HTMLInputElement;
    private datepicker = $('#datepicker');
    private testGapCheckbox = $('#show-test-gap');

    private logDiv: HTMLDivElement = null;

    private WidgetHelpers: any;

    constructor(widgetHelpers) {
        this.WidgetHelpers = widgetHelpers;
    }

    public load(widgetSettings, widgetConfigurationContext) {
        this.widgetSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
        this.initializeOnchangeListeners(widgetConfigurationContext);
        this.datepicker.datepicker();

        if (this.widgetSettings) {
            this.baselineDaysInput.value = String(this.widgetSettings.baselineDays);
            this.datepicker.datepicker('setDate', new Date(this.widgetSettings.startFixedDate));
            this.testGapCheckbox.prop('checked', this.widgetSettings.showTestGapBadge);
        }

        $('#teamscale-project-select').chosen({width: "100%"}).change(() => this.fillDropdownWithTeamscaleBaselines());
        $('#ts-baseline-select').chosen({width: "95%"});

        this.loadAndCheckConfiguration().then(() => this.fillDropdownWithProjects())
            .then(() => this.fillDropdownWithTeamscaleBaselines());

        VSS.resize();
        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private initializeOnchangeListeners(widgetConfigurationContext) {
        const inputIds: Array<string> = ['datepicker', 'baseline-days-input', 'ts-baseline-select', 'teamscale-project-select', 'show-test-gap'];
        const notifyWidgetChange = () =>
            widgetConfigurationContext.notify(this.WidgetHelpers.WidgetEvent.ConfigurationChange,
                this.WidgetHelpers.WidgetEvent.Args(this.getWrappedCustomSettings()));
        for (const inputId of inputIds) {
            document.getElementById(inputId).onchange = notifyWidgetChange;
        }
        $('#tabs').tabs({
            active: $('#tabs a[href="#' + this.widgetSettings.activeTimeChooser + '"]').parent().index(),
            activate: notifyWidgetChange
        });
    }

    private async fillDropdownWithProjects() {
        let projects: Array<string>;
        try {
            projects = await this.teamscaleClient.retrieveTeamscaleProjects();
        } catch (error) {
            // TODO
        }

        for (let project of projects) {
            let element = document.createElement("option");
            element.textContent = project;
            element.value = project;
            element.selected = this.widgetSettings.teamscaleProject === project;
            this.teamscaleProjectSelect.appendChild(element);
        }

        $('#teamscale-project-select').trigger("chosen:updated");
    }

    private async fillDropdownWithTeamscaleBaselines() {
        // use input value and not widgetSetting Object which might hold an outdated project name
        // since the chosen change event of the project selector is fired before the settings object update
        const teamscaleProject: string = this.teamscaleProjectSelect.value;

        let baselines: Array<IBaseline>;
        try {
            baselines = await this.teamscaleClient.retrieveBaselinesForProject(teamscaleProject);
        } catch (error) {
            // TODO
        }

        while (this.teamscaleBaselineSelect.firstChild) {
            this.teamscaleBaselineSelect.removeChild(this.teamscaleBaselineSelect.firstChild);
        }

        if (baselines.length === 0) {
            let element = document.createElement("option");
            element.textContent = 'No baseline configured for project »' + teamscaleProject + '«';
            this.teamscaleBaselineSelect.appendChild(element);
            $('#ts-baseline-select').prop('disabled', true);
        } else {
            $('#ts-baseline-select').prop('disabled', false);
        }

        for (let baseline of baselines) {
            let element = document.createElement("option");
            let date = new Date(baseline.timestamp);
            element.textContent = baseline.name + ' (' + date.toLocaleDateString() + ')';
            element.value = baseline.name;
            element.selected = this.widgetSettings.tsBaseline === baseline.name;

            this.teamscaleBaselineSelect.appendChild(element);
        }

        // update widget settings to get rid of a baseline which belongs to the formally chosen project
        this.getAndUpdateCustomSettings();
        $('#ts-baseline-select').trigger("chosen:updated");
    }

    // TODO [JR] extract to Utils
    /**
     * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
     * name is set in the Azure DevOps project settings.
     */
    private async loadAndCheckConfiguration() {
        let azureProjectName = VSS.getWebContext().project.name;
        this.projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
        this.organizationSettings = new Settings(Scope.ProjectCollection);

        this.emailContact = await this.organizationSettings.get(Settings.EMAIL_CONTACT);
        return Promise.all([this.initializeTeamscaleClient()]);
    }

    // TODO [JR] extract to Utils
    private async initializeTeamscaleClient() {
        let url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        if (!url) {
            //TODO
            //endLoadingWithInfoMessage(`Teamscale is not configured for this project.`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
    }


    public onSave() {
        return this.WidgetHelpers.WidgetConfigurationSave.Valid(this.getWrappedCustomSettings());
    }

    private getWrappedCustomSettings(): { data: string } {
        const customSettings: ISettings = this.getAndUpdateCustomSettings();
        return {data: JSON.stringify(customSettings)};
    }

    private getAndUpdateCustomSettings(): ISettings {
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
                teamscaleProject: teamscaleProject,
                activeTimeChooser: activeTimeChooser,
                startFixedDate: startFixedDate,
                baselineDays: baselineDays,
                tsBaseline: tsBaseline,
                showTestGapBadge: showTestGapBadge
            } as ISettings;

        return this.widgetSettings;
    }


    // TODO extract
    /**
     * Resize the body of the host iframe to match the height of the body of the extension
     */
    private resizeHost() {
        const bodyElement = $('body,html');
        VSS.resize(bodyElement.width(), bodyElement.height());
    }

}

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
    VSS.register("Teamscale-Configuration", () => {
        const configuration = new Configuration(WidgetHelpers);
        return configuration;
    });

    VSS.notifyLoadSucceeded();
});