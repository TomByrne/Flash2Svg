set /p password=<password.txt
set /p version=<version.txt
set timeserver=http://timestamp.digicert.com/

del MXI /Q
del MXI /Q /S
rd MXI /Q /S

del HTML /Q
del HTML /Q /s
rd HTML /Q /S

mkdir MXI\FLASH

echo f | xcopy "..\flash\SVG.swf" "MXI\FLASH\SVG.swf" /Y
echo f | xcopy "..\flash\svg-help.xml" "MXI\FLASH\svg-help.xml" /Y
xcopy "../html/ExtensionContent/Extensible" "MXI/FLASH/Extensible" /S /Y /i

mkdir HTML
mkdir HTML\CSXS
mkdir MXI\HTML

xcopy /s "..\html\ExtensionContent" HTML

call repl.bat "{version}" "%version%" L < "html-manifest.xml" >"HTML\CSXS\manifest.xml"

tools\ZXPSignCmd -sign HTML "MXI\HTML\org.tbyrne.SvgAnimationForFlash.zxp" cert.p12 %password% -tsa %timeserver%

echo f | xcopy "..\bundle\icon.png" "MXI\icon.png" /Y

xcopy "..\build\metainfo" MXI
call repl.bat "{version}" "%version%" L < "bundle.mxi" >"MXI\org.tbyrne.SvgAnimationForFlash.mxi"
java -jar tools\ucf.jar -package -storetype PKCS12 -keystore cert.p12 -storepass %password% -tsa %timeserver% "../bin/Flash2Svg v%version%.zxp" -C MXI .


del MXI /Q
del MXI /Q /S
rd MXI /Q /S

del HTML /Q
del HTML /Q /s
rd HTML /Q /S



pause