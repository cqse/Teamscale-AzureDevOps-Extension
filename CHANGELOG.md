We use [semantic versioning](http://semver.org/):

- MAJOR version when you make incompatible API changes,
- MINOR version when you add functionality in a backwards-compatible manner, and
- PATCH version when you make backwards compatible bug fixes.

# 1.4.4
- [fix] updated third party dependencies to recent versions

# 1.4.3
- [fix] project settings could not be opened due to `DocumentCollectionDoesNotExistException` when no settings had been stored before
- [fix] updated third party dependencies to recent versions

# 1.4.2
- upload task: added support for Node 20 runners and dropped support for end-of-life Node 6 runners
- [fix] updated third party dependencies to recent versions

# 1.4.1
- [fix] `DocumentDoesNotExistException` when fetching the configured settings in some cases

# 1.4.0
- removed obsolete pull request integration. Please use the [built-in Teamscale pull request integration](https://docs.teamscale.com/howto/connecting-version-control-system/azure-devops-git/) instead.
- [fix] updated third party dependencies to recent versions
- [fix] dashboard widget configuration could not be edited

# 1.3.12
- [fix] upload task: improved logging
- [fix] upload task: ant pattern also matched the upload directory
- [fix] updated third party dependencies to recent versions
- [fix] replaced legacy Teamscale API calls with new ones

# 1.3.11
- [fix] upload task failed when the number of reports was very large

# 1.3.10
- [fix] upload task was not updated to most recent version

# 1.3.8

- [fix] upload task: Does not fail anymore if no files to upload are found
- [fix] updated third party dependencies to recent versions

# 1.3.7

- [fix] updated third party dependencies to recent versions
- [fix] replaced binaries for teamscale-upload with an up-to-date version (9.2.1) 

# 1.3.6

- [feature] support spec-item findings badge
- [feature] upload task: set sensible default file pattern that works for the `DotNetCoreCLI` pipeline task

# 1.3.5
- [fix] updated third-party dependencies to recent versions

# 1.3.4
- [fix] updated third-party dependencies to recent versions

# 1.3.3
- [fix] pull request integration: missing permissions for a project could lead to findings not being displayed for pull requests of another project

# 1.3.2
- [fix] work item integration: the test gap badge for work items was sometimes different from the badge shown in the Teamscale issue perspective

# 1.3.0

- [feature] upload task: use the [teamscale-upload](https://github.com/cqse/teamscale-upload) tool instead of curl for better certificate and error handling

# 1.2.7

This and previous versions had no CHANGELOG yet.


