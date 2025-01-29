import { Scope } from './Scope';
import { Settings } from './Settings';
import {ExtensionSetting} from "./ExtensionSetting";

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
     *  Gets the stored value for the given extension setting from Azure DevOps for the current project. If no value is
     *  stored, the setting's default value is returned.
     */
    public async get(setting: ExtensionSetting): Promise<string> {
        const projectSpecificSetting = new ExtensionSetting(this.getProjectSpecificKey(setting.key), setting.defaultValue);
        return super.get(projectSpecificSetting);
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
    public async getProjectsList(setting: ExtensionSetting): Promise<string[]> {
       const projects = await this.get(setting);
        try {
            return JSON.parse(projects);
        } catch (e) {
            return [projects];
        }
    }

    private getProjectSpecificKey(key: string): string {
        // storing too long key does currently not work in ADOS so truncating here
        return `${this.project.substring(0, 30)}-${key}`;
    }
}
