# Skyskraber Userscripts

This repository contains userscripts for the Skyskraber chat platform. These scripts enhance the chat experience with automation, hotkeys, and core utilities.

## Scripts

- **skyskraber-core.js**: Core module providing websocket access and indicator management. Required by other scripts.
- **skyskraber-hotkeys.js**: Adds keyboard navigation and hotkeys for fast room movement.
- **skyskraber-auto.js**: Automatically sends a message every 15 minutes while inactive to prevent timeouts.

## Installation

1. **Install a userscript manager**
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **Install the scripts**
   - Download or copy the contents of the desired `.js` files from this repository.
   - In your userscript manager, create a new script and paste the code.
   - Save and enable the script.

3. **Order of scripts**
   - `skyskraber-core.js` must be installed and enabled before the other scripts.
   - `skyskraber-hotkeys.js` and `skyskraber-auto.js` require the core script to function.

## Usage

- **Hotkeys**: Use arrow keys to quickly move between rooms. Enable/disable hotkeys with the indicator button in the chat UI.
- **Auto**: The script will send a sleeping emoji every 15 minutes if you are inactive, keeping your session alive.

## Updating

- Check this repository for updates. Replace the script contents in your userscript manager with the latest version.

## License

MIT License
