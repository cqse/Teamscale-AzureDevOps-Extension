/**
 * Contribution for the project settings consisting of the Teamscale URL and project
 */
import {ProjectSettings} from './Settings/ProjectSettings';
import {Scope} from './Settings/Scope';
import {getCurrentTimestamp} from './Utils/UiUtils';
import UiUtils = require('./Utils/UiUtils');
import {ExtensionSetting} from "./Settings/ExtensionSetting";

let settings: ProjectSettings = null;

const teamscaleUrlInput = document.getElementById('teamscale-url') as HTMLInputElement;
const teamscaleProjectInput = document.getElementById('teamscale-project') as HTMLInputElement;
const saveButtonElement = document.getElementById('save-button') as HTMLButtonElement;
const logDiv = document.getElementById('log') as HTMLDivElement;
const useSeparateTestGapServerInput = document.getElementById('use-extra-tga-server') as HTMLInputElement;
const tgaConfigurationDiv = document.getElementById('extra-tga-configuration') as HTMLDivElement;
const tgaTeamscaleUrlInput = document.getElementById('tga-teamscale-url') as HTMLInputElement;
const tgaTeamscaleProjectInput = document.getElementById('tga-teamscale-project') as HTMLInputElement;
const TSA_CONFIGURATION_DIV = document.getElementById('extra-tsa-configuration') as HTMLDivElement;
const TSA_TEAMSCALE_URL_INPUT = document.getElementById('tsa-teamscale-url') as HTMLInputElement;
const USE_SEPARATE_TEST_SMELL_SERVER_INPUT = document.getElementById('use-extra-tsa-server') as HTMLInputElement;
const TSA_TEAMSCALE_PROJECT_INPUT = document.getElementById('tsa-teamscale-project') as HTMLInputElement;
const showTestGapBadgeInput = document.getElementById('show-work-item-tga-badge') as HTMLInputElement;
const showFindingsBadgeInput = document.getElementById('show-work-item-tqe-badge') as HTMLInputElement;
const SHOW_TEST_SMELL_BADGE_INPUT = document.getElementById('show-work-item-tsa-badge') as HTMLInputElement;

const projectSeparator: string = ',';

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
});

VSS.ready(() => {
    const azureProjectName = VSS.getWebContext().project.name;
    settings = new ProjectSettings(Scope.ProjectCollection, azureProjectName);
    
    saveButtonElement.onclick = () => saveFormValues();
    useSeparateTestGapServerInput.onchange = () => zipTgaConfiguration();
    USE_SEPARATE_TEST_SMELL_SERVER_INPUT.onchange = () => zipTsaConfiguration();

    try {
        loadCurrentSettings();
    } catch (e) {
        VSS.notifyLoadFailed(e);
    }
});

/**
 * Loads the current settings stored in ADOS.
 */
async function loadCurrentSettings() {
    teamscaleUrlInput.value = await settings.get(ExtensionSetting.TEAMSCALE_URL);
    tgaTeamscaleUrlInput.value = await settings.get(ExtensionSetting.TGA_TEAMSCALE_URL);
    useSeparateTestGapServerInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER));
    showTestGapBadgeInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_TEST_GAP_BADGE));

    showFindingsBadgeInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_FINDINGS_BADGE));
    
    TSA_TEAMSCALE_URL_INPUT.value = await settings.get(ExtensionSetting.TSA_TEAMSCALE_URL);
    USE_SEPARATE_TEST_SMELL_SERVER_INPUT.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER));
    SHOW_TEST_SMELL_BADGE_INPUT.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_TEST_SMELL_BADGE));

    const projects = await settings.getProjectsList(ExtensionSetting.TEAMSCALE_PROJECTS);
    const tgaProjects = await settings.getProjectsList(ExtensionSetting.TGA_TEAMSCALE_PROJECTS);
    const tsaProjects = await settings.getProjectsList(ExtensionSetting.TSA_TEAMSCALE_PROJECTS);
    teamscaleProjectInput.value = projects.join(projectSeparator);
    tgaTeamscaleProjectInput.value = tgaProjects.join(projectSeparator);
    TSA_TEAMSCALE_PROJECT_INPUT.value = tsaProjects.join(projectSeparator);

    zipTgaConfiguration();
    zipTsaConfiguration();
    VSS.notifyLoadSucceeded();
}

/**
 * Hides and shows the tga configuration items, depending on whether a separate TGA server should be used.
 */
function zipTgaConfiguration() {
    if (useSeparateTestGapServerInput.checked) {
        tgaConfigurationDiv.style.display = 'block';
        return;
    }
    tgaConfigurationDiv.style.display = 'none';
}

/**
 * Hides and shows the tsa configuration items, depending on whether a separate TSA server should be used.
 */
function zipTsaConfiguration() {
    if (USE_SEPARATE_TEST_SMELL_SERVER_INPUT.checked) {
        TSA_CONFIGURATION_DIV.style.display = 'block';
        return;
    }
    TSA_CONFIGURATION_DIV.style.display = 'none';
}

function saveUrlAndProject(teamscaleUrlFormInput: string, teamscaleProjectsFormInput: string, serverUrlKey: string, projectNameKey: string) {
    let teamscaleProjects: string[] = teamscaleProjectsFormInput.split(projectSeparator);
    teamscaleProjects = teamscaleProjects.map(entry => entry.trim());
    teamscaleProjects = teamscaleProjects.filter(entry => entry !== '');

    if (teamscaleUrlFormInput.endsWith('/')) {
        teamscaleUrlFormInput = teamscaleUrlFormInput.substring(0, teamscaleUrlFormInput.length - 1);
    }

    logDiv.innerHTML = '';

    settings.save(serverUrlKey, teamscaleUrlFormInput)
        .then(url => createSuccessfulLog('Teamscale URL', url),
                e => createFailedLog('Teamscale URL', e));

    settings.saveProjectsList(projectNameKey, teamscaleProjects)
        .then(projects => createSuccessfulLog('Teamscale Projects', projects),
                e => createFailedLog('Teamscale Projects', e));
}

function createSuccessfulLog(valueDescription: string, value: string) {
    UiUtils.logToDiv(logDiv, `${getCurrentTimestamp()} Saving ${valueDescription} "${value ? value : ''}" successful.`);
}

function createFailedLog(valueDescription: string, error?: any) {
    let errorMessage: string = '';
    if (error && error.message) {
        errorMessage = error.message;
    }

    UiUtils.logToDiv(logDiv, `${getCurrentTimestamp()} Error saving &quot;${valueDescription}&quot;. ${errorMessage}`);
}

/**
 * Saves the entered TS Server a Project values to the Project settings.
 */
function saveFormValues() {
    saveUrlAndProject(teamscaleUrlInput.value, teamscaleProjectInput.value, ExtensionSetting.TEAMSCALE_URL.key,
        ExtensionSetting.TEAMSCALE_PROJECTS.key);
    saveUrlAndProject(tgaTeamscaleUrlInput.value, tgaTeamscaleProjectInput.value, ExtensionSetting.TGA_TEAMSCALE_URL.key,
        ExtensionSetting.TGA_TEAMSCALE_PROJECTS.key);
    saveUrlAndProject(TSA_TEAMSCALE_URL_INPUT.value, TSA_TEAMSCALE_PROJECT_INPUT.value, ExtensionSetting.TSA_TEAMSCALE_URL.key,
        ExtensionSetting.TSA_TEAMSCALE_PROJECTS.key);

    settings.save(ExtensionSetting.SHOW_TEST_GAP_BADGE.key, String(showTestGapBadgeInput.checked))
        .then(showTestGapBadge => createSuccessfulLog('Show Test Gap Badge Option', showTestGapBadge),
            e => createFailedLog('Show Test Gap Badge Option', e));

    settings.save(ExtensionSetting.SHOW_FINDINGS_BADGE.key, String(showFindingsBadgeInput.checked))
        .then(showFindingsBadge => createSuccessfulLog('Show Findings Churn Badge Option', showFindingsBadge),
            e => createFailedLog('Show Findings Churn Badge Option', e));

    settings.save(ExtensionSetting.SHOW_TEST_SMELL_BADGE.key, String(SHOW_TEST_SMELL_BADGE_INPUT.checked))
        .then(showTestSmellBadge => createSuccessfulLog('Show Test Smell Badge Option', showTestSmellBadge),
            e => createFailedLog('Show Test Smell Badge Option', e));        

    settings.save(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER.key, String(useSeparateTestGapServerInput.checked))
        .then(extraTgaServer => createSuccessfulLog('Use Extra Test Gap Server Option', extraTgaServer),
            e => createFailedLog('Use Extra Test Gap Option', e));

    settings.save(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER.key, String(USE_SEPARATE_TEST_SMELL_SERVER_INPUT.checked))
        .then(extraTsaServer => createSuccessfulLog('Use Extra Test Smell Server Option', extraTsaServer),
            e => createFailedLog('Use Extra Test Smell Option', e));
    
}
