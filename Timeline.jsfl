(function(ext){
	function ExtensibleTimeline(timeline,options){
		if(timeline && timeline instanceof Timeline){
			this.$=timeline;
		}else if(timeline && timeline.$ && timeline.$ instanceof Timeline){
			this.$=timeline.$;
		}else{
			this.$=new Timeline();
		}
		this.cache=new ext.Object({numCubicSegments:new ext.Array()});
		ext.Object.apply(this,[options]);
		return this;
	}
	ExtensibleTimeline.prototype={
		__proto__:ext.Object.prototype,
		$:Timeline,
		type:ExtensibleTimeline,
		//built in methods
		addMotionGuide:function(){
			return this.$.addMotionGuide();
		},
		addNewLayer:function(){
			return this.$.addNewLayer.apply(this.$,arguments);
		},
		clearFrames:function(){
			return this.$.clearFrames.apply(this.$,arguments);
		},
		clearKeyframes:function(){
			return this.$.clearKeyframes.apply(this.$,arguments);
		},
		convertToBlankKeyframes:function(){
			return this.$.convertToBlankKeyframes.apply(this.$,arguments);
		},
		convertToKeyframes:function(startFrameIndex,endFrameIndex){ // accomodates multi-layer conversion
			var args=Array.prototype.slice.call(arguments);
			var ranges;
			if(!(args[0] instanceof Array)){
				ranges=new ext.Array();
				var selected=this.getSelectedFrames();
				if(!startFrameIndex){startFrameIndex=selected[1];}
				if(!endFrameIndex){endFrameIndex=selected[2];}				
				for(var i=0;i<this.layers.length;i++){
					if(i==selected[0]){
						ranges.push([startFrameIndex,endFrameIndex]);
					}else{
						ranges.push([]);	
					}
				}
			}else{
				ranges=args[0];
			}
			for(var i=0;i<ranges.length;i++){
				if(ranges[i].length){
					while(ranges[i].length<2){
						ranges[i].push(this.layers[i].frameCount);
					}
					this.setSelectedLayers(i);
					this.setSelectedFrames(ranges[i][0],ranges[i][1]);
					var frames=this.layers[i].frames;
					if(ext.flashVersion<11){
						for(var n=ranges[i][0];n<ranges[i][1];i++){
							if(frames[n].tweenType=='motion object'){
								frames[n].tweenType='motion';
							}
						}
						this.$.convertToKeyframes(ranges[i][0],ranges[i][1]);
					}else{ // Flash CS5 has bugs in the convertToKeyframes command for motion objects, so we use a workaround.
						for(var n=ranges[i][0];n<ranges[i][1];n++){
							if(frames[n].tweenType!='none' && frames[n].startFrame==n){
								var start=frames[n].startFrame;
								var end=start+frames[n].duration;
								if(frames[n].tweenType=='motion object'){
									var layerName=this.layers[i].name;
									var newLayer=this.addNewLayer('tempLayer','normal',false);
									this.setSelectedLayers(i);
									this.copyFrames(0,this.layers[i].frameCount);
									this.setSelectedLayers(newLayer);
									this.pasteFrames(0,this.layers[i].frameCount);
									for(var d=start;d<end;d++){
										this.setSelectedLayers(i);
										this.setSelectedFrames(d,d);
										this.copyFrames(d,d);
										this.setSelectedLayers(newLayer);
										this.setSelectedFrames(d,d);
										this.pasteFrames(d,d);
									}
									this.copyFrames(start,end);
									this.setSelectedLayers(i);
									this.pasteFrames(start,end);
									this.deleteLayer(newLayer);
									frames=this.layers[i].frames;
								}else{
									this.$.convertToKeyframes(start,end);
									this.$.setFrameProperty('tweenType','none');
								}
							}
						}
					}
				}
			}
		},
		copyFrames:function(){
			return this.$.copyFrames.apply(this.$,arguments);
		},
		copyMotion:function(){
			return this.$.copyMotion();
		},
		copyMotionAsAS3:function(){
			return this.$.copyMotionAsAS3();
		},
		createMotionTween:function(){
			return this.$.createMotionTween.apply(this.$,arguments);
		},
		createMotionObject:function(){return this.$.createMotionObject()},
		cutFrames:function(startFrameIndex,endFrameIndex){return this.$.cutFrames(startFrameIndex,endFrameIndex);},
		deleteLayer:function(index){return this.$.deleteLayer(index);},
		expandFolder:function(bExpand,bRecurseNestedParents,index){return this.$.expandFolder(bExpand,bRecurseNestedParents,index);},
		findLayerIndex:function(name){return this.$.findLayerIndex(name);},
		getFrameProperty:function(property,startFrameIndex,endFrameIndex){return this.$.getFrameProperty(property,startFrameIndex,endFrameIndex);},
		getGuidelines:function(){return this.$.getGuidelines();},
		getLayerProperty:function(property){return this.$.getLayerProperty(property);},
		getSelectedFrames:function(){return this.$.getSelectedFrames();},
		getSelectedLayers:function(){return this.$.getSelectedLayers();},
		insertBlankKeyframe:function(frameNumIndex){return this.$.insertBlankKeyframe(frameNumIndex);},
		insertFrames:function(){
			return this.$.insertFrames.apply(this.$,arguments);
		},
		insertKeyframe:function(frameNumIndex){return this.$.insertKeyframe(frameNumIndex);},
		pasteFrames:function(){
			return this.$.pasteFrames.apply(this.$,arguments);
		},
		pasteMotion:function(){
			return this.$.pasteMotion();
		},
		removeFrames:function(){
			return this.$.removeFrames.apply(this.$,arguments);
		},
		removeMotionObject:function(){
			return this.$.removeMotionObject();
		},
		reorderLayer:function(){
			return this.$.reorderLayer.apply(this.$,arguments);
		},
		reverseFrames:function(){
			return this.$.reverseFrames.apply(this.$,arguments);
		},
		selectAllFrames:function(){return this.$.selectAllFrames();},
		setFrameProperty:function(property,value,startFrameIndex,endFrameIndex){return this.$.setFrameProperty(property,value,startFrameIndex,endFrameIndex);},
		setGuidelines:function(xmlString){return this.$.setGuidelines(xmlString);},
		setLayerProperty:function(property,value,layersToChange){return this.$.setLayerProperty(property,value,layersToChange);},
		setSelectedFrames:function(){
			return this.$.setSelectedFrames.apply(this.$,arguments);
		},
		setSelectedLayers:function(){
			return this.$.setSelectedLayers.apply(this.$,arguments);
		},
		showLayerMasking:function(layer){return this.$.showLayerMasking(layer);},
		startPlayback:function(){return this.$.startPlayback();},
		stopPlayback:function(){return this.$.stopPlayback();},
		//built-in properties
		get currentFrame(){return this.$.currentFrame;},
		set currentFrame(s){this.$.currentFrame=s;},
		get currentFrames(){return this.getFrames({position:this.currentFrame});},
		set currentFrames(s){},		
		get currentLayer(){return this.$.currentLayer;},
		set currentLayer(s){this.$.currentLayer=s;},
		get frameCount(){return this.$.frameCount;},
		set frameCount(s){this.$.frameCount=s;},
		get layerCount(){return this.$.layerCount;},
		get layers(){
			var inputLayers=this.$.layers;
			var layers=new ext.Array();
			for(var i=0;i<inputLayers.length;i++){
				layers.push(new ext.Layer(inputLayers[i],{timeline:this}));
			}
			return layers;
		},
		get name(){return this.$.name;},
		set name(s){this.$.name=s;},
		get libraryItem(){return this.$.libraryItem;},
		set libraryItem(s){this.$.libraryItem=s;},
		//methods
		getKeyframes:function(options){
			var settings=new ext.Object({
				includeHiddenLayers:ext.includeHiddenLayers,
				selected:false,
				includeGuides:false
			});
			settings.extend(options);
			var sel={};
			if(settings.selected){
				var s=this.getSelectedFrames();
				for(var i=0;i<s.length;i+=3){
					if(!sel[String(s[i])]){
						sel[String(s[i])]=[];
					}
					for(var ii=s[i+1];ii<s[i+2];ii++){
						sel[String(s[i])].push(ii);
					}
				}
			}
			var k=new ext.Array();
			var layers=this.layers;
			for(var l=0;l<layers.length;l++){
				if(
					(!settings.selected || sel[String(l)]) &&
					(layers[l].visible || settings.includeHiddenLayers) && 
					(layers[l].layerType!='guide' || settings.includeGuides)
				){
					var frames=layers[l].frames;
					for(var f=0;f<frames.length;f++){
						if(!settings.selected || sel[String(l)].indexOf(f)>-1){
							if(
								f==frames[f].startFrame || 
								(settings.selected && k.indexOf(frames[frames[f].startFrame])<0)
							){
								k.push(new ext.Frame(frames[frames[f].startFrame],{timeline:this}));
							}
						}
					}
				}
			}
			return k;
		},
		getElements:function(options){
			var settings=new ext.Object({
				includeGuides:undefined,
				includeHiddenLayers:ext.includeHiddenLayers,
				frame:undefined,
				frames:undefined
			});
			settings.extend(options);
			var e=new ext.Selection([],{timeline:this});
			var frames;
			if(settings.frames instanceof Array){
				if(settings.frames instanceof ext.Array){
					frames=settings.frames;
				}else{
					frames=new ext.Array(settings.frames);
				}
			}else{
				frames=(
					settings.frame!==undefined?
					this.getFrames({position:settings.frame,includeHiddenLayers:settings.includeHiddenLayers,includeGuides:settings.includeGuides}):
					this.getKeyframes({includeHiddenLayers:settings.includeHiddenLayers,includeGuides:settings.includeGuides})
				);
			}
			frames=frames.reverse();
			for(var k=0;k<frames.length;k++){
				if(frames[k] instanceof Frame){
					frames[k]=new ext.Frame(frames[k],{timeline:this});
				}	
				if(frames[k] && frames[k].$ && frames[k].$ instanceof Frame){
					var fe=frames[k].elements;
					for(var i=0;i<fe.length;i++){
						fe[i].frame=frames[k];
						fe[i].timeline=this;
						fe[i].frame.timeline=this;
					}
					e.extend(fe);
				}
			}
			return e;
		},
		getFrames:function(options){
			var settings=new ext.Object({
				position:null,
				includeHiddenLayers:ext.includeHiddenLayers,
				includeGuides:false
			});
			settings.extend(options);
			var f=new ext.Array();
			var layers=this.layers;
			for(var l=0;l<layers.length;l++){
				if(
					(layers[l].visible || settings.includeHiddenLayers) && 
					(layers[l].layerType!='guide' || settings.includeGuides)
				){
					if(settings.position!==null && layers[l].frameCount>settings.position){
						f.push(layers[l].frames[settings.position]);	
					}else{
						f=f.concat(layers[l].frames);
					}
				}
			}
			return f;	
		},
		//getter properties
		get elements(){
			return this.getElements();
		},
		set elements(){},
		get frames(){
			return this.getFrames();
		},
		get keyframes(){
			return this.getKeyframes({selected:false});
		},
		getNumCubicSegments:function(options){
			var settings=new ext.Object({
				includeGuides:undefined,
				includeHiddenLayers:ext.includeHiddenLayers,
				frame:undefined
			});
			settings.extend(options);
			if(settings.frame && this.cache.numCubicSegments[settings.frame]){
				return this.cache.numCubicSegments[settings.frame];
			}
			var elements=this.getElements(options).expandGroups();
			var numCubicSegments=0;
			for(var i=0;i<elements.length;i++){
				if(elements[i] instanceof ext.SymbolInstance){
					numCubicSegments+=elements[i].getNumCubicSegments({
						includeGuides:settings.includeGuides,
						includeHiddenLayers:settings.includeHiddenLayers,
						frame:elements[i].getCurrentFrame(settings.frame)
					})||0;
				}else{
					numCubicSegments+=elements[i].numCubicSegments||0;
				}
			}
			if(settings.frame){
				this.cache.numCubicSegments[settings.frame]=numCubicSegments;
			}
			return numCubicSegments;
		}
	}
	ext.extend({Timeline:ExtensibleTimeline});
})(extensible);
