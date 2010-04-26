(function(dx){
	function ExtensibleLayer(layer,options){
		if(layer instanceof Layer){
			this.$=layer;
		}else if(layer && layer.$ && layer.$ instanceof Layer){
			this.$=layer.$;
		}else{
			this.$=new Layer();
		}
		this.cache=new dx.Object({});
		if(options && options.timeline instanceof Timeline){
			this.cache.timeline=new dx.Timeline(options.timeline);
		}else if(options && options.timeline && options.timeline.$ instanceof Timeline){
			this.cache.timeline=options.timeline;	
		}
		return this;
	}
	ExtensibleLayer.prototype={
		__proto__:dx.Object.prototype,
		$:Layer,
		type:ExtensibleLayer,
		//built-in properties
		get color(){return this.$.color;},
		set color(s){this.$.color=s;},
		get frameCount(){return this.$.frameCount;},
		set frameCount(s){this.$.frameCount=s;},
		get frames(){
			var inputFrames=this.$.frames;
			var frames=new dx.Array();
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			for(var i=0;i<inputFrames.length;i++){
				frames.push(new dx.Frame(inputFrames[i],options));
			}
			return frames;
		},
		set frames(){},
		get elements(){
			var frames=this.frames;
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			var elements=new dx.Selection([],options);
			for(var i=0;i<frames.length;i++){
				elements.extend(frames[i].elements,options);
			}
			return elements;
		},
		set elements(){},
		get height(){return this.$.height;},
		set height(s){this.$.height=s;},
		get layerType(){return this.$.layerType;},
		set layerType(s){this.$.layerType=s;},
		get locked(){return this.$.locked;},
		set locked(s){this.$.locked=s;},
		get name(){return this.$.name;},
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
		set timeline(s){this.cache.timeline=new dx.Timeline(s);},
		get index(){
			if(this.timeline){return this.timeline.layers.indexOf(this);}
		},
		set index(s){return;},
		//methods
		getTimeline:function(){},
		is:function(l,fast){
			if(!l.$){l=new this.type(f);}
			if(l.frameCount!=this.frameCount){return false;}
			if(l.layerType!=this.layerType){return false;}
			if(l.locked!=this.locked){return false;}
			if(l.name!=this.name){return false;}
			if(l.visible!=this.visible){return false;}
			if(l.color!=this.color){return false;}
			var timeline=this.timeline;
			var lTimeline=l.timeline;
			if(timeline && lTimeline){
				if(timeline.libraryItem && lTimeline.libraryItem){
					if(timeline.libraryItem.name!=lTimeline.libraryItem.name){
						return false;
					}else{
						return true;
					}
				}
				if(timeline.frameCount!=lTimeline.frameCount){return false;}
				if(timeline.layerCount!=lTimeline.layerCount){return false;}
				if(timeline.name!=lTimeline.name){return false;}
			}
			if(this.frames.length!=l.frames.length){
				return false;
			}
			for(var i=0;i<this.frames.length;i++){
				if(this.frames[i].elements.length!=l.frames[i].elements.length){
					return false;
				}
				if(this.frames[i].elements.expand().length!=l.frames[i].elements.expand().length){
					return false;
				}
				if(this.frames[i].elements.expand().getShapes().length!=l.frames[i].elements.expand().getShapes().length){
					return false;
				}
			}
			if(!fast && !this.elements.is(l.elements)){return false;}
			return true;
		}	
	}
	dx.extend({Layer:ExtensibleLayer});
})(dx);
