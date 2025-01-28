import { Scope } from './Scope';
import { Settings } from './Settings';
import {ExtensionDataService} from "VSS/SDK/Services/ExtensionData";

/**
 * Extends the Settings class to be able to save project specific settings.
 * Note that this is done on the scope of this extension and is not supported by VSS, meaning that settings are still
 * visible to all users of the Organization => Do not save sensitive data with this!
 */
export class ProjectSettings extends Settings {

    private readonly project: string;

    constructor(scope: Scope, project: string) {
        super(scope);
        this.project = project;
    }

    /**
     * Saves a key value pair in Azure DevOps.
     */
    public save(key: string, value: string): PromiseLike<string> {
        return super.save(this.getProjectSpecificKey(key), value);
    }

    /**
     * Gets a value by key from Azure DevOps.
     */
    public getOrDefault(key: string, existingSettings : Map<string, string>, defaultValue: string): string {
        const settingKey = this.getProjectSpecificKey(key);
        if(existingSettings.has(settingKey)){
            return existingSettings.get(settingKey);
        }
        return defaultValue;
    }

    /** Fetches and returns the stored project settings. */
    public async loadStoredProjectSettings(): Promise<Map<string, string>> {
        const storedSettingsMap = new Map<string, string>();
        const projectPrefix = this.project.substring(0, 30) + '-';
        const dataService: ExtensionDataService = await VSS.getService(VSS.ServiceIds.ExtensionData);
        const allDocs = await dataService.getDocuments('$settings', {scopeType: this.scope});
        allDocs.map(doc => {
            const id: string = doc.id;
            if(id.startsWith(projectPrefix)) {
                storedSettingsMap.set(doc.id, doc.value)
            }
        });
        return storedSettingsMap;
    }

    /**
     * Saves a list of project names to the given key in Azure DevOps.
     */
    public saveProjectsList(key: string, value: string[]): PromiseLike<string> {
        return super.save(this.getProjectSpecificKey(key), JSON.stringify(value));
    }

    /**
     * Gets a list of project names stored under the given key in Azure DevOps.
     */
    public getProjectsList(key: string): PromiseLike<string[]> {
        return super.get(this.getProjectSpecificKey(key)).then(stringifiedProjects => {
            try {
                return JSON.parse(stringifiedProjects);
            } catch (e) {
                return [stringifiedProjects];
            }
        });
    }

    private getProjectSpecificKey(key: string): string {
        // storing too long key does currently not work in ADOS so truncating here
        return `${this.project.substring(0, 30)}-${key}`;
    }
}
