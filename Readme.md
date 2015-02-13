# Animated SVG Exporter for Flash Professional#

## To Install ##
- Select latest release from [releases page](https://github.com/TomByrne/Flash2Svg/releases).
- Install with Extension Manager

## To Use in Flash CC / CC 2014 ##
- Open panel through menus, Window > Extensions > SVG Animation
- Open the FLA you wish to use and navigate to the timeline you wish to export
- Select suitable options
- Click export button

## To Use in Flash CS5 / CS5.5 / CS6 ##
- Open panel through menus, Window > Other Panels > SVG
- Open the FLA you wish to use and navigate to the timeline you wish to export
- Select suitable options
- Click export button


### Installation issues ###
If you've installed the plugin but it isn't showing up, it's probably due to language issues with Adobe products. A guide to resolving these issues will be done in the future.

## To build the extension on Windows ##
- Download the [CS6 Signing Toolkit](http://www.adobe.com/devnet/creativesuite/sdk/eula_cs6-signing-toolkit.html)
- Download the [CC Signing toolkit](http://labs.adobe.com/downloads/extensionbuilder3.html)
- Put the contents of both archives into the `build/tools` folder
- Create a p12 certificate and save it to `build/cert.p12`
- Open the `password.txt` file and save the certificate's password in the file (this will be ignored by GIT).
- Run the `build/build.bat` file

To build on other operating systems, the build.bat file will have to be converted, if you do this send me a pull request and I'll add your script into the main repo.