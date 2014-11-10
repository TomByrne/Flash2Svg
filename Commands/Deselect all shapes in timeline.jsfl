
function deselectAllFrame(doc, timeline, doneMap) {
	var layers = timeline.layers;
	var otherTimelines = [];
	for(var i=0; i<layers.length; ++i){
		var layer = layers[i];
		var frames = layer.frames;
		var layerSelected = false;
		for(var j=0; j<frames.length; j++){
			var frame = frames[j];
			if(frame.startFrame!=j)continue;

			var elements = frame.elements;
			for(var k=0; k<elements.length; k++){
				var element = elements[k];
				if(element.elementType=="shape"){
					if(!layerSelected){
						timeline.setSelectedLayers(i);
						layerSelected = true;
					}
					timeline.setSelectedFrames(j, j+1);
					doc.selectNone();
					break;

				}else if(element.symbolType!=undefined && !doneMap[element.libraryItem.name]){
					doneMap[element.libraryItem.name] = true;
					otherTimelines.push(element.libraryItem.timeline);
				}
			}
		}
	}
	/*for(var i=0; i<otherTimelines.length; ++i){
		deselectAllFrame(doc, otherTimelines[i], doneMap);
	}*/
}

// Main execution starts here
doc = fl.getDocumentDOM();
var timeline = doc.getTimeline();
var wereSelected = timeline.getSelectedFrames();
deselectAllFrame(doc, timeline, {});
timeline.setSelectedFrames(wereSelected);
