We use [semantic versioning](http://semver.org/):

- MAJOR version when you make incompatible API changes,
- MINOR version when you add functionality in a backwards-compatible manner, and
- PATCH version when you make backwards compatible bug fixes.

# 1.3.8

- [fix] upload task: Does not fail anymore if no files to upload are found

# 1.3.7

- [fix] update third party dependencies
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


