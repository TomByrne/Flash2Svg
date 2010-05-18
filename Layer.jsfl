(function(ext){
	function ExtensibleLayer(layer,options){
		if(layer instanceof Layer){
			this.$=layer;
		}else if(layer && layer.$ && layer.$ instanceof Layer){
			this.$=layer.$;
		}else{
			this.$=new Layer();
		}
		this.cache=new ext.Object({});
		if(options && options.timeline instanceof Timeline){
			this.cache.timeline=new ext.Timeline(options.timeline);
		}else if(options && options.timeline && options.timeline.$ instanceof Timeline){
			this.cache.timeline=options.timeline;	
		}
		return this;
	}
	ExtensibleLayer.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleLayer,
		//built-in properties
		get color(){return this.$.color;},
		set color(s){this.$.color=s;},
		get frameCount(){return this.$.frameCount;},
		set frameCount(s){this.$.frameCount=s;},
		getFrames:function(){
			var inputFrames=this.$.frames;
			var frames=new ext.Array();
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			for(var i=0;i<inputFrames.length;i++){
				frames.push(new ext.Frame(inputFrames[i],options));
			}
			this.cache.frames=frames;
			return frames;
		},
		get frames(){
			if(this.cache.frames){
				return this.cache.frames;
			}
			else{
				return this.getFrames();
			}
		},
		set frames(s){
			this.cache.frames=new ext.Array(frames[i].elements);
		},
		getElements:function(){
			var frames=this.frames;
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			var elements=new ext.Selection([],options);
			for(var i=0;i<frames.length;i++){
				elements.extend(frames[i].elements,options);
			}
			this.cache.elements=elements;
			return elements;
		},
		get elements(){
			if(this.cache.elements){
				return this.cache.elements;	
			}else{
				return this.getElements();
			}
		},
		set elements(){},
		get height(){return this.$.height;},
		set height(s){this.$.height=s;},
		get layerType(){return this.$.layerType;},
		set layerType(s){this.$.layerType=s;},
		get locked(){return this.$.locked;},
		set locked(s){this.$.locked=s;},
		get name(){return this.$.name;},
		set name(name){this.$.name=name;},
		set outline(s){this.$.outline=s;},
		get parentLayer(){return this.$.parentLayer;},
		set parentLayer(s){this.$.parentLayer=s;},
		get visible(){return this.$.visible;},
		set visible(s){this.$.visible=s;},
		get timeline(){
			if(this.cache && this.cache.timeline){
				return this.cache.timeline;
			}else{
				return this.getTimeline();	
			}
		},
		set timeline(s){this.cache.timeline=new ext.Timeline(s);},
		get index(){
			if(this.timeline){return this.timeline.layers.indexOf(this);}
		},
		set index(s){return;},
		//methods
		getTimeline:function(){},
		is:function(l,options){
			var settings=new ext.Object({
				timeline:null,
				fast:false,
				duplicateEntriesPossible:false
			});
			settings.extend(options);
			if(!l.$){l=new this.type(f);}
			var checklist=new ext.Array([
				'name','frameCount','layerType','locked','visible','color','height','outline'
			]);
			if(!ext.Object.prototype.is.call(this,l,{checklist:checklist})){
				return false;
			}
			if(settings.fast){return true;}
			var layers=null;
			if(settings.timeline && !settings.duplicateEntriesPossible){
				layers=new ext.Array();
				var tlayers=settings.timeline.layers;
				for(i=0;i<tlayers.length;i++){
					var layer=tlayers[i];
					if(ext.Object.prototype.is.call(this,layer,{checklist:checklist})){
						layers.push(layer);
					}
				}
				if(layers.length<2){
					return true;
				}
			}
			var frames=this.frames;
			var lframes=l.frames;
			if(frames.length!=lframes.length){return false;}
			for(var i=0;i<frames.length;i++){
				var e=frames[i].elements;
				var le=lframes[i].elements;
				if(e.length!=le.length){return false;}
				var eeg=e.expandGroups();
				var leeg=le.expandGroups();
				if(eeg.length!=leeg.length){return false;}
				if(eeg.getShapes().length!=leeg.getShapes().length){return false;}
			}
			if(settings.timeline && !settings.duplicateEntriesPossible){
				var mLayers=new ext.Array();
				for(var n=0;n<layers.length;n++){
					var nframes=layers[n].frames;
					var matched=true;
					for(var i=0;i<frames.length;i++){
						var e=frames[i].elements;
						var ne=nframes[i].elements;
						if(e.length!=ne.length){matched=false;break;}
						var eeg=e.expandGroups();
						var neeg=ne.expandGroups();
						if(eeg.length!=neeg.length){matched=false;break;}
						if(eeg.getShapes().length!=neeg.getShapes().length){matched=false;break;}
					}
					if(matched){mLayers.push(layers[n]);}
				}
				if(mLayers.length<2){return true;}
			}else{
				var timeline=this.timeline;
				var lTimeline=l.timeline;
				if(timeline && lTimeline){
					if(timeline.libraryItem && lTimeline.libraryItem){
						if(timeline.libraryItem.name!=lTimeline.libraryItem.name){
							return false;
						}
					}else{
						if(
							timeline.frameCount!=lTimeline.frameCount ||
							timeline.layerCount!=lTimeline.layerCount ||
							timeline.name!=lTimeline.name
						){
							return false;
						}
					}
				}
			}
			if(!this.elements.is(l.elements)){return false;}
			return true;
		}	
	}
	ext.extend({Layer:ExtensibleLayer});
})(extensible);
