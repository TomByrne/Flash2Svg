(function(dx){
	function ExtensibleElement(element,options){
		if(element instanceof Element){
			this.$=element;
		}else if(element && element.$ && element.$ instanceof Element){
			this.$=element.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame);
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			this.cache.frame=options.frame;	
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
		get layer(){return new dx.Layer(this.$.layer);},
		set layer(s){},
		get left(){return this.$.left;},
		set left(){},
		get locked(){return this.$.locked;},
		set locked(s){this.$.locked=s;},
		get matrix(){return this.$.matrix;},
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
		get x(){return this.$.x;},
		set x(s){this.$.x=s;},
		get y(){return this.$.y;},
		set y(s){this.$.y=s;},
		//methods
		getFrame:function(){
			if(this.$==null){return;}
			var layer=this.layer;
			var frames=this.layer.frames;
			for(var i=0;i<frames.length;i++){
				if(frames[i].elements && frames[i].elements.indexOf(this)>-1){
					this.cache.frame=frames[i];
					return(this.cache.frame);
				}
			}
		},
		is:function(f){
			return((f.$ && f.$==this.$)||(f==this.$));	
		},
		get frame(){
			if(this.cache.frame && this.cache.frame.$ instanceof Frame){
				return this.cache.frame;
			}else{
				return this.getFrame();
			}
		},
		set frame(s){this.cache.frame=s;},
	}
	dx.extend({Element:ExtensibleElement});
})(dx);
