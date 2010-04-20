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
			for(var i=0;i<inputFrames.length;i++){
				frames.push(new dx.Frame(inputFrames[i]));
			}
			return frames;
		},
		set frames(){},
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
		set timeline(s){},
		//methods
		getTimeline:function(){return;}
	}
	dx.extend({Layer:ExtensibleLayer});
})(dx);
