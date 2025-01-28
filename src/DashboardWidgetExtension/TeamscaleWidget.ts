/**
 * Contribution for the Teamscale Dashboard Widget. Can be configured to show a TS-project specific testgap and findings
 * churn badge. Uses the main branch and uses data from a defined number of days in the past until HEAD.
 */

import { ITeamscaleBaseline } from '../ITeamscaleBaseline';
import { ITeamscaleWidgetSettings } from '../Settings/ITeamscaleWidgetSettings';
import { ProjectSettings } from '../Settings/ProjectSettings';
import { Scope } from '../Settings/Scope';
import { Settings } from '../Settings/Settings';
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from '../Utils/NotificationUtils';
import UiUtils = require('../Utils/UiUtils');

export class TeamscaleWidget {
    private teamscaleClient: TeamscaleClient = null;
    private tgaTeamscaleClient: TeamscaleClient = null;
    private notificationUtils: NotificationUtils = null;
    private emailContact: string = '';
    private projectSettings: ProjectSettings = null;
    private organizationSettings: Settings = null;

    private readonly timechooserFixedDate: string = 'start-fixed-date';
    private readonly timechooserTsBaseline: string = 'start-ts-baseline';
    private readonly timechooserTimespan: string = 'start-timespan';

    private currentSettings: ITeamscaleWidgetSettings;

    private readonly widgetHelpers: any;
    private readonly notificationService: any;
    private readonly controlService: any;

    constructor(widgetHelpers, controlService, notificationService) {
        this.widgetHelpers = widgetHelpers;
        this.controlService = controlService;
        this.notificationService = notificationService;
        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService, null, '', false);
    }

    /**
     * Empties the automatically filled (Errors, Teamscale project information, SVGs) div containers.
     */
    private static tabulaRasa() {
        const containersToEmpty: string[] = ['message-div', 'teamscale-info', 'badges'];
        for (const containerId of containersToEmpty) {
            const messageContainer = document.getElementById(containerId) as HTMLDivElement;
            while (messageContainer && messageContainer.firstChild) {
                messageContainer.removeChild(messageContainer.firstChild);
            }
        }
    }

    /**
     * Returns version number of internet explorer or edge (eq. to > 12). For other browsers return undefined.
     */
    private static getVersionOfInternetExplorer(): undefined | number {
        const match = /\b(MSIE |Trident.*?rv:|Edge\/)(\d+)/.exec(navigator.userAgent);
        if (match) {
            return parseInt(match[2], 10);
        } else {
            return undefined;
        }
    }

    /**
     * Loads the widget after opening the dashboard; called by ADOS.
     */
    public load(widgetSettings) {
        $('.inner-title').text(widgetSettings.name);
        this.parseSettings(widgetSettings);

        if (!this.currentSettings) {
            this.notificationUtils.showInfoBanner('Please configure plugin first.');
            return this.widgetHelpers.WidgetStatusHelper.Success();
        }

        if (this.validateBaselineSettings() !== '') {
            this.notificationUtils.showInfoBanner(this.validateBaselineSettings());
            return this.widgetHelpers.WidgetStatusHelper.Success();
        }

        return this.loadAndCheckConfiguration()
            .then(() => this.loadAndRenderBadges())
            .then(() => this.widgetHelpers.WidgetStatusHelper.Success(),
                () => this.widgetHelpers.WidgetStatusHelper.Failure('Could not load configuration.'))
            // All possible errors should not lead to an unresolved promise, since we want to use our
            // error handling and messages and not a generic Azure DevOps error
            .catch(e => this.widgetHelpers.WidgetStatusHelper.Failure(e));
    }

    /**
     * Reloads the widget e.g. when configuration is changed; called by ADOS.
     */
    public reload(widgetSettings) {
        TeamscaleWidget.tabulaRasa();
        return this.load(widgetSettings);
    }

    /**
     * Checks whether the baseline settings have a valid combination of time-chooser and value.
     * Does not check if the configured baseline (still) exists on the Teamscale server.
     */
    private validateBaselineSettings(): string {
        if (TeamscaleWidget.getVersionOfInternetExplorer() !== undefined && TeamscaleWidget.getVersionOfInternetExplorer() < 12) {
            // skip validation for IE11 and below
            return '';
        }

        switch (this.currentSettings.activeTimeChooser) {
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
     * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
     * name is set in the Azure DevOps project settings.
     */
    private async loadAndCheckConfiguration() {
        const azureProjectName = VSS.getWebContext().project.name;
        this.projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
        this.organizationSettings = new Settings(Scope.ProjectCollection);

        this.emailContact = await this.organizationSettings.get(Settings.EMAIL_CONTACT_KEY);
        return Promise.all([this.initializeTeamscaleClient(), this.initializeNotificationUtils()]);
    }

    /**
     * Fetches test gap and findings churn badges for the configured timespan as SVG from the Teamscale server and
     * places them in the widget.
     */
    private async loadAndRenderBadges() {
        let tgaBadge: string = '';
        let findingsChurnBadge: string = '';

        let startTimestamp: number;
        try {
            startTimestamp = await this.calculateStartTimestamp();
        } catch (error) {
            if (error.status === 401 || error.status === 403 || error.status === 404) {
                this.notificationUtils.handleErrorInTeamscaleCommunication(error, this.teamscaleClient.url,
                    this.currentSettings.teamscaleProject, 'calculating start date for badge');
            } else if (this.currentSettings.activeTimeChooser === 'start-ts-baseline') {
                this.notificationUtils.showErrorBanner('Teamscale baseline definition for <i>'
                    + this.currentSettings.tsBaseline + '</i> not found on server.');
            }
            return Promise.resolve();
        }

        if (this.currentSettings.showTestGapBadge === true) {
            let tgaTeamscaleProject = this.currentSettings.teamscaleProject;
            if (this.currentSettings.useSeparateTgaServer === true) {
                tgaTeamscaleProject = this.currentSettings.tgaTeamscaleProject;
            }

            try {
                tgaBadge = await this.tgaTeamscaleClient.retrieveTestGapDeltaBadge(tgaTeamscaleProject, startTimestamp);
                tgaBadge = '<div id="tga-badge">' + tgaBadge + '</div>';
            } catch (error) {
                this.notificationUtils.handleErrorInTeamscaleCommunication(error, this.tgaTeamscaleClient.url,
                    this.currentSettings.tgaTeamscaleProject, 'loading Test Gap Badge');
            }
        }

        try {
            findingsChurnBadge = await this.teamscaleClient.retrieveFindingsDeltaBadge(this.currentSettings.teamscaleProject,
                startTimestamp);
            findingsChurnBadge = '<div id="findings-badge">Findings churn<br>' + findingsChurnBadge + '<br></div>';
        } catch (error) {
            this.notificationUtils.handleErrorInTeamscaleCommunication(error, this.teamscaleClient.url,
                this.currentSettings.teamscaleProject, 'loading Findings Churn Badge');
            return Promise.resolve();
        }

        this.insertBadges(tgaBadge, findingsChurnBadge);
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
    }

    /**
     * Initializes the Teamscale Client with the url configured in the project settings.
     */
    private async initializeTeamscaleClient() {
        const storedSettings = await this.projectSettings.loadStoredProjectSettings();
        const url = this.projectSettings.getOrDefault(Settings.TEAMSCALE_URL_KEY, storedSettings, undefined);

        if (!url) {
            this.notificationUtils.showErrorBanner('Teamscale is not configured for this project.' +
                this.notificationUtils.generateContactText());
            return Promise.reject();
        }

        this.teamscaleClient = new TeamscaleClient(url);

        if (!this.currentSettings.useSeparateTgaServer) {
            this.tgaTeamscaleClient = this.teamscaleClient;
            return;
        }
        const tgaUrl = this.projectSettings.getOrDefault(Settings.TGA_TEAMSCALE_URL_KEY, storedSettings, undefined);

        if (!tgaUrl) {
            this.notificationUtils.showErrorBanner('No Teamscale for Test Gap Analysis is correctly configured for this project.' +
                this.notificationUtils.generateContactText());
            return Promise.reject();
        }
        this.tgaTeamscaleClient = new TeamscaleClient(tgaUrl);
    }

    /**
     * Initializes the notification and login management handling errors in Teamscale communication.
     */
    private async initializeNotificationUtils() {
        const callbackOnLoginClose = () => {
            TeamscaleWidget.tabulaRasa();
            this.loadAndRenderBadges().then(() => this.widgetHelpers.WidgetStatusHelper.Success(),
                () => this.widgetHelpers.WidgetStatusHelper.Failure('Loading Teamscale badges failed.'));
        };

        this.notificationUtils = new NotificationUtils(this.controlService, this.notificationService,
            callbackOnLoginClose, this.emailContact, true);
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
        switch (this.currentSettings.activeTimeChooser) {
            case this.timechooserFixedDate: {
                return Promise.resolve(this.currentSettings.startFixedDate);
            }
            case this.timechooserTsBaseline: {
                return this.teamscaleClient.retrieveBaselinesForProject(this.currentSettings.teamscaleProject)
                    .then(baselines => this.getTimestampForConfiguredBaseline(baselines));
            }
            case this.timechooserTimespan: {
                const date = new Date();
                date.setDate(date.getDate() - this.currentSettings.baselineDays);
                return Promise.resolve(date.getTime());
            }
        }
    }

    /**
     * If the given array of Teamscale baselines contains a baseline with the name of baseline to use in the widget,
     * the timestamp of the baseline is returned. Otherwise undefined.
     */
    private getTimestampForConfiguredBaseline(baselines: ITeamscaleBaseline[]): undefined | number {
        for (const baseline of baselines) {
            if (this.currentSettings.tsBaseline === baseline.name) {
                return baseline.timestamp;
            }
        }
        return undefined;
    }
}

VSS.require(['TFS/Dashboards/WidgetHelpers', 'VSS/Controls', 'VSS/Controls/Notifications'],
    (widgetHelpers, controlService, notificationService) => {
        widgetHelpers.IncludeWidgetStyles();

        VSS.register('TeamscaleWidget', () => {
            return new TeamscaleWidget(widgetHelpers, controlService, notificationService);
        });

        VSS.notifyLoadSucceeded();
    });