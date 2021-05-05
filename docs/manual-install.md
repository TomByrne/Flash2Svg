# Manually installing Flash2Svg

> Before trying this I would recommend trying to install using the ZXP Installer tool, this will give you access to the HTML5-based User Interface, but will still require manual updates.

If you’re having trouble installing Flash2Svg in Flash, here are some instructions to manually install the plugin.
This works in all versions (CS5 – CC 2017, as of writing) but will only give you the older, flash-based UI, not the newer HTML5-based UI.
Also note, the last version of the plugin that is compatible with CS5/CS6 is version 3.36.
This means some of the functionality won’t be there (e.g. embedding assets) but all of the most recent bug fixes will be available.

- Download the [latest ZXP](https://github.com/TomByrne/Flash2Svg/releases)
- Change the file name of the extension from ZXP to ZIP
- Extract the contents of the zip archive
- Copy the SVG.swf and svg-help.xml files from the FLASH folder into this folder:
`C:\Users\{username}\AppData\Local\Adobe\Flash CS5\en_US\Configuration\WindowSWF`
- Copy the Extensible folder (also from the FLASH folder) and copy the whole folder into this folder:
`C:\Users\{username}\AppData\Local\Adobe\Flash CS5\en_US\Configuration\Javascript`

Obviously change the version of flash in those paths to the correct one (e.g. ‘Flash CC 2015’).

Mac is very similar, something like:
```
/Users/{username}/Library/Application Support/Adobe/Flash CS5/…
```

On both systems you’ll probably have to show hidden folders to get there.