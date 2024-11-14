Plugin for Azure DevOps that provides

- Work Item integration that shows Findings Churn and Test Gap badges for each work item
- Dashboard Widget that shows Findings Churn and Test Gap badges for the project
- Pipeline Task to upload coverage, findings, and other reports to Teamscale (located in [reportUploadTask](./reportUploadTask), targets NodeJS)

# Building

We recommend editing with VS Code.

To compile the code:

```bash
npm run build
```

To package as a .vsix:

```bash
npm run package
```

# Testing

## Unit Tests

To run all unit tests:

```bash
npm test
```

## Manual Tests

Please refer to [our wiki](https://cqse.atlassian.net/wiki/spaces/TS/pages/3035267078/K2+Azure+DevOps+Extension+Testing).

# Publishing

To publish the extension publicly, first obtain an access token for our Azure DevOps space.
Log into <https://cqse.visualstudio.com>, then click _User settings_ (icon in the navigation bar) > _Personal access tokens_.
Create a token with these settings:

- Organization: *All accessible organizations*
- all permissions for Marketplace (you need to click _show all scopes_ for this to show up)

Then, create a file called `token` containing this access token in the root directory of the repository.


Before publishing, please update the CHANGELOG.md file and choose a proper version number based on semantic versioning. 
Then, enter that number in both `package.json`, `vss-extension.json`, `reportUploadTask/package.json` and `reportUploadTask/task.json` in the corresponding `version` fields.

```bash
npm run publish
```

On linux you might have to replace every occurrence of `$(npm bin)/tsc` and `$(npm bin)/tfx` in package.json as well as
reportUploadTask/package.json with the local location of `tsc` and `tfx`. If the location is part of your `PATH`
removing `$(npbm bin)/` should suffice.

This will make the built package publicly available on the Marketplace.

# Distributed Binaries

We distribute both [teamscale-upload](https://github.com/cqse/teamscale-upload) and CodeCoverage.exe with this extension to make it work "out of the box" without additional dependencies.

Use [fetch_dependencies.sh](./reportUploadTask/fetch_dependencies.sh) to update the CodeCoverage.exe in the repo.

