(function(ext){
	function ExtensibleElement(element,options){
		var type=this.type;
		var settings=new ext.Object({
			$:(
				(element instanceof Element)?
				element:
				(
					(element instanceof type)?
					element.$:
					null
				)
			),
			cache:new ext.Object({}),
			parent:undefined
		});
		settings.extend(options);
		if(options){
			settings.cache=settings.cache||new ext.Object();
			if(settings.frame){
				if(settings.frame instanceof Frame){
					settings.cache.frame=new ext.Frame(
						settings.frame,
						{
							timeline:settings.timeline
						}
					);
				}else if(settings.frame instanceof ext.Frame){
					settings.cache.frame=settings.frame;
					if(!settings.cache.frame.timeline ){
						settings.cache.frame.timeline=settings.timeline;
					}
				}
				delete settings.frame;
			}
			if(settings.timeline){
				if(settings.timeline instanceof Timeline){
					settings.cache.timeline=new ext.Timeline(settings.timeline);
				}else if(settings.timeline instanceof ext.Timeline){
					settings.cache.timeline=settings.timeline;
				}
				delete settings.timeline;
			}
		}
		ext.Object.apply(this,[settings]);
		return this;
	}
	ExtensibleElement.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleElement,
		getPersistentData:function(name){
			return this.$.getPersistentData(name);
		},
		getTransformationPoint:function(){
			return this.$.getTransformationPoint();
		},
		hasPersistentData:function(name){
			
			return this.$.hasPersistentData(name);
		},
		removePersistentData:function(name){
			return this.$.removePersistentData(name);
		},
		setPersistentData:function(name,type,value){
			this.$.setPersistentData(name,type,value);
		},
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
		setTransformationPoint:function(transformationPoint){
			return this.$.setTransformationPoint(transformationPoint);
		},
		getFilters:function(){
			var filters=new ext.Array(this.$.getFilters());
			for(var i=0;i<filters.length;i++){
				filters[i]=new ext.Object(filters[i]);	
			}
			return filters;
		},
		setFilters:function(s){
			this.$.setFilters(s);
		},
		get filters(){
			return this.getFilters();
		},
		set filters(s){
			this.setFilters(s);
		},
		get depth(){
			return this.$.depth;
		},
		set depth(s){
			this.$.depth=s;
		},
		get elementType(){
			return this.$.elementType;
		},
		set elementType(s){
			this.$.elementType=s;
		},
		get height(){
			return this.$.height;
		},
		set height(s){
			this.$.height=s;
		},
		get layer(){
			var options={};
			if(this.timeline){options.timeline=this.timeline;}
			return new ext.Layer(this.$.layer,options);
		},
		set layer(s){
			return;
		},
		get left(){
			return this.$.left;
		},
		set left(left){
			this.x+=(left-this.left);
		},
		get right(){
			return this.left+this.width;
		},
		set right(right){
			this.x+=(right-this.right);
		},
		get locked(){
			return this.$.locked;
		},
		set locked(s){
			this.$.locked=s;
		},
		get name(){
			return this.$.name;
		},
		set name(s){
			this.$.name=s;
		},
		//transformation
		get matrix(){
			if(this.$){
				var mx=this.$.matrix
				if(mx){
					return new ext.Matrix(mx);
				}
			}
		},
		set matrix(s){
			this.$.matrix=s;
		},
		get rotation(){
			return this.$.rotation;
		},
		set rotation(s){
			this.$.rotation=s;
		},
		get scaleX(){
			return this.$.scaleX;
		},
		set scaleX(s){
			this.$.scaleX=s;
		},
		get scaleY(){
			return this.$.scaleY;
		},
		set scaleY(s){
			this.$.scaleY=s;
		},
		get selected(){
			return this.$.selected;
		},
		set selected(s){
			this.$.selected=s;
		},
		get skewX(){
			return this.$.skewX;
		},
		set skewX(s){
			this.$.skewX=s;
		},
		get skewY(){
			return this.$.skewY;
		},
		set skewY(s){
			this.$.skewY=s;
		},
		get top(){
			return this.$.top;
		},
		set top(top){
			this.y+=(top-this.top);
		},
		get bottom(){
			return this.top+this.height;
		},
		set bottom(bottom){
			this.y+=(bottom-this.bottom);
		},
		get transformX(){
			return this.$.transformX;
		},
		set transformX(s){
			this.$.transformX=s;
		},
		get transformY(){
			return this.$.transformY;
		},
		set transformY(s){
			this.$.transformY=s;
		},
		get width(){
			return this.$.width;
		},
		set width(s){
			this.$.width=s;
		},
		get transformationPoint(){
			return new ext.Point(this.$.transformationPoint);
		},
		set transformationPoint(p){
			this.$.transformationPoint=p;
		},
		get x(){
			return this.$.x;
		},
		set x(s){
			this.$.x=s;
		},
		get y(){
			return this.$.y;
		},
		set y(s){
			this.$.y=s;
		},
		get center(){
			return new ext.Point({x:this.left+this.width/2,y:this.top+this.height/2});
		},
		set center(point){
			if(!point instanceof ext.Point){
				point=new ext.Point(point);
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
			if(this.cache.frame instanceof ext.Frame){
				return this.cache.frame;
			}else if(this.parent instanceof ext.Shape){
				return this.parent.frame;
			}else{
				return this.getFrame();
			}
		},
		set frame(frame){
			if(frame instanceof Frame){
				this.cache.frame=new ext.Frame(
					settings.frame,
					{
						timeline:this.timeline
					}
				);
			}else if(frame instanceof ext.Frame){
				this.cache.frame=frame;
				if(!frame.timeline){
					this.cache.frame.timeline=this.timeline;
				}
			}
		},
		getTimeline:function(){
			return;
		},
		get timeline(){
			if(this.parent){
				return this.parent.timeline;
			}else if(this.cache.timeline){
				return this.cache.timeline;
			}else{
				return this.getTimeline();
			}
		},
		set timeline(s){
			this.cache.timeline=(s instanceof ext.Timeline)?s:new ext.Timeline(s);
		},
		getParentGroups:function(groups){
			groups=groups||new ext.Selection();
			if(this.parent && this.parent.getParentGroups){
				groups.unshift(this);
				return this.parent.getParentGroups(groups);	
			}else{
				groups.unshift(this);
				groups.pop();
				return groups;
			}
		},
		is:function(element,options){
			if(!element){return;}
			if(!(element instanceof this.type)){
				element=new this.type(element);
			}
			if(!element.$){return;}
			if(!(this instanceof ext.Shape)){
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
			var settings=new ext.Object({
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
			return ext.Object.prototype.is.call(this,element,settings);
		},	
		get objectSpaceBounds(){
			return new ext.Object(this.$.objectSpaceBounds);
		},
		set objectSpaceBounds(s){
			this.$.objectSpaceBounds=s;
		},
	}
	ext.extend({Element:ExtensibleElement});
})(extensible);
