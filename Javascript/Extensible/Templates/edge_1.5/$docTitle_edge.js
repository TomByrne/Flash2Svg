/**
 * Adobe Edge: symbol definitions
 */
(function($, Edge, compId){
//images folder
var im='images/';

var fonts = {};


var resources = [
];
var symbols = {
"stage": {
   version: "1.5.0",
   baseState: "",
   variables: {
   },
   content: {
      dom: [],
      defaultWrapper: "",
   },
   effectors: {
   },
   states: {
      "Base State": {
      },
   },
   timelines: {
      "Default Timeline": {
         fromState: "Base State",
         toState: "",
         duration: 0,
         autoPlay: true,
         timeline: [
         ]
      }
   }
}
$$timelineStart
,
"$timelineTitle": {
   version: "1.5.0",
   minimumCompatibleVersion: "1.5.0",
   build: "1.5.0.217",
   baseState: "Base State",
   initialState: "Base State",
   gpuAccelerate: false,
   resizeInstances: false,
   content: {
   dom: [
   $$layerStart
   {
      id: '$layerTitle',
      $if=layerImage$
      type: 'image',
      rect: ['0px','0px','$layerWidthpx','$layerHeightpx','auto','auto'],
      fill: ['rgba(0,0,0,0)','images/$layerFile.svg','0px','0px']
      $endif

      $if=layerSymbol$
      type: 'rect',
      rect: ['0px','0px','auto','auto','auto','auto']
      $endif
   }$loopComma
   $$layerEnd
   ],
   symbolInstances: [
      $$timelineStart
      {
         id: '$timelineTitle',
         symbolName: '$timelineName'
      }$loopComma
      $$timelineEnd
   ]
   },
   states: {
      "Base State": {
         $$layerStart
         "${_$layerTitle}": [
            ["style", "left", '$layerXpx'],
            ["style", "top", '$layerYpx']
         ]$loopComma
         $$layerEnd
      }
   },
   timelines: {
      "Default Timeline": {
         fromState: "Base State",
         toState: "",
         duration: $timelineDur,
         autoPlay: true,
         timeline: [
            $$keyframeStart
            { id: "eid$keyframeIndex", tween: [ "style", "${$layerTitle}", 
               $$propStart
               "$propTitle", '$propValuepx',
               $$propEnd
            /*{ fromValue: '0px'}*/], position: $keyframeStart, duration: $keyframeDur }$loopComma
            $$keyframeEnd
         ]
      }
   }
}
$$timelineEnd
};


Edge.registerCompositionDefn(compId, symbols, fonts, resources);

/**
 * Adobe Edge DOM Ready Event Handler
 */
$(window).ready(function() {
     Edge.launchComposition(compId);
});
})(jQuery, AdobeEdge, "$docTitle");
