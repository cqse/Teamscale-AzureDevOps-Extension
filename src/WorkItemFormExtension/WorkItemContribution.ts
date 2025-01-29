/**
 * Contribution for the work item UI. It shows a test gap, test smell, and findings churn badges when Teamscale URL and project are properly set up via
 * the project settings contribution.
 */
import { ProjectSettings } from '../Settings/ProjectSettings';
import { Scope } from '../Settings/Scope';
import { Settings } from '../Settings/Settings';
import TeamscaleClient from '../TeamscaleClient';
import NotificationUtils from '../Utils/NotificationUtils';
import { NOT_AUTHORIZED_ERROR } from '../Utils/ProjectsUtils';
import ProjectUtils = require('../Utils/ProjectsUtils');
import UiUtils = require('../Utils/UiUtils');
import {convertToBoolean} from "../Utils/UiUtils";
import {ExtensionSetting} from "../Settings/ExtensionSetting";

const titleTestGapBadge: string = 'Tests';
const TITLE_TEST_SMELL_BADGE: string = 'Test Smell Findings Churn';
const titleFindingsChurnBadge: string = 'Findings Churn';

let notificationUtils: NotificationUtils = null;
let teamscaleClient: TeamscaleClient = null;
let teamscaleProject: string = '';
let useExtraTgaConfiguration: boolean = false;
let useExtraTsaConfiguration: boolean = false;
let tgaTeamscaleClient: TeamscaleClient = null;
let tgaTeamscaleProject: string = '';
let tsaTeamscaleClient: TeamscaleClient = null;
let tsaTeamscaleProject: string = '';
let showFindingsBadge: boolean = false;
let showTestGapBadge: boolean = false;
let showTestSmellBadge: boolean = false;
let emailContact: string = '';
let issueId: number = 0;
let projectSettings: ProjectSettings = null;
let minimizeWarnings = false;

// VSS services
let controlService = null;
let notificationService = null;
let workItemService = null;

/**
 * Set extension properties in VSS
 */
VSS.init({
    // We do a lot of async processing (querying settings, Teamscale, ...), so this is required.
    explicitNotifyLoaded: true,
    // Allow dark theme
    applyTheme: true,
    usePlatformStyles: true, //
    usePlatformScripts: true, // Required for theming/styling
});

/**
 * Request the required services from VSS. Once retrieved, register a contribution callback (required by VSS)
 * and load the TGA badge
 */
VSS.require(['TFS/WorkItemTracking/Services', 'VSS/Controls', 'VSS/Controls/Notifications'],
    (workItemServices, controls, notifications) => {

        controlService = controls;
        notificationService = notifications;
        workItemService = workItemServices;

        VSS.register(VSS.getContribution().id,  () => {
            /* tslint:disable:no-empty */
            return {
                /** Called when the active work item is modified */
                onFieldChanged() {},

                /** Called when a new work item is being loaded in the UI */
                onLoaded() {},

                /** Called when the active work item is being unloaded in the UI */
                onUnloaded() {},

                /** Called after the work item has been saved */
                onSaved() {},

                /** Called when the work item is reset to its unmodified state (undo) */
                onReset() {},

                /** Called when the work item has been refreshed from the server */
                onRefreshed() {},
            };
            /* tslint:enable:no-empty */
        });
        loadAndCheckConfiguration().then(() => loadBadges(), e => {
            if (e) {
                endLoadingWithInfoMessage(e);
            }
        });
    });

/**
 * Loads the Teamscale email contact from the organization settings and assures that a Teamscale server url and project
 * name is set in the Azure DevOps project settings.
 */
async function loadAndCheckConfiguration() {
    const azureProjectName = VSS.getWebContext().project.name;
    projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    const organizationSettings: Settings = new Settings(Scope.ProjectCollection);
    minimizeWarnings = convertToBoolean(await organizationSettings.get(ExtensionSetting.MINIMIZE_WARNINGS));

    emailContact = await organizationSettings.get(ExtensionSetting.EMAIL_CONTACT);
    await initializeNotificationUtils();
    return Promise.all([initializeTeamscaleClients(), resolveIssueId()]).then(() =>
        resolveProjectNames());
}

/**
 * Initializes the notification and login management handling errors in Teamscale communication.
 */
async function initializeNotificationUtils() {
    const callbackOnLoginClose = () => {
        $('#tga-badge').empty();
        $('#message-div').empty();
        resolveProjectNames().then(() => loadBadges());
    };

    notificationUtils = new NotificationUtils(controlService, notificationService, callbackOnLoginClose, emailContact,
        true);
}

/**
 * Fetches issue specific badges as SVG from the Teamscale server and places them in the work item form.
 */
async function loadBadges() {
    let findingsChurnBadge: string = '';

    if (!showTestGapBadge && !showFindingsBadge && !showTestSmellBadge) {
        if(!minimizeWarnings){
            notificationUtils.showInfoBanner('Please activate at least one Badge to show in the Project settings' +
                ' (Extensions → Teamscale).');
        }
        UiUtils.resizeHost();
        VSS.notifyLoadSucceeded();
        return;
    }

    let tgaBadge = await loadTgaBadge();
    let tsaBadge = await loadTsaBadge();
    findingsChurnBadge = await loadFindingsChurnBadge(findingsChurnBadge);

    findingsChurnBadge = UiUtils.replaceClipPathId(findingsChurnBadge, 'findingsChurnBadge');
    tgaBadge = UiUtils.replaceClipPathId(tgaBadge, 'tgaBadge');
    tsaBadge = UiUtils.replaceClipPathId(tsaBadge, 'tsaBadge');
    
    const badgesElement = $('#badges');
    badgesElement.html(tsaBadge.concat(tgaBadge, findingsChurnBadge));

    UiUtils.resizeHost();
    VSS.notifyLoadSucceeded();
}

async function loadFindingsChurnBadge(findingsChurnBadge: string) {
    if (showFindingsBadge && teamscaleProject) {
        try {
            findingsChurnBadge = await teamscaleClient.queryFindingsChurnBadge(teamscaleProject, issueId);
            findingsChurnBadge = titleFindingsChurnBadge + '<br>' + findingsChurnBadge;
        } catch (error) {
            notificationUtils.handleErrorInTeamscaleCommunication(error, teamscaleClient.url, teamscaleProject,
                'loading Findings Churn Badge');
        }
    }
    return findingsChurnBadge;
}

/**
 * Returns the Tsa Badge with the url configured in the project settings.
 */
async function loadTsaBadge() {
    let tsaBadge: string = '';
    if (showTestSmellBadge && tsaTeamscaleProject) {
        try {
            const connectorId: string = await ProjectUtils.retrieveRequirementsConnectorId(tsaTeamscaleClient, tsaTeamscaleProject);
            tsaBadge = await tsaTeamscaleClient.retrieveBadgeForSpecItem(tsaTeamscaleProject, connectorId, issueId.toString());
            tsaBadge = '<div id="tsa-badge">' + TITLE_TEST_SMELL_BADGE + '<br>' + tsaBadge + '</div>';
        } catch (error) {
            notificationUtils.handleErrorInTeamscaleCommunication(error, tsaTeamscaleClient.url, tsaTeamscaleProject,
                'loading Test Smell Badge');
        }
    }
    return tsaBadge;
}

/**
 * Returns the Tga Badge with the url configured in the project settings.
 */
async function loadTgaBadge() {
    let tgaBadge: string = '';
    if (showTestGapBadge && tgaTeamscaleProject) {
        try {
            tgaBadge = await tgaTeamscaleClient.queryIssueTestGapBadge(tgaTeamscaleProject, issueId);
            tgaBadge = '<div id="tga-badge">' + titleTestGapBadge + '<br>' + tgaBadge + '</div>';
        } catch (error) {
            notificationUtils.handleErrorInTeamscaleCommunication(error, tgaTeamscaleClient.url, tgaTeamscaleProject,
                'loading Test Gap Badge');
        }
    }
    return tgaBadge;
}

/**
 * Initializes the Teamscale Clients with the url configured in the project settings.
 */
async function initializeTeamscaleClients() {
    showFindingsBadge = UiUtils.convertToBoolean(await projectSettings.get(ExtensionSetting.SHOW_FINDINGS_BADGE));
    showTestGapBadge = UiUtils.convertToBoolean(await projectSettings.get(ExtensionSetting.SHOW_TEST_GAP_BADGE));
    showTestSmellBadge = UiUtils.convertToBoolean(await projectSettings.get(ExtensionSetting.SHOW_TEST_SMELL_BADGE));

    const url = await projectSettings.get(ExtensionSetting.TEAMSCALE_URL);
    if (UiUtils.isEmptyOrWhitespace(url) && (showFindingsBadge || (!useExtraTgaConfiguration && showTestGapBadge) || (!useExtraTsaConfiguration && showTestSmellBadge))) {
        throw new Error('Teamscale is not configured for this project.' + notificationUtils.generateContactText());
    }
    teamscaleClient = new TeamscaleClient(url);
    useExtraTgaConfiguration = UiUtils.convertToBoolean(await projectSettings.get(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER));
    useExtraTsaConfiguration = UiUtils.convertToBoolean(await projectSettings.get(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER));

    if (!showTestGapBadge && !showTestSmellBadge) {
        return;
    }
    
    await initializeTgaTeamscaleClient();
    await initializeTsaTeamscaleClient();
}

/**
 * Initializes the Teamscale TSA Client with the url configured in the project settings.
 */
async function initializeTsaTeamscaleClient() {
    if (!useExtraTsaConfiguration) {
        tsaTeamscaleClient = teamscaleClient;
    } else {
        const tsaUrl = await projectSettings.get(ExtensionSetting.TSA_TEAMSCALE_URL);
        if (UiUtils.isEmptyOrWhitespace(tsaUrl)) {
            throw new Error('No Teamscale for Test Smell Analysis is correctly configured for this project.' +
                notificationUtils.generateContactText());
        }
        tsaTeamscaleClient = new TeamscaleClient(tsaUrl);
    }
}

/**
 * Initializes the Teamscale TGA Client with the url configured in the project settings.
 */
async function initializeTgaTeamscaleClient() {
    if (!useExtraTgaConfiguration) {
        tgaTeamscaleClient = teamscaleClient;
    } else {
        const tgaUrl = await projectSettings.get(ExtensionSetting.TGA_TEAMSCALE_URL);

        if (UiUtils.isEmptyOrWhitespace(tgaUrl)) {
            throw new Error('No Teamscale for Test Gap Analysis is correctly configured for this project.' +
                notificationUtils.generateContactText());
        }
        tgaTeamscaleClient = new TeamscaleClient(tgaUrl);
    }
}

/**
 * Sets the Teamscale project names for Test Gap, Findings Churn, and Test Smell badges.
 */
async function resolveProjectNames() {
    await resolveFindingsChurnProjectName();
    await resolveTgaProjectName();
    await resolveTsaProjectName();
}

/**
 * Sets the Teamscale project names for Findings Churn badge.
 */
async function resolveFindingsChurnProjectName() {
    if (showFindingsBadge) {
        teamscaleProject = await resolveProjectName(teamscaleClient, ExtensionSetting.TEAMSCALE_PROJECTS,
            ProjectUtils.BadgeType.FindingsChurn, 'Findings Churn');
    }
}

/**
 * Sets the Teamscale project names for Test Smell badge.
 */
async function resolveTsaProjectName() {
    let tsaProjectsSettingsKey = ExtensionSetting.TSA_TEAMSCALE_PROJECTS;
    if (!useExtraTsaConfiguration) {
        tsaProjectsSettingsKey = ExtensionSetting.TEAMSCALE_PROJECTS;
    }

    if (showTestSmellBadge) {
        tsaTeamscaleProject = await resolveProjectName(tsaTeamscaleClient, tsaProjectsSettingsKey,
            ProjectUtils.BadgeType.TestSmell, 'Test Smell');
    }
}

/**
 * Sets the Teamscale project names for Test Gap badge.
 */
async function resolveTgaProjectName() {
    let tgaProjectsSettingsKey = ExtensionSetting.TGA_TEAMSCALE_PROJECTS;
    if (!useExtraTgaConfiguration) {
        tgaProjectsSettingsKey = ExtensionSetting.TEAMSCALE_PROJECTS;
    }

    if (showTestGapBadge) {
        tgaTeamscaleProject = await resolveProjectName(tgaTeamscaleClient, tgaProjectsSettingsKey,
            ProjectUtils.BadgeType.TestGap, 'Test Gap');
    }
}

/**
 * Read the potential teamscale project names from the ADOS project settings and resolves it to the corresponding
 * Teamscale project.
 */
async function resolveProjectName(teamscaleClient, storageProjectsKey, badgeType, readableBadgeType) {
    let teamscaleProject: string;
    let unauthorized: boolean = false;
    const teamscaleCandidateProjects = await projectSettings.getProjectsList(storageProjectsKey);
    try {
        teamscaleProject = await ProjectUtils.resolveProjectNameByIssueId(teamscaleClient,
            teamscaleCandidateProjects, issueId, notificationUtils, badgeType);
    } catch (e) {
        if (e.message !== NOT_AUTHORIZED_ERROR) {
            throw e;
        }
        unauthorized = true;
        // not authorized message already displayed
    }

    if (!teamscaleProject && !unauthorized) {
        notificationUtils.showInfoBanner('Please make sure that Teamscale project option is properly set for ' +
            readableBadgeType + ' Badges in the Azure DevOps Project settings.');
    }
    return teamscaleProject;
}


/**
 * Get the issue id of the opened Work Item.
 */
async function resolveIssueId() {
    const service = await workItemService.WorkItemFormService.getService();
    issueId = await service.getId();
}

/**
 * Displays the given message as info text.
 */
function endLoadingWithInfoMessage(message: string) {
    notificationUtils.showInfoBanner(message);
    VSS.notifyLoadSucceeded();
}
