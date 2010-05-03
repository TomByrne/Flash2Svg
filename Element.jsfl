(function(dx){
	function ExtensibleElement(element,options){
		var type=this.type;
		var settings=new dx.Object({
			$:(
				(element instanceof Element)?
				element:
				(
					(element instanceof type)?
					element.$:
					null
				)
			),
			cache:new dx.Object({})
		});
		settings.extend(options);
		if(options){
			settings.cache=settings.cache||new dx.Object();
			if(settings.frame){
				if(settings.frame instanceof Frame){
					settings.cache.frame=new dx.Frame(
						settings.frame,
						{
							timeline:settings.timeline
						}
					);
				}else if(settings.frame instanceof dx.Frame){
					settings.cache.frame=settings.frame;
					if(!settings.cache.frame.timeline ){
						settings.cache.frame.timeline=settings.timeline;
					}
				}
				delete settings.frame;
			}
			if(settings.timeline){
				if(settings.timeline instanceof Timeline){
					settings.cache.timeline=new dx.Timeline(settings.timeline);
				}else if(settings.timeline instanceof dx.Timeline){
					settings.cache.timeline=settings.timeline;
				}
				delete settings.timeline;
			}
		}
		dx.Object.apply(this,[settings]);
		return this;
	}
	ExtensibleElement.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleElement,
		getPersistentData:function(name){return this.$.getPersistentData(name);},
		getTransformationPoint:function(){return this.$.getTransformationPoint();},
		hasPersistentData:function(name){return this.$.hasPersistentData(name);},
		removePersistentData:function(name){return this.$.removePersistentData(name);},
		setPersistentData:function(name,type,value){this.$.setPersistentData(name,type,value);},
		uniqueDataName:function(name){
			if(typeof(name)!='string'){return;}
			if(this.hasPersistentData(name)){
				if(/\_[\d]*?$/.test(name)){
					return this.uniqueDataName(name.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(name)[0])+1)));
				}else{
					return  this.uniqueDataName(name+"_1");
				}
			}
			return name;
		},
		setTransformationPoint:function(transformationPoint){return this.$.setTransformationPoint(transformationPoint);},
		getFilters:function(){
			var filters=new dx.Array(this.$.getFilters());
			for(var i=0;i<filters.length;i++){
				filters[i]=new dx.Object(filters[i]);	
			}
			return filters;
		},
		setFilters:function(s){this.$.setFilters(s);},
		get filters(){return this.getFilters();},
		set filters(s){this.setFilters(s);},
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
		set left(left){this.x+=(left-this.left);},
		get right(){return this.left+this.width;},
		set right(right){this.x+=(right-this.right);},
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
		set top(top){this.y+=(top-this.top);},
		get bottom(){return this.top+this.height;},
		set bottom(bottom){this.y+=(bottom-this.bottom);},
		get transformX(){return this.$.transformX;},
		set transformX(s){this.$.transformX=s;},
		get transformY(){return this.$.transformY;},
		set transformY(s){this.$.transformY=s;},
		get width(){return this.$.width;},
		set width(s){this.$.width=s;},
		get transformationPoint(){return new dx.Point(this.$.transformationPoint);},
		set transformationPoint(p){this.$.transformationPoint=p;},
		get x(){return this.$.x;},
		set x(s){this.$.x=s;},
		get y(){return this.$.y;},
		set y(s){this.$.y=s;},
		get center(){
			return new dx.Point({x:this.left+this.width/2,y:this.top+this.height/2});
		},
		set center(point){
			if(!point instanceof dx.Point){
				point=new dx.Point(point);
			}
			var offset=p.difference(this.center);
			this.x+=offset.x;
			this.y+=offset.y;
		},			
		getFrame:function(){
			var layer=this.layer;
			var frames=this.layer.frames;
			for(var i=0;i<frames.length;i++){
				var e=frames[i].elements;
				if(e && e.expandGroups().indexOf(this)>-1){
					this.cache.frame=frames[i];
					return(this.cache.frame);
				}
			}
		},
		get frame(){
			if(this.parent instanceof dx.Shape){
				return this.parent.frame;
			}else if(this.cache.frame instanceof dx.Frame){
				return this.cache.frame;
			}else{
				return this.getFrame();
			}
		},
		set frame(s){
			this.cache.frame=s;
		},
		getTimeline:function(){
			return;
		},
		get timeline(){
			if(this.cache.timeline){
				return this.cache.timeline;
			}else{
				return this.getTimeline();
			}
		},
		set timeline(s){
			this.cache.timeline=(s instanceof dx.Timeline)?s:new dx.Timeline(s);
		},
		is:function(element,options){
			if(element.constructor==this.$.constructor){element=new this.type(element);}
			if(!(element instanceof this.type)){return false;}
			if(!(this instanceof dx.Shape)){
				var id=this.uniqueDataName(String('temporaryID_'+String(Math.floor(Math.random()*9999))));
				var pd=Math.floor(Math.random()*99999999);
				this.setPersistentData(id,'integer',pd);
				var matched=false;
				if(element.hasPersistentData(id)&&element.getPersistentData(id)==pd){
					matched=true;
				}
				this.removePersistentData(id);
				return matched;
			}
			var settings=new dx.Object({
				checklist:[
					'matrix',
					'width',
					'height',
					'name',
					'locked',
					'transformationPoint',
					'selected',
					'filters'
				]		
			});
			settings.extend(options,true);
			return dx.Object.prototype.is.call(this,element,settings);
		}		
	}
	dx.extend({Element:ExtensibleElement});
})(dx);
