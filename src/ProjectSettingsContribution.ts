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
const testGapBadgeWorkItemTypesInput = document.getElementById('tga-badge-work-item-types') as HTMLInputElement;
const testGapBadgeWorkItemTypesWrapper = document.getElementById('tga-badge-work-item-types-wrapper') as HTMLDivElement;
const showFindingsBadgeInput = document.getElementById('show-work-item-tqe-badge') as HTMLInputElement;
const findingsBadgeWorkItemTypesInput = document.getElementById('tqe-badge-work-item-types') as HTMLInputElement;
const findingsBadgeWorkItemTypesWrapper = document.getElementById('tqe-badge-work-item-types-wrapper') as HTMLDivElement;
const SHOW_TEST_SMELL_BADGE_INPUT = document.getElementById('show-work-item-tsa-badge') as HTMLInputElement;
const testSmellBadgeWorkItemTypesInput = document.getElementById('tsa-badge-work-item-types') as HTMLInputElement;
const testSmellBadgeWorkItemTypesWrapper = document.getElementById('tsa-badge-work-item-types-wrapper') as HTMLDivElement;

const separator: string = ',';

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
    showFindingsBadgeInput.onchange = () => zipSectionDependingOnCheckbox(showFindingsBadgeInput, findingsBadgeWorkItemTypesWrapper);
    showTestGapBadgeInput.onchange = () => zipSectionDependingOnCheckbox(showTestGapBadgeInput, testGapBadgeWorkItemTypesWrapper);
    SHOW_TEST_SMELL_BADGE_INPUT.onchange = () => zipSectionDependingOnCheckbox(SHOW_TEST_SMELL_BADGE_INPUT, testSmellBadgeWorkItemTypesWrapper);

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
    
    TSA_TEAMSCALE_URL_INPUT.value = await settings.get(ExtensionSetting.TSA_TEAMSCALE_URL);
    USE_SEPARATE_TEST_SMELL_SERVER_INPUT.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER));

    await loadFindingsBadgeSettings();
    await loadTestGapBadgeSettings();
    await loadTestSmellBadgeSettings();

    const projects = await settings.getValueList(ExtensionSetting.TEAMSCALE_PROJECTS);
    const tgaProjects = await settings.getValueList(ExtensionSetting.TGA_TEAMSCALE_PROJECTS);
    const tsaProjects = await settings.getValueList(ExtensionSetting.TSA_TEAMSCALE_PROJECTS);
    teamscaleProjectInput.value = projects.join(separator);
    tgaTeamscaleProjectInput.value = tgaProjects.join(separator);
    TSA_TEAMSCALE_PROJECT_INPUT.value = tsaProjects.join(separator);

    zipTgaConfiguration();
    zipTsaConfiguration();
    VSS.notifyLoadSucceeded();
}

async function loadFindingsBadgeSettings(){
    showFindingsBadgeInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_FINDINGS_BADGE));
    const workItemTypes = await settings.getValueList(ExtensionSetting.FINDINGS_BADGE_TYPES);
    findingsBadgeWorkItemTypesInput.value = workItemTypes.join(separator);
    zipSectionDependingOnCheckbox(showFindingsBadgeInput, findingsBadgeWorkItemTypesWrapper);
}

async function loadTestGapBadgeSettings(){
    showTestGapBadgeInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_TEST_GAP_BADGE));
    const workItemTypes = await settings.getValueList(ExtensionSetting.TEST_GAP_BADGE_TYPES);
    testGapBadgeWorkItemTypesInput.value = workItemTypes.join(separator);
    zipSectionDependingOnCheckbox(showTestGapBadgeInput, testGapBadgeWorkItemTypesWrapper);
}

async function loadTestSmellBadgeSettings(){
    SHOW_TEST_SMELL_BADGE_INPUT.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.SHOW_TEST_SMELL_BADGE));
    const workItemTypes = await settings.getValueList(ExtensionSetting.TEST_SMELL_BADGE_TYPES);
    testSmellBadgeWorkItemTypesInput.value = workItemTypes.join(separator);
    zipSectionDependingOnCheckbox(SHOW_TEST_SMELL_BADGE_INPUT, testSmellBadgeWorkItemTypesWrapper);
}

/**
 * Hides and shows the tga configuration items, depending on whether a separate TGA server should be used.
 */
function zipTgaConfiguration() {
    zipSectionDependingOnCheckbox(useSeparateTestGapServerInput, tgaConfigurationDiv);
}

/**
 * Hides and shows the tsa configuration items, depending on whether a separate TSA server should be used.
 */
function zipTsaConfiguration() {
    zipSectionDependingOnCheckbox(USE_SEPARATE_TEST_SMELL_SERVER_INPUT, TSA_CONFIGURATION_DIV);
}

function zipSectionDependingOnCheckbox(checkbox: HTMLInputElement, section:HTMLDivElement){
    if(checkbox.checked){
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function saveUrlAndProject(teamscaleUrlFormInput: string, teamscaleProjectsFormInput: string, serverUrlKey: string, projectNameKey: string) {
    const teamscaleProjects: string[] = readValueList(teamscaleProjectsFormInput);

    if (teamscaleUrlFormInput.endsWith('/')) {
        teamscaleUrlFormInput = teamscaleUrlFormInput.substring(0, teamscaleUrlFormInput.length - 1);
    }

    logDiv.innerHTML = '';

    settings.save(serverUrlKey, teamscaleUrlFormInput)
        .then(url => createSuccessfulLog('Teamscale URL', url),
                e => createFailedLog('Teamscale URL', e));

    settings.saveValueList(projectNameKey, teamscaleProjects)
        .then(projects => createSuccessfulLog('Teamscale Projects', projects),
                e => createFailedLog('Teamscale Projects', e));
}

function saveBadgeEnablementAndWorkItemTypes(badgeEnablementKey: string, badgeEnablementInput: HTMLInputElement, workItemTypesKey: string, workItemTypesInput: HTMLInputElement, readableBadgeName: string) {
    const badgeEnablementOption = 'Show ' + readableBadgeName + ' Option';
    settings.save(badgeEnablementKey, String(badgeEnablementInput.checked))
        .then(showTestGapBadge => createSuccessfulLog(badgeEnablementOption, showTestGapBadge),
            e => createFailedLog(badgeEnablementOption, e));

    const workItemTypesOption = 'Work Item Types for ' + readableBadgeName;
    const workItemTypes: string[] = readValueList(workItemTypesInput.value);
    settings.saveValueList(workItemTypesKey, workItemTypes).then(workItemTypes => createSuccessfulLog(workItemTypesOption, workItemTypes), e => createFailedLog(workItemTypesOption, e));
}

function readValueList(formInput: string): string[]{
    let values: string[] = formInput.split(separator);
    return values.map(entry => entry.trim()).filter(entry => entry !== '');
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

    settings.save(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER.key, String(useSeparateTestGapServerInput.checked))
        .then(extraTgaServer => createSuccessfulLog('Use Extra Test Gap Server Option', extraTgaServer),
            e => createFailedLog('Use Extra Test Gap Option', e));

    settings.save(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER.key, String(USE_SEPARATE_TEST_SMELL_SERVER_INPUT.checked))
        .then(extraTsaServer => createSuccessfulLog('Use Extra Test Smell Server Option', extraTsaServer),
            e => createFailedLog('Use Extra Test Smell Option', e));

    saveBadgeEnablementAndWorkItemTypes(ExtensionSetting.SHOW_FINDINGS_BADGE.key, showFindingsBadgeInput, ExtensionSetting.FINDINGS_BADGE_TYPES.key, findingsBadgeWorkItemTypesInput, 'Findings Churn Badge');
    saveBadgeEnablementAndWorkItemTypes(ExtensionSetting.SHOW_TEST_GAP_BADGE.key, showTestGapBadgeInput,ExtensionSetting.TEST_GAP_BADGE_TYPES.key, testGapBadgeWorkItemTypesInput, 'Test Gap Badge');
    saveBadgeEnablementAndWorkItemTypes(ExtensionSetting.SHOW_TEST_SMELL_BADGE.key, SHOW_TEST_SMELL_BADGE_INPUT, ExtensionSetting.TEST_SMELL_BADGE_TYPES.key, testSmellBadgeWorkItemTypesInput, 'Test Smell Badge');
}
