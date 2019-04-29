/**
 * Contribution for the Teamscale Dashboard Widget. Can be configured to show a TS-project specific testgap and findings
 * churn badge. Uses the main branch and uses data from a defined number of days in the past until HEAD.
 */

/// <reference path="IWidgetSettings.d.ts" />

import {Settings} from "./Settings/Settings";
import {Scope} from "./Settings/Scope";
import TeamscaleClient from "./TeamscaleClient";
import {ProjectSettings} from "./Settings/ProjectSettings";
import NotificationUtils from "./NotificationUtils";
import UiUtils = require("./UiUtils");

export class TeamscaleWidget {
    private teamscaleClient: TeamscaleClient = null;
    private notificationUtils: NotificationUtils = null;
    private emailContact: string = "";
    private standardTimespanInDays: number = 30;
    private projectSettings: Settings = null;
    private organizationSettings: Settings = null;

    private currentSettings: ISettings;

    private WidgetHelpers: any;
    private notificationService: any;
    private controlService: any;

    constructor(widgetHelpers, controls, notifications) {
        this.WidgetHelpers = widgetHelpers;
        this.notificationService = notifications;
        this.controlService = controls;
    }

    public load(widgetSettings) {
        $('.title').text(widgetSettings.name);
        this.parseSettings(widgetSettings);

        return this.loadAndCheckConfiguration()
                .then(() => this.loadBadges())
                .then(() => this.WidgetHelpers.WidgetStatusHelper.Success(),
                    () => () => this.WidgetHelpers.WidgetStatusHelper.Failure('Loading Teamscale badges failed.'));
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
        return Promise.all([this.initializeTeamscaleClient(), this.initializeNotificationUtils()]);
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
                this.notificationUtils.handleErrorsInRetrievingBadges(error);
            }
        }

        try {
            findingsChurnBadge = await this.teamscaleClient.retrieveFindingsDeltaBadge(this.currentSettings.teamscaleProject,
                startTimestamp);
            findingsChurnBadge = '<br><div id="findings-badge">' + findingsChurnBadge + '</div>';
        } catch (error) {
            this.notificationUtils.handleErrorsInRetrievingBadges(error);
            return Promise.reject();
        }

        tgaBadge = UiUtils.replaceClipPathId(tgaBadge, 'tgaBadge');
        const badgesElement = $('#badges');
        badgesElement.html(tgaBadge.concat(findingsChurnBadge));

        const infoElement = $('#teamscale-info');
        if (this.currentSettings) {
            infoElement.html('Badges for project <i>' + this.currentSettings.teamscaleProject + '</i>');
        } else {
            infoElement.html('Please configure TS project and analysis timespan.');
        }

        UiUtils.resizeHost();
    }

    async initializeTeamscaleClient() {
        let url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        if (!url) {
            //todo endLoadingWithInfoMessage(`Teamscale is not configured for this project. ${generateContactText()}`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
    }

    async initializeNotificationUtils() {
        const url = await this.projectSettings.get(Settings.TEAMSCALE_URL);
        const project = this.currentSettings.teamscaleProject;

        const callbackOnLoginClose = () => this.loadBadges()
            .then(() => this.WidgetHelpers.WidgetStatusHelper.Success(),
            () => () => this.WidgetHelpers.WidgetStatusHelper.Failure('Loading Teamscale badges failed.'));

        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService, callbackOnLoginClose,
            project, url, this.emailContact, true);
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
}

VSS.require(["TFS/Dashboards/WidgetHelpers", "VSS/Controls", "VSS/Controls/Notifications"], (WidgetHelpers, controls, notifications) => {
    WidgetHelpers.IncludeWidgetStyles();

    VSS.register("TeamscaleWidget", () => {
        const configuration = new TeamscaleWidget(WidgetHelpers, controls, notifications);
        return configuration;
    });

    VSS.notifyLoadSucceeded();
});