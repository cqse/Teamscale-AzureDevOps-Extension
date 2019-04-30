/**
 * Contribution for the work item UI. It shows a test gap badge when Teamscale URL and project are properly set up via
 * the project settings contribution
 */
import {ProjectSettings} from "../Settings/ProjectSettings";
import {Scope} from "../Settings/Scope";
import {Settings} from "../Settings/Settings";
import TeamscaleClient from "../TeamscaleClient";
import NotificationUtils from "../Utils/NotificationUtils";
import UiUtils = require("../Utils/UiUtils");

const titleTestGapBadge: string = 'Tests';
const titleFindingsChurnBadge: string = 'Findings Churn';

let notificationUtils: NotificationUtils = null;
let teamscaleClient: TeamscaleClient = null;
let teamscaleProject: string = "";
let emailContact: string = "";
let issueId: number = 0;
let projectSettings: Settings = null;
let organizationSettings: Settings = null;

// VSS services
let controlService = null;
let notificationService = null;
let workItemService = null;

// Set extension properties in VSS
VSS.init({
    /* Require the extension to notify VSS that it's ready loading.
    We do a lot of async processing (querying settings, Teamscale, ...), so this is required.*/
    explicitNotifyLoaded: true,
    // Allow dark theme
    applyTheme: true,
    usePlatformStyles: true, //
    usePlatformScripts: true // Required for theming/styling
});

//Request the required services from VSS. Once retrieved, register a contribution callback (required by VSS) and load the TGA badge
VSS.require(["TFS/WorkItemTracking/Services", "VSS/Controls", "VSS/Controls/Notifications"],
    function (workItemServices, controls, notifications) {
    controlService = controls;
    notificationService = notifications;
    workItemService = workItemServices;

    VSS.register(VSS.getContribution().id, function () {
        return {
            // Called when the active work item is modified
            onFieldChanged() {},

            // Called when a new work item is being loaded in the UI
            onLoaded() {},

            // Called when the active work item is being unloaded in the UI
            onUnloaded() {
            },

            // Called after the work item has been saved
            onSaved: function (args) {
            },

            // Called when the work item is reset to its unmodified state (undo)
            onReset: function (args) {
            },

            // Called when the work item has been refreshed from the server
            onRefreshed: function (args) {
            }
        }
    });
    loadAndCheckConfiguration().then(() => loadBadges());
});

/**
 * Loads the Teamscale email contact from the organization settings and assures that an Teamscale server url and project
 * name is set in the Azure DevOps project settings.
 */
async function loadAndCheckConfiguration() {
    let azureProjectName = VSS.getWebContext().project.name;
    projectSettings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    organizationSettings = new Settings(Scope.ProjectCollection);

    emailContact = await organizationSettings.get(Settings.EMAIL_CONTACT);
    return Promise.all([initializeTeamscaleClient(), resolveProjectName(), resolveIssueId(),
        initializeNotificationUtils()]);
}

/**
 * Initializes the notification and login management handling errors in Teamscale communication.
 */
async function initializeNotificationUtils() {
    const url = await projectSettings.get(Settings.TEAMSCALE_URL);
    const project = await projectSettings.get(Settings.TEAMSCALE_PROJECT);
    const callbackOnLoginClose = () => {
        $('#tga-badge').empty();
        $('#message-div').empty();
        loadBadges();
    };

    notificationUtils = new NotificationUtils(controlService, notificationService, callbackOnLoginClose,
        project, url, emailContact, true);
}

/**
 * Fetches issue specific badges as SVG from the Teamscale server and places them in the work item form.
 */
async function loadBadges() {
    let tgaBadge: string = '';
    let findingsChurnBadge: string = '';

    try {
        tgaBadge = await teamscaleClient.queryIssueTestGapBadge(teamscaleProject, issueId);
        tgaBadge = '<div id="tga-badge">'+titleTestGapBadge+'<br>' + tgaBadge + '</div>';
    } catch (error) {
        notificationUtils.handleErrorInTeamscaleCommunication(error);
    }

    try {
        findingsChurnBadge = await teamscaleClient.queryFindingsChurnBadge(teamscaleProject, issueId);
        findingsChurnBadge = titleFindingsChurnBadge +'<br>' + findingsChurnBadge;
    } catch (error) {
        notificationUtils.handleErrorInTeamscaleCommunication(error);
    }

    tgaBadge = UiUtils.replaceClipPathId(tgaBadge, 'tgaBadge');
    findingsChurnBadge = UiUtils.replaceClipPathId(findingsChurnBadge, 'findingsChurnBadge');
    const badgesElement = $('#badges');
    badgesElement.html(tgaBadge.concat(findingsChurnBadge));

    UiUtils.resizeHost();
    VSS.notifyLoadSucceeded();
}

/**
 * Initializes the Teamscale Client with the url configured in the project settings.
 */
async function initializeTeamscaleClient() {
    let url = await projectSettings.get(Settings.TEAMSCALE_URL);

    if (!url) {
        endLoadingWithInfoMessage(`Teamscale is not configured for this project. ${notificationUtils.generateContactText()}`);
        return Promise.reject();
    }

    teamscaleClient = new TeamscaleClient(url);
}

/**
 * Read the teamscale project name from the ADOS project settings.
 */
async function resolveProjectName() {
    teamscaleProject = await projectSettings.get(Settings.TEAMSCALE_PROJECT);

    if (!teamscaleProject) {
        endLoadingWithInfoMessage('Please make sure that a Teamscale project name is properly configured in the ' +
          'Azure DevOps Project settings.');
        return Promise.reject();
    }
}

/**
 * Get the issue id of the opened Work Item.
 */
async function resolveIssueId() {
    let service = await workItemService.WorkItemFormService.getService();
    issueId = await service.getId();
}

/**
 * Displays the given message as info text.
 */
function endLoadingWithInfoMessage(message: string) {
    notificationUtils.showInfoBanner(message);
    VSS.notifyLoadSucceeded();
}
