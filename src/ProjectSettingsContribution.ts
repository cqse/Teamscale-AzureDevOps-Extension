/**
 * Contribution for the project settings consisting of the Teamscale URLs, projects and work item badge configurations.
 */
import {ProjectSettings} from './Settings/ProjectSettings';
import {Scope} from './Settings/Scope';
import {getCurrentTimestamp} from './Utils/UiUtils';
import UiUtils = require('./Utils/UiUtils');
import {ExtensionSetting} from "./Settings/ExtensionSetting";

let settings: ProjectSettings = null;

const saveButtonElement = document.getElementById('save-button') as HTMLButtonElement;
const logDiv = document.getElementById('log') as HTMLDivElement;

const teamscaleUrlInput = document.getElementById('teamscale-url') as HTMLInputElement;
const teamscaleProjectInput = document.getElementById('teamscale-project') as HTMLInputElement;

const useSeparateTestGapServerInput = document.getElementById('use-extra-tga-server') as HTMLInputElement;
const tgaConfigurationDiv = document.getElementById('extra-tga-configuration') as HTMLDivElement;
const tgaTeamscaleUrlInput = document.getElementById('tga-teamscale-url') as HTMLInputElement;
const tgaTeamscaleProjectInput = document.getElementById('tga-teamscale-project') as HTMLInputElement;

const useSeparateTestSmellServerInput = document.getElementById('use-extra-tsa-server') as HTMLInputElement;
const tsaConfigurationDiv = document.getElementById('extra-tsa-configuration') as HTMLDivElement;
const tsaTeamscaleUrlInput = document.getElementById('tsa-teamscale-url') as HTMLInputElement;
const tsaTeamscaleProjectInput = document.getElementById('tsa-teamscale-project') as HTMLInputElement;

const showTestGapBadgeInput = document.getElementById('show-work-item-tga-badge') as HTMLInputElement;
const testGapBadgeWorkItemTypesInput = document.getElementById('tga-badge-work-item-types') as HTMLInputElement;
const testGapBadgeWorkItemTypesWrapper = document.getElementById('tga-badge-work-item-types-wrapper') as HTMLDivElement;

const showFindingsBadgeInput = document.getElementById('show-work-item-tqe-badge') as HTMLInputElement;
const findingsBadgeWorkItemTypesInput = document.getElementById('tqe-badge-work-item-types') as HTMLInputElement;
const findingsBadgeWorkItemTypesWrapper = document.getElementById('tqe-badge-work-item-types-wrapper') as HTMLDivElement;

const showTestSmellBadgeInput = document.getElementById('show-work-item-tsa-badge') as HTMLInputElement;
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
    await loadDefaultServerSettings();
    await loadTgaServerSettings();
    await loadTsaServerSettings();

    await loadFindingsBadgeSettings();
    await loadTestGapBadgeSettings();
    await loadTestSmellBadgeSettings();

    VSS.notifyLoadSucceeded();
}

async function loadDefaultServerSettings() {
    await loadServerSettings(teamscaleUrlInput, teamscaleProjectInput, ExtensionSetting.TEAMSCALE_URL, ExtensionSetting.TEAMSCALE_PROJECTS);
}

async function loadTgaServerSettings() {
    await loadServerSettings(tgaTeamscaleUrlInput, tgaTeamscaleProjectInput, ExtensionSetting.TGA_TEAMSCALE_URL, ExtensionSetting.TGA_TEAMSCALE_PROJECTS);
    useSeparateTestGapServerInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER));
    zipAndHookSectionDependingOnCheckbox(useSeparateTestGapServerInput, tgaConfigurationDiv);
}

async function loadTsaServerSettings() {
    await loadServerSettings(tsaTeamscaleUrlInput, tsaTeamscaleProjectInput, ExtensionSetting.TSA_TEAMSCALE_URL, ExtensionSetting.TSA_TEAMSCALE_PROJECTS);
    useSeparateTestSmellServerInput.checked = UiUtils.convertToBoolean(await settings.get(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER));
    zipAndHookSectionDependingOnCheckbox(useSeparateTestSmellServerInput, tsaConfigurationDiv);
}

async function loadServerSettings(serverUrlInput: HTMLInputElement, projectNamesInput: HTMLInputElement,
                                  serverUrlSetting: ExtensionSetting, projectNamesSetting: ExtensionSetting): Promise<void> {
    serverUrlInput.value = await settings.get(serverUrlSetting);
    const projectNames = await settings.getValueList(projectNamesSetting);
    projectNamesInput.value = projectNames.join(separator);
}

async function loadFindingsBadgeSettings(){
    await loadBadgeSettings(showFindingsBadgeInput, findingsBadgeWorkItemTypesInput, findingsBadgeWorkItemTypesWrapper,
        ExtensionSetting.SHOW_FINDINGS_BADGE, ExtensionSetting.FINDINGS_BADGE_TYPES);
}

async function loadTestGapBadgeSettings(){
    await loadBadgeSettings(showTestGapBadgeInput, testGapBadgeWorkItemTypesInput, testGapBadgeWorkItemTypesWrapper,
        ExtensionSetting.SHOW_TEST_GAP_BADGE, ExtensionSetting.TEST_GAP_BADGE_TYPES);
}

async function loadTestSmellBadgeSettings(){
    await loadBadgeSettings(showTestSmellBadgeInput, testSmellBadgeWorkItemTypesInput, testSmellBadgeWorkItemTypesWrapper,
        ExtensionSetting.SHOW_TEST_SMELL_BADGE, ExtensionSetting.TEST_SMELL_BADGE_TYPES);
}

async function loadBadgeSettings(enablementCheckbox: HTMLInputElement, workItemTypesInput: HTMLInputElement, workItemTypesWrapper: HTMLDivElement,
                                 enablementSetting: ExtensionSetting, workItemTypesSetting: ExtensionSetting): Promise<void> {
    enablementCheckbox.checked = UiUtils.convertToBoolean(await settings.get(enablementSetting));
    const workItemTypes = await settings.getValueList(workItemTypesSetting);
    workItemTypesInput.value = workItemTypes.join(separator);
    zipAndHookSectionDependingOnCheckbox(enablementCheckbox, workItemTypesWrapper);
}

function zipAndHookSectionDependingOnCheckbox(checkbox: HTMLInputElement, section:HTMLDivElement){
    zipSectionDependingOnCheckbox(checkbox, section);
    checkbox.onchange = () => zipSectionDependingOnCheckbox(checkbox, section);
}

function zipSectionDependingOnCheckbox(checkbox: HTMLInputElement, section:HTMLDivElement){
    if(checkbox.checked){
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

/**
 * Saves the entered TS Servers, Project values and work item badge configurations to the Project settings.
 */
function saveFormValues() {
    logDiv.innerHTML = '';

    saveDefaultServerSettings();
    saveTgaServerSettings();
    saveTsaServerSettings();

    saveFindingsBadgeSettings();
    saveTgaBadgeSettings();
    saveTsaBadgeSettings();
}

function saveDefaultServerSettings() {
    const serverName = 'Default Server';
    saveServerUrl(ExtensionSetting.TEAMSCALE_URL.key, teamscaleUrlInput.value, serverName);
    saveProjectNames(ExtensionSetting.TEAMSCALE_PROJECTS.key, teamscaleProjectInput.value, serverName);
}

function saveTgaServerSettings() {
    const serverName = 'Test Gap Server';
    saveServerUrl(ExtensionSetting.TGA_TEAMSCALE_URL.key, tgaTeamscaleUrlInput.value, serverName);
    saveProjectNames(ExtensionSetting.TGA_TEAMSCALE_PROJECTS.key, tgaTeamscaleProjectInput.value, serverName);
    saveServerEnablement(ExtensionSetting.USE_SEPARATE_TEST_GAP_SERVER.key, useSeparateTestGapServerInput.checked, serverName);
}

function saveTsaServerSettings() {
    const serverName = 'Test Smell Server';
    saveServerUrl(ExtensionSetting.TSA_TEAMSCALE_URL.key, tsaTeamscaleUrlInput.value, serverName);
    saveProjectNames( ExtensionSetting.TSA_TEAMSCALE_PROJECTS.key, tsaTeamscaleProjectInput.value, serverName);
    saveServerEnablement(ExtensionSetting.USE_SEPARATE_TEST_SMELL_SERVER.key, useSeparateTestSmellServerInput.checked, serverName);
}

function saveServerUrl(serverUrlKey: string, teamscaleUrlFormInput: string, readableServerName: string) {
    if (teamscaleUrlFormInput.endsWith('/')) {
        teamscaleUrlFormInput = teamscaleUrlFormInput.substring(0, teamscaleUrlFormInput.length - 1);
    }
    const urlOption = 'Teamscale URL for ' + readableServerName;
    settings.save(serverUrlKey, teamscaleUrlFormInput)
        .then(url => createSuccessfulLog(urlOption, url),
            e => createFailedLog(urlOption, e));
}

function saveProjectNames(projectNameKey: string, teamscaleProjectsFormInput: string, readableServerName: string) {
    const teamscaleProjects: string[] = readValueList(teamscaleProjectsFormInput);
    const projectOption = 'Teamscale Projects for ' + readableServerName;
    settings.saveValueList(projectNameKey, teamscaleProjects)
        .then(projects => createSuccessfulLog(projectOption, projects),
            e => createFailedLog(projectOption, e));
}

function saveServerEnablement(enablementKey: string, isEnabled: boolean, readableServerName: string) {
    const enablementOption = 'Use Extra ' + readableServerName + ' Option';
    settings.save(enablementKey, String(isEnabled))
        .then(extraTsaServer => createSuccessfulLog(enablementOption, extraTsaServer),
            e => createFailedLog(enablementOption, e));
}

function saveFindingsBadgeSettings() {
    const badgeName = 'Findings Churn Badge';
    saveBadgeEnablement(ExtensionSetting.SHOW_FINDINGS_BADGE.key, showFindingsBadgeInput, badgeName)
    saveBadgeWorkItemTypes(ExtensionSetting.FINDINGS_BADGE_TYPES.key, findingsBadgeWorkItemTypesInput, badgeName);
}

function saveTgaBadgeSettings() {
    const badgeName = 'Test Gap Badge';
    saveBadgeEnablement(ExtensionSetting.SHOW_TEST_GAP_BADGE.key, showTestGapBadgeInput, badgeName);
    saveBadgeWorkItemTypes(ExtensionSetting.TEST_GAP_BADGE_TYPES.key, testGapBadgeWorkItemTypesInput, badgeName);
}

function saveTsaBadgeSettings() {
    const badgeName = 'Test Smell Badge';
    saveBadgeEnablement(ExtensionSetting.SHOW_TEST_SMELL_BADGE.key, showTestSmellBadgeInput, badgeName)
    saveBadgeWorkItemTypes(ExtensionSetting.TEST_SMELL_BADGE_TYPES.key, testSmellBadgeWorkItemTypesInput, badgeName);
}

function saveBadgeEnablement(badgeEnablementKey: string, badgeEnablementInput: HTMLInputElement, readableBadgeName: string) {
    const badgeEnablementOption = 'Show ' + readableBadgeName + ' Option';
    settings.save(badgeEnablementKey, String(badgeEnablementInput.checked))
        .then(showTestGapBadge => createSuccessfulLog(badgeEnablementOption, showTestGapBadge),
            e => createFailedLog(badgeEnablementOption, e));
}

function saveBadgeWorkItemTypes(workItemTypesKey: string, workItemTypesInput: HTMLInputElement, readableBadgeName: string) {
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
