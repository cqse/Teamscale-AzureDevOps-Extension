/**
 * Contribution for the Teamscale Dashboard Widget. Can be configured to show a TS-project specific testgap and findings
 * churn badge. Uses the main branch and uses data from a defined number of days in the past until HEAD.
 */

import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";
import {ProjectSettings} from "./Settings/ProjectSettings";

// TODO extract
interface ISettings {
    teamscaleProject: string;
    activeTimeChooser: string;
    startFixedDate: number;
    baselineDays: number;
    tsBaseline: string;
    showTestGapBadge: boolean;
}


export class TeamscaleWidget {
    private teamscaleClient: TeamscaleClient = null;
    private emailContact: string = "";
    private standardTimespanInDays: number = 30;
    private projectSettings: Settings = null;
    private organizationSettings: Settings = null;

    private currentSettings: ISettings;

    constructor(public WidgetHelpers) { }

    public load(widgetSettings) {
        $('.title').text(widgetSettings.name);
        this.parseSettings(widgetSettings);

        return this.loadAndCheckConfiguration()
                .then(() => this.loadBadges())
                .then(() => this.WidgetHelpers.WidgetStatusHelper.Success());
    }

    public reload(widgetSettings) {
        return this.load(widgetSettings);
    }


    /**
     * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
     * name is set in the Azure DevOps project settings.
     */
    async loadAndCheckConfiguration() {
        let azureProjectName = VSS.getWebContext().project.name;
        this.projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
        this.organizationSettings = new Settings(Scope.ProjectCollection);

        this.emailContact = await this.organizationSettings.get(Settings.EMAIL_CONTACT);
        return Promise.all([this.initializeTeamscaleClient()]);
    }

    /**
     * Fetches issue specific badges as SVG from the Teamscale server and places them in the work item form.
     */
    async loadBadges() {
        let tgaBadge: string = '';
        let findingsChurnBadge: string = '';

        let startTimestamp: number;
        try {
            startTimestamp = await this.calculateStartTimestamp();
        } catch (error) {
            let date = new Date();
            startTimestamp = date.setDate(date.getDate() - this.standardTimespanInDays);
        }

        if (this.currentSettings.showTestGapBadge === true) {
            try {
                tgaBadge = await this.teamscaleClient.retrieveTestGapDeltaBadge(this.currentSettings.teamscaleProject,
                    startTimestamp);
                tgaBadge = '<br><div id="tga-badge">' + tgaBadge + '</div>';
            } catch (error) {
                // TODO
            }
        }

        try {
            findingsChurnBadge = await this.teamscaleClient.retrieveFindingsDeltaBadge(this.currentSettings.teamscaleProject,
                startTimestamp);
            findingsChurnBadge = '<br><div id="findings-badge">' + findingsChurnBadge + '</div>';
        } catch (error) {
            // TODO
        }

        tgaBadge = this.replaceClipPathId(tgaBadge, 'tgaBadge');
        const badgesElement = $('#badges');
        badgesElement.html(tgaBadge.concat(findingsChurnBadge));

        const infoElement = $('#teamscale-info');
        if (this.currentSettings) {
            infoElement.html('Badges for project <i>' + this.currentSettings.teamscaleProject + '</i>');
        } else {
            infoElement.html('Please configure TS project and analysis timespan.');
        }

        this.resizeHost();
        VSS.notifyLoadSucceeded();
    }

    async initializeTeamscaleClient() {
        let url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        if (!url) {
            //todo endLoadingWithInfoMessage(`Teamscale is not configured for this project. ${generateContactText()}`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
    }


    private parseSettings(widgetSettings) {
        this.currentSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;

        if (!this.currentSettings) {
            // TODO
        }
    }

    private calculateStartTimestamp(): PromiseLike<number> {
        switch(this.currentSettings.activeTimeChooser) {
            case 'start-fixed-date': {
                return Promise.resolve(this.currentSettings.startFixedDate);
            }
            case 'start-ts-baseline': {
                return this.teamscaleClient.retrieveBaselinesForProject(this.currentSettings.teamscaleProject)
                    .then(baselines => {
                        for (const baseline of baselines) {
                            if (this.currentSettings.tsBaseline === baseline.name) {
                                return baseline.timestamp;
                            }
                        }
                    });
            }
            case "start-timespan": {
                // intended fallthrough
            }
            default: {
                let timeSpanDays = this.standardTimespanInDays;
                if (Number.isInteger(this.currentSettings.baselineDays)) {
                    timeSpanDays = this.currentSettings.baselineDays;
                }
                let date = new Date();
                date.setDate(date.getDate() - timeSpanDays);
                return Promise.resolve(date.getTime());
            }
        }
    }

    // TODO extract
    private replaceClipPathId(plainSvg: string, clipPathId: string): string {
        plainSvg = plainSvg.replace(new RegExp("(<clipPath[^>]*id=\\\")a\\\"","gm"), '$1' + clipPathId + '"');
        return plainSvg.replace(new RegExp("(<g[^>]*clip-path=\")url\\(#a\\)\\\"","gm"),   '$1' + 'url(#' + clipPathId + ')"');
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
    WidgetHelpers.IncludeWidgetStyles();

    VSS.register("TeamscaleWidget", () => {
        const configuration = new TeamscaleWidget(WidgetHelpers);
        return configuration;
    });

    VSS.notifyLoadSucceeded();
});