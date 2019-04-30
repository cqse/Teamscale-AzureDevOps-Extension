/**
 * Contribution for the Teamscale Dashboard Widget. Can be configured to show a TS-project specific testgap and findings
 * churn badge. Uses the main branch and uses data from a defined number of days in the past until HEAD.
 */

/// <reference path="../Settings/ITeamscaleWidgetSettings.d.ts" />

import {Settings} from "../Settings/Settings";
import {Scope} from "../Settings/Scope";
import TeamscaleClient from "../TeamscaleClient";
import {ProjectSettings} from "../Settings/ProjectSettings";
import NotificationUtils from "../Utils/NotificationUtils";
import UiUtils = require("../Utils/UiUtils");

export class TeamscaleWidget {
    private teamscaleClient: TeamscaleClient = null;
    private notificationUtils: NotificationUtils = null;
    private emailContact: string = "";
    private projectSettings: Settings = null;
    private organizationSettings: Settings = null;

    private timechooserFixedDate: string = 'start-fixed-date';
    private timechooserTsBaseline: string = 'start-ts-baseline';
    private timechooserTimespan: string = "start-timespan";


    private currentSettings: ITeamscaleWidgetSettings;

    private WidgetHelpers: any;
    private notificationService: any;
    private controlService: any;

    constructor(widgetHelpers, controls, notifications) {
        this.WidgetHelpers = widgetHelpers;
        this.notificationService = notifications;
        this.controlService = controls;
        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService,
            null, '', '', '', false);

    }

    public load(widgetSettings) {
        $('.inner-title').text(widgetSettings.name);
        this.parseSettings(widgetSettings);

        if (!this.currentSettings) {
            this.notificationUtils.showInfoBanner('Please configure plugin first.');
            return this.WidgetHelpers.WidgetStatusHelper.Success();
        }

        if (this.validateBaselineSettings() != '') {
            this.notificationUtils.showInfoBanner(this.validateBaselineSettings());
            return this.WidgetHelpers.WidgetStatusHelper.Success();
        }

        return this.loadAndCheckConfiguration()
                .then(() => this.loadAndRenderBadges())
                .then(() => this.WidgetHelpers.WidgetStatusHelper.Success(),
                    () => () => this.WidgetHelpers.WidgetStatusHelper.Failure('Loading Teamscale badges failed.'));
    }

    public reload(widgetSettings) {
        this.tabulaRasa();
        return this.load(widgetSettings);
    }

    /**
     * Empties the automatically filled (Errors, Teamscale project information, SVGs) div containers.
     */
    private tabulaRasa() {
        const containersToEmpty: Array<string> = ['message-div', 'teamscale-info', 'badges'];
        for (const containerId of containersToEmpty) {
            const messageContainer = document.getElementById(containerId) as HTMLDivElement;
            while (messageContainer.firstChild) {
                messageContainer.removeChild(messageContainer.firstChild);
            }
        }
    }


    /**
     * Checks whether the baseline settings have a valid combination of time-chooser and value.
     * Does not check if the configured baseline (still) exists on the Teamscale server.
     */
    private validateBaselineSettings(): string {
        if (this.getVersionOfInternetExplorer() !== undefined && this.getVersionOfInternetExplorer() < 12) {
            // skip validation for IE11 and below
            return '';
        }

        switch(this.currentSettings.activeTimeChooser) {
            case this.timechooserFixedDate: {
                if (!Number.isInteger(this.currentSettings.startFixedDate)) {
                    return 'Error in baseline configuration using a fixed date: date not set.';
                }
                break;
            }
            case this.timechooserTsBaseline: {
                if (this.currentSettings.tsBaseline.length < 1 || this.currentSettings.tsBaseline.startsWith('No baseline configured')) {
                    return 'Error in baseline configuration using a TS baseline: baseline name not set.';
                }
                break;
            }
            case this.timechooserTimespan: {
                if (!Number.isInteger(this.currentSettings.baselineDays) || this.currentSettings.baselineDays < 1) {
                    return 'Error in baseline configuration using a timespan: set timespan days not positive.';
                }
                break;
            }
        }
        return '';
    }

    /**
     * Returns version number of internet explorer or edge (eq. to > 12). For other browsers return undefined.
     */
    private getVersionOfInternetExplorer(): undefined | number {
        let match = /\b(MSIE |Trident.*?rv:|Edge\/)(\d+)/.exec(navigator.userAgent);
        if (match) {
            return parseInt(match[2]);
        } else {
            return undefined;
        }
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
     * Fetches test gap and findings churn badges for the configured timespan as SVG from the Teamscale server and
     * places them in the widget.
     */
    async loadAndRenderBadges() {
        let tgaBadge: string = '';
        let findingsChurnBadge: string = '';

        let startTimestamp: number;
        try {
            startTimestamp = await this.calculateStartTimestamp();
        } catch (error) {
            if (error.status === 403 || error.status === 404) {
                this.notificationUtils.handleErrorInTeamscaleCommunication(error);
            } else if (this.currentSettings.activeTimeChooser === 'start-ts-baseline') {
                this.notificationUtils.showErrorBanner('Teamscale baseline definition for <i>'
                    + this.currentSettings.tsBaseline + '</i> not found on server.');
            }
            return Promise.resolve();
        }

        if (this.currentSettings.showTestGapBadge === true) {
            try {
                tgaBadge = await this.teamscaleClient.retrieveTestGapDeltaBadge(this.currentSettings.teamscaleProject,
                    startTimestamp);
                tgaBadge = '<div id="tga-badge">' + tgaBadge + '</div>';
            } catch (error) {
                this.notificationUtils.handleErrorInTeamscaleCommunication(error);
            }
        }

        try {
            findingsChurnBadge = await this.teamscaleClient.retrieveFindingsDeltaBadge(this.currentSettings.teamscaleProject,
                startTimestamp);
            findingsChurnBadge = '<div id="findings-badge">Findings churn<br>' + findingsChurnBadge + '<br></div>';
        } catch (error) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(error);
            return Promise.resolve();
        }

        tgaBadge = this.insertBadges(tgaBadge, findingsChurnBadge);
    }


    /**
     * Puts badges (SVGs returned from Teamscale server) in the respective containers.
     */
    private insertBadges(tgaBadge: string, findingsChurnBadge: string) {
        tgaBadge = UiUtils.replaceClipPathId(tgaBadge, 'tgaBadge');
        const badgesElement = $('#badges');
        badgesElement.html(tgaBadge.concat(findingsChurnBadge));

        const infoElement = $('#teamscale-info');
        if (this.currentSettings) {
            infoElement.html('Project <i>' + this.currentSettings.teamscaleProject + '</i>');
        } else {
            infoElement.html('Please configure TS project and analysis timespan.');
        }

        UiUtils.resizeHost();
        return tgaBadge;
    }

    /**
     * Initializes the Teamscale Client with the url configured in the project settings.
     */
    async initializeTeamscaleClient() {
        let url = await this.projectSettings.get(Settings.TEAMSCALE_URL);

        if (!url) {
            this.notificationUtils.showErrorBanner(`Teamscale is not configured for this project. ${this.notificationUtils.generateContactText()}`);
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);
    }

    /**
     * Initializes the notification and login management handling errors in Teamscale communication.
     */
    async initializeNotificationUtils() {
        const url = await this.projectSettings.get(Settings.TEAMSCALE_URL);
        const project = this.currentSettings.teamscaleProject;

        const callbackOnLoginClose = () => {
            this.tabulaRasa();
            this.loadAndRenderBadges().then(() => this.WidgetHelpers.WidgetStatusHelper.Success(),
                    () => () => this.WidgetHelpers.WidgetStatusHelper.Failure('Loading Teamscale badges failed.'));
        } ;

        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService, callbackOnLoginClose,
            project, url, this.emailContact, true);
    }

    /**
     * Parses JSON-stringified widget settings to a field member.
     */
    private parseSettings(widgetSettings) {
        this.currentSettings = JSON.parse(widgetSettings.customSettings.data) as ITeamscaleWidgetSettings;
    }

    /**
     * Calculate the start timestamp for the badges based on the configured time chooser method and value.
     * Returns an rejecting promise if the widget is configured to use a Teamscale baseline that could not be resolved
     * to a timespan.
     */
    private calculateStartTimestamp(): PromiseLike<number> {
        switch(this.currentSettings.activeTimeChooser) {
            case this.timechooserFixedDate: {
                return Promise.resolve(this.currentSettings.startFixedDate);
            }
            case this.timechooserTsBaseline: {
                return this.teamscaleClient.retrieveBaselinesForProject(this.currentSettings.teamscaleProject)
                    .then(baselines => {
                        for (const baseline of baselines) {
                            if (this.currentSettings.tsBaseline === baseline.name) {
                                return baseline.timestamp;
                            }
                        }
                    });
            }
            case this.timechooserTimespan: {
                let date = new Date();
                date.setDate(date.getDate() - this.currentSettings.baselineDays);
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