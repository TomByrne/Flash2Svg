# Animated SVG Exporter for Flash Professional#

## For CS5 - CS6 compatibility use the flash-based extension ##

### To Install ###
- Select latest release from [releases page](https://github.com/TomByrne/Flash2Svg/releases).
- Download 'CS' extension installer (i.e. not CC installer)
- Install with extension manager

### To Use ###
- Open panel through menus, Window > Other Panels > SVG
- Open the FLA you wish to use and navigate to the timeline you wish to export
- Select suitable options
- Click export button

### To Build From Source ###
- Double clicking on the `flash2svg.mxi` file in the root of the repo should open Extension Manager CS6 and begin the packaging process.
- Otherwise, manually open Extension Manager CS6 and select File > Package ZXP Extension.
- To package an MXP file (for older versions of Flash Pro) use Extension Manager CS5.

Note, this extension will also work on CC versions of Flash Pro but the user interface is worse and it will eventually be discontinued.

## For CC compatibility use the html-based extension ##

### To Install ###
- Select latest release from [releases page](https://github.com/TomByrne/Flash2Svg/releases).
- Download 'CC' extension installer (i.e. not CS installer)
- Install with extension manager

### To Use ###
- Open panel through menus, Window > Extensions > SVG Animation
- Open the FLA you wish to use and navigate to the timeline you wish to export
- Select suitable options
- Click export button

### To Build From Source ###
- Import the Project into [Extension Builder 3](http://labs.adobe.com/technologies/extensionbuilder3/)
- Right-click on the project in the Script Explorer panel and select `Export`
- Select the Extension Builder 3 > Application Extension export type
