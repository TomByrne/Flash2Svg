(function(ext){
	/*
	 * extensible.Timeline pseudo-extends Timeline
	 * @this {extensible.Timeline}
	 * @extends extensible.Object
	 * @extends Timeline
	 * @see Timeline
	 * @constructor
	 * @param {Object} options
	 */
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
		/*
		 * @final
		 */
		type:ExtensibleTimeline,
		/*
		 * @see Timeline.addMotionGuide
		 */
		addMotionGuide:function(){
			return this.$.addMotionGuide();
		},
		/*
		 * @see Timeline.addNewLayer
		 */
		addNewLayer:function(){
			return this.$.addNewLayer.attempt(this.$,arguments);
		},
		/*
		 * @see Timeline.clearFrames
		 */
		clearFrames:function(){
			return this.$.clearFrames.attempt(this.$,arguments);
		},
		/*
		 * @see Timeline.clearKeyframes
		 */
		clearKeyframes:function(){
			return this.$.clearKeyframes.attempt(this.$,arguments);
		},
		/*
		 * @see Timeline.convertToBlankKeyframes
		 */
		convertToBlankKeyframes:function(){
			return this.$.convertToBlankKeyframes.attempt(this.$,arguments);
		},
		/*
		 * extensible.Timeline.convertToKeyframes() can accept the same arguments as  Timeline.convertToKeyframes(),
		 * or may accept an array of argument list arrays, in which the indices correspond to the
		 * layers indices. The index corresponding to a layer which is not to be modified should be 
		 * null,undefined or empty (length==0).
		 * convertToKeyframes also implements a workaround for Flash Professional CS5, wherein the
		 * corresponding Timeline.convertToKeyframes() method does not work on Motion Objects.
		 * @see Timeline.convertToKeyframes
		 * @param {Number} startFrameIndex
		 * @param {Number} endFrameIndex  ( optional )
		 */
		convertToKeyframes:function(startFrameIndex,endFrameIndex){
			var args=Array.prototype.slice.call(arguments);
			var ranges;
			var origSel=ext.sel;
			ext.doc.selectNone();
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
					}else{ // Flash CS5 workaround for motions objects
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
			ext.sel=origSel;
			return true;
		},
		/*
		 * @see Timeline#copyFrames
		 * @see http://help.adobe.com/en_US/flash/cs/extend/WS5b3ccc516d4fbf351e63e3d118a9024f3f-782d.html
		 */
		copyFrames:function(){
			return this.$.copyFrames.attempt(this.$,arguments);
		},
		/*
		 * @see Timeline#copyMotion
		 * @link http://help.adobe.com/en_US/flash/cs/extend/WS5b3ccc516d4fbf351e63e3d118a9024f3f-7f1b.html
		 */
		copyMotion:function(){
			return this.$.copyMotion();
		},
		/*
		 * @see Timeline.copyMotionAsAS3
		 */
		copyMotionAsAS3:function(){
			return this.$.copyMotionAsAS3();
		},
		/*
		 * @see Timeline.createMotionTween
		 */
		createMotionTween:function(){
			return this.$.createMotionTween.attempt(this.$,arguments);
		},
		/*
		 * @see Timeline.createMotionObject
		 */
		createMotionObject:function(){
			return this.$.createMotionObject();
		},
		cutFrames:function(startFrameIndex,endFrameIndex){
			return this.$.cutFrames(startFrameIndex,endFrameIndex);
		},
		deleteLayer:function(index){
			return this.$.deleteLayer(index);
		},
		expandFolder:function(bExpand,bRecurseNestedParents,index){
			return this.$.expandFolder(bExpand,bRecurseNestedParents,index);
		},
		findLayerIndex:function(name){
			return this.$.findLayerIndex(name);
		},
		getFrameProperty:function(property,startFrameIndex,endFrameIndex){
			return this.$.getFrameProperty(property,startFrameIndex,endFrameIndex);
		},
		getGuidelines:function(){
			return this.$.getGuidelines();
		},
		getLayerProperty:function(property){
			return this.$.getLayerProperty(property);
		},
		getSelectedFrames:function(){
			return new ext.Array(this.$.getSelectedFrames());
		},
		getSelectedLayers:function(){
			return new ext.Array(this.$.getSelectedLayers());
		},
		insertBlankKeyframe:function(frameNumIndex){
			return this.$.insertBlankKeyframe(frameNumIndex);
		},
		insertFrames:function(){
			return this.$.insertFrames.attempt(this.$,arguments);
		},
		insertKeyframe:function(frameNumIndex){
			return this.$.insertKeyframe(frameNumIndex);
		},
		pasteFrames:function(){
			return this.$.pasteFrames.attempt(this.$,arguments);
		},
		pasteMotion:function(){
			return this.$.pasteMotion();
		},
		removeFrames:function(){
			return this.$.removeFrames.attempt(this.$,arguments);
		},
		removeMotionObject:function(){
			return this.$.removeMotionObject();
		},
		reorderLayer:function(){
			return this.$.reorderLayer.attempt(this.$,arguments);
		},
		reverseFrames:function(){
			return this.$.reverseFrames.attempt(this.$,arguments);
		},
		selectAllFrames:function(){
			return this.$.selectAllFrames();
		},
		setFrameProperty:function(property,value,startFrameIndex,endFrameIndex){
			return this.$.setFrameProperty(property,value,startFrameIndex,endFrameIndex);
		},
		setGuidelines:function(xmlString){
			return this.$.setGuidelines.attempt(this,arguments);
		},
		setLayerProperty:function(property,value,layersToChange){
			return this.$.setLayerProperty.attempt(this,arguments);
		},
		setSelectedFrames:function(){
			var args=Array.prototype.slice.call(arguments);
			var sLayers=this.getSelectedLayers();
			var selectionList=new ext.Array([]);
			var i;
			var bReplaceCurrentSelection=true;
			if(args[0] instanceof Array){
				selectionList=args[0];
				if(args[1]!==undefined){
					bReplaceCurrentSelection=args[1];
				}
				for(var n=0;n<selectionList.length-2;n+=3){
					if(selectionList[n+1]==selectionList[n+2]){
						selectionList[n+2]+=1;
					}
				}
			}else if(typeof(args[0])=='number'){
				if(args[2]!==undefined){
					bReplaceCurrentSelection=args[2];
				}
				var start=args[0];
				var end=start+1;
				if(typeof(args[1])=='number'){
					if(args[1]==0){
						return;
					}else if(args[1]!=start){
				 		end=args[1];
					}
				}
				for(i=0;i<sLayers.length;i++){
					selectionList.push(sLayers[i]);
					selectionList.push(start);
					if(end>-1){
						selectionList.push(end);
					}else{
						selectionList.push(this.layers[sLayers[i]].frameCount);
					}
				}
			}else{
				return;	
			}
			var llocked=[];
			for(i=0;i<this.layerCount;i++){
				llocked[i]=this.layers[i].locked;
				this.layers[i].locked=false;
			}
			var result,e;
			var success,poo;
			for(i=0;i<2999;i++){
				success=false;
				try{
					result=this.$.setSelectedFrames(selectionList.$,bReplaceCurrentSelection);
				}catch(e){}
				var selected=this.$.getSelectedFrames();
				if(selected.length==0){
					continue;
				}else if(bReplaceCurrentSelection){
					selected=new ext.Array(selected);
					if(selected.is(selectionList)){
						success=true;
						break;
					}
				}else{
					success=false;
					for(var n=0;n<selectionList.length-2;n+=3){
						if(
							this.layers[selectionList[n]].frameCount<selectionList[n+1]
						){
							success=true;
							fl.trace(this.layers[selectionList[n]].frameCount);
							continue;
						}
						success=false;
						for(var ii=0;ii<selected.length-2;ii+=3){
							if(
								selected[ii]==selectionList[n] &&
								selected[ii+1]==selectionList[n+1] &&
								(
									selected[ii+2]==selectionList[n+2] ||
									(
										this.layers[selectionList[n]].frameCount<selectionList[n+2] &&
										selected[ii+2]==this.layers[selectionList[n]].frameCount
									)
								)
							){
								success=true;
								break;
							}
						}
						if(!success){
							break;
						}
					}		
					if(success){
						break;	
					}
				}
			}
			for(i=0;i<this.layerCount;i++){
				this.layers[i].locked=llocked[i];
			}
			return result;
		},
		setSelectedLayers:function(index,bReplaceCurrentSelection){
			if(
				index==undefined ||
				index>this.layerCount-1
			){
				return;	
			}
			var llocked=this.layers[index].locked;
			this.layers[index].locked=false;
			var result;
			var success=true;
			var e;
			for(var i=0;this.getSelectedLayers().indexOf(index)<0 && i<100;i++){
				try{
					result=this.$.setSelectedLayers(index,bReplaceCurrentSelection);
					success=true;
				}catch(e){
					success=false;
				}
			}
			if(!success){
				throw new Error('setSelectedLayers Error '+e);	
			}
			this.layers[index].locked=llocked;
			return result;
		},
		showLayerMasking:function(){
			return this.$.showLayerMasking.attempt(this,arguments);
		},
		startPlayback:function(){
			return this.$.startPlayback();
		},
		stopPlayback:function(){
			return this.$.stopPlayback();
		},
		get currentFrame(){
			return this.$.currentFrame;
		},
		set currentFrame(s){
			this.$.currentFrame=s;
		},
		get currentFrames(){
			return this.getFrames({position:this.currentFrame});
		},
		set currentFrames(s){},		
		get currentLayer(){
			return this.$.currentLayer;
		},
		set currentLayer(s){
			this.$.currentLayer=s;
		},
		get frameCount(options){
			var settings=new ext.Object({
				includeHiddenLayers:ext.includeHiddenLayers,
				includeGuides:false
			});
			settings.extend(options);
			if(settings.includeHiddenLayers && settings.includeGuides){
				return this.$.frameCount;
			}
			var frameCount=0;
			var layers=this.layers;
			for(var l=0;l<layers.length;l++){
				if(
					(layers[l].visible || settings.includeHiddenLayers) && 
					(layers[l].layerType!='guide' || settings.includeGuides) &&
					layers[l].frameCount>frameCount
				){
					frameCount=layers[l].frameCount;
				}
			}
			return frameCount;
		},
		set frameCount(s){
			this.$.frameCount=s;
		},
		get layerCount(){
			return this.$.layerCount;
		},
		set layerCount(){
			return;
		},
		getLayers:function(options){
			var settings=new ext.Object({
				includeHiddenLayers:ext.includeHiddenLayers,
				includeGuides:false
			});
			settings.extend(options);
			var inputLayers=this.$.layers;
			var layers=new ext.Array();
			for(var i=0;i<inputLayers.length;i++){
				if(
					(inputLayers[i].visible || settings.includeHiddenLayers) && 
					(inputLayers[i].layerType!='guide' || settings.includeGuides)
				){
					layers.push(new ext.Layer(inputLayers[i],{timeline:this}));
				}
			}
			return layers;
		},
		get layers(){
			return this.getLayers({
				includeHiddenLayers:true,
				includeGuides:true
			});
		},
		get name(){
			return this.$.name;
		},
		set name(s){
			this.$.name=s;
		},
		get libraryItem(){
			return this.$.libraryItem;
		},
		set libraryItem(s){
			this.$.libraryItem=s;
		},
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
				position:undefined,
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
					if(settings.position==undefined){
						f=f.concat(layers[l].frames);
					}else{
						if(layers[l].frameCount>settings.position){
							f.push(layers[l].frames[settings.position]);	
						}
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
		getBoundingBox:function(options){
			return this.getElements(options).boundingBox;
		}
	}
	ext.extend({Timeline:ExtensibleTimeline});
})(extensible);
