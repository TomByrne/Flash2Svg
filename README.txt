Extensible JSFL Library for Flash Professional
David Belais 2010
http://dissentgraphics.com

*Extensible is a javascript library for Flash Professional CS4 & CS5.

Extensible provides wrappers for flash-specific classes used in 
Flash Professional's Spydermonkey implementation which are, unlike the
built-in classes, extensible.

In order to remain unobtrusive, Extensible avoids modification of built-in's
like Array and Object, instead appending new classes to the global object
'extensible', usually aliased as 'ext' for brevity.

The naming convention put each class in a file of the same name, so the
definition for 'extensible.Array' is located under
'Javascript/Extensible/Array.jsfl'.

The build script 'build.jsfl' references any '.mxi' files in the same directory,
and pushes the associated files to all present flash installations for ease of testing.

*Flash to SVG ( flash2svg ) *WIP

Flash to SVG exports SVG images directly from Flash. After
installing flash2svg.mxi, it can be accessed from 'Windows > Other Panels > SVG'.
Currently only still images and sequences are supported, however animated output is in development.

*In Place Cut, Copy, & Paste ( inPlaceClipboard.mxi )

Works just like "copy" or "cut" + "paste in place", but relative to the root timeline
in the current view. For use in copying elements from one timeline (symbol) while in 
'edit-in-place' mode, in order to paste them into another symbol or into the root timeline,.
while maintaining the same global transformations.
