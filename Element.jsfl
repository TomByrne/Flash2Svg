(function(dx){
	function ExtensibleElement(element,options){
		if(element instanceof Element){
			this.$=element;
		}else if(element && element.$ && element.$ instanceof Element){
			this.$=element.$;
		}else{
			this.$=null;
		}
		if(!this.cache){this.cache=new dx.Object({});}
		if(options && options.frame){
			if(options.frame instanceof Frame){
				this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
			}else if(options.frame.$ instanceof Frame){
				options.frame.timeline=options.timeline;
				this.cache.frame=options.frame;	
			}
		}
		if(options && options.timeline){
			if(options.timeline instanceof Timeline){
				this.cache.timeline=new dx.Timeline(options.timeline);
			}else if(options.timeline.$ && options.timeline.$ instanceof Timeline){
				this.cache.timeline=options.timeline;
			}
		}
		return this;
	}
	ExtensibleElement.prototype={
		__proto__:dx.Object.prototype,
		$:Element,
		type:ExtensibleElement,
		//built in methods
		getPersistentData:function(name){return this.$.getPersistentData(name);},
		getTransformationPoint:function(){return this.$.getTransformationPoint();},
		hasPersistentData:function(name){return this.$.hasPersistentData(name);},
		removePersistentData:function(name){return this.$.removePersistentData(name);},
		setPersistentData:function(name,type,value){return this.$.setPersistentData(name,type,value);},
		setTransformationPoint:function(transformationPoint){return this.$.setTransformationPoint(transformationPoint);},
		//built-in properties
		get depth(){return this.$.depth;},
		set depth(s){this.$.depth=s;},
		get elementType(){return this.$.elementType;},
		set elementType(s){this.$.elementType=s;},
		get height(){return this.$.height;},
		set height(s){this.$.height=s;},
		get layer(){
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			return new dx.Layer(this.$.layer,options);
		},
		set layer(s){},
		get left(){return this.$.left;},
		set left(){},
		get locked(){return this.$.locked;},
		set locked(s){this.$.locked=s;},
		get matrix(){return new dx.Matrix(this.$.matrix);},
		set matrix(s){this.$.matrix=s;},
		get name(){return this.$.name;},
		set name(s){this.$.name=s;},
		get rotation(){return this.$.rotation;},
		set rotation(s){this.$.rotation=s;},
		get scaleX(){return this.$.scaleX;},
		set scaleX(s){this.$.scaleX=s;},
		get scaleY(){return this.$.scaleY;},
		set scaleY(s){this.$.scaleY=s;},
		get selected(){return this.$.selected;},
		set selected(s){this.$.selected=s;},
		get skewX(){return this.$.skewX;},
		set skewX(s){this.$.skewX=s;},
		get skewY(){return this.$.skewY;},
		set skewY(s){this.$.skewY=s;},
		get top(){return this.$.top;},
		set top(){},
		get transformX(){return this.$.transformX;},
		set transformX(s){this.$.transformX=s;},
		get transformY(){return this.$.transformY;},
		set transformY(s){this.$.transformY=s;},
		get width(){return this.$.width;},
		set width(s){this.$.width=s;},
		//
		getTimeline:function(){
			return;
		},
		//
		get preTransform(){//untransformed width and height
			if(!this.cache.preTransform){
				var m=this.matrix;
				this.matrix={a:1,b:0,c:0,d:1,tx:0,ty:0};
				this.cache.preTransform=new dx.Object({
					width:this.width,
					height:this.height,
					left:this.left,
					top:this.top
				});
				this.matrix=m;
			}
			return this.cache.preTransform;
		},
		set dimensions(){},
		get x(){return this.$.x;},
		set x(s){this.$.x=s;},
		get y(){return this.$.y;},
		set y(s){this.$.y=s;},
		get center(){
			return new dx.Point({x:this.left+this.width/2,y:this.top+this.height/2});
		},
		set center(){},			
		//methods
		getFrame:function(){
			if(this.$==null){
				return;
			}
			var layer=this.layer;
			var frames=this.layer.frames;
			for(var i=0;i<frames.length;i++){
				if(frames[i].elements && frames[i].elements.expandGroups().indexOf(this)>-1){
					this.cache.frame=frames[i];
					return(this.cache.frame);
				}
			}
		},
		is:function(f){
			return false;	
		},
		get frame(){
			if(this.parent){
				return this.parent.frame;
			}else if(this.cache.frame && this.cache.frame.$ instanceof Frame){
				return this.cache.frame;
			}else{
				return this.getFrame();
			}
		},
		set frame(s){this.cache.frame=s;},
		get timeline(){
			if(this.cache.timeline){
				return this.cache.timeline;
			}else{
				return this.getTimeline();
			}
		},
		set timeline(s){
			if(this.cache){
				this.cache.timeline=new dx.Timeline(s);
			}else{
				this.cache=new dx.Object({});
				this.cache.timeline=new dx.Timeline(s);
			}
		}
	}
	dx.extend({Element:ExtensibleElement});
})(dx);
