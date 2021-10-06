import { Scope } from './Scope';
import { Settings } from './Settings';

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
    public get(key: string): PromiseLike<string> {
        return super.get(this.getProjectSpecificKey(key));
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
        return `${this.project.substr(0, 30)}-${key}`;
    }
}
