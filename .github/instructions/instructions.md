# Copilot Instructions for Skyskraber Repository

This file defines the coding standards and rules for GitHub Copilot and all contributors working on the Skyskraber userscripts project.

## General Code Guidelines

- Write clear, maintainable, and well-structured code.
- Use consistent formatting and indentation throughout all files.
- Add comments where necessary to explain complex logic or important decisions.
- Remove unused code and obsolete comments during refactoring.
- Prefer readability and simplicity over cleverness.
- Use descriptive variable and function names.
- Ensure all scripts are compatible with the userscript managers and the Skyskraber platform.

## Copilot-Specific Rules

- Always update the `@version` field and any version references in each changed file before every push to the main branch.
- Do not leave placeholder or commented-out code in production files.
- When removing a feature, remove all related code and documentation, not just disable it.
- Do not add documentation about removed features unless specifically requested.
- When editing files, avoid repeating unchanged code in pull requests; use concise diffs.
- If a change affects usage or installation, update the README and instructions accordingly.
- Ensure that all scripts remain functional and error-free after each change (run linting/tests if available).
- Use MIT license for all scripts and contributions.

## Commit and PR Guidelines

- Write clear, descriptive commit messages summarizing the change.
- Group related changes in a single commit when possible.
- Reference issues or feature requests in commit messages when relevant.
- Do not push directly to main unless changes are reviewed or trivial (e.g., version bump, typo fix).

## Versioning

- Every change to a script must increment its `@version` metadata and any in-code version references.
- Version numbers should follow semantic versioning (MAJOR.MINOR.PATCH).

## Support and Questions

- For questions or issues, open an issue in this repository.
- For Copilot-specific instructions or updates, edit this file.
