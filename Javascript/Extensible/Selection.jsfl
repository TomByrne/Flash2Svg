(function(ext){
	function Selection(s,options){
		if(!(s instanceof Array)){s=[];}
		var sel=[];
		for(var i=0;i<s.length;i++){
			var e;
			if(s[i] instanceof Element){
				switch(s[i].elementType){
					case 'shapeObj':
					case 'shape':
						if(s[i].isOvalObject){
							sel.push(new ext.OvalObject(s[i],options));
						}else if(s[i].isRectangleObject){
							sel.push(new ext.RectangleObject(s[i],options));								
						}else{
							sel.push(new ext.Shape(s[i],options));	
						}
						break;
					case 'tlfText':
						sel.push(new ext.TLFText(s[i],options));
						break;
					case 'text':
						sel.push(new ext.Text(s[i],options));
						break;
					case 'instance':
						switch(s[i].instanceType){
							case 'symbol':
								sel.push(new ext.SymbolInstance(s[i],options));
								break;
							case 'bitmap':
								sel.push(new ext.BitmapInstance(s[i],options));
								break;
							default:
								sel.push(new ext.Instance(s[i],options));
						}
						break;
					default:
						sel.push(new ext.Element(s[i],options));
				}
			}else if((s[i] instanceof ext.Element) && s[i].$){
				ext.Object.apply(s[i],[options]);
				sel.push(s[i]);
			}
		}
		Array.prototype.slice.call(this,sel);
		ext.Array.apply(this,[sel]);
		this.options=options;
		return this;
	}
	Selection.prototype={
		__proto__:ext.Array.prototype,
		type:Selection,
		getElementsByType:function(type,matchObj){
			var match=new ext.Object({});//isGroup,isDrawingObject,instanceType,etc.
			match.extend(matchObj);
			var keys=match.keys;
			var sel=new this.type([],this.options);
			for(var e=0;e<this.length;e++){
				var element=this[e];
				if(
					element instanceof type || 
					(element.$ && element.$ instanceof type)
				){
					var m=true;
					for(var i=0;i<keys.length;i++){
						var attr=keys[i];
						if(
							match[attr]!==null && 
							match[attr]!==undefined &&
							match[attr]!=element[attr]
						){
							m=false;
							break;
						}
					};
					if(m){;
						ext.Object.call(this[e],this.options);
						sel.push(this[e]);
					}
				}
			}
			return sel;
		},
		getShapes:function(){
			return this.getElementsByType(Shape);
		},
		getGroups:function(){
			return this.getElementsByType(Shape,{isGroup:true,isDrawingObject:false});
		},
		getSymbolInstances:function(){
			return this.getElementsByType(SymbolInstance);
		},
		getBitmapInstances:function(){
			return this.getElementsByType(Instance,{instanceType:'bitmap'});
		},
		expandGroups:function(){
			var expandedSel=new this.type();
			for(var i=0;i<this.length;i++){
				expandedSel.push(this[i]);
				if(this[i].type==ext.Shape && this[i].isGroup && ! this[i].isDrawingObject){
					var members=new this.type(this[i].members,this.options);
					expandedSel.extend(members.expandGroups());
				}			
			}
			return expandedSel;
		},
		byFrame:function(options){// returns an Array of Selections by frame
			var settings=new ext.Object({
				stacked:false, // true if each frame is known to be on a separate layer
				timeline:this.options?this.options.timeline:null
			});
			settings.extend(options);
			var frameElements=new ext.Selection([],this.options);
			var elements=new ext.Selection(this,this.options);
			var byFrame=new ext.Array();
			var frames=new ext.Array();
			for(var i=0;i<elements.length;i++){
				frames.push(elements[i].frame,{timeline:this});
			}
			var fast=false;
			if(settings.timeline){//check to see if we can use a faster method of identifying layers
				fast=true;
				var checklist=new ext.Array([
					'name','frameCount','layerType','locked','visible','color','height','outline'
				]);
				var layers=settings.timeline.layers;
				var falseMatch=false;
				while(layers.length>1){
					var l=layers.pop();
					for(var i=0;i<layers.length;i++){
						if(ext.Object.prototype.is.call(l,layers[i],{checklist:checklist})){
							falseMatch=true;
							break;
						}
					}
					if(falseMatch){
						fast=false;
						break;
					}
				}
			}
			for(var i=0;i<elements.length;i++){
				var caught=false;
				for(var n=0;n<byFrame.length;n++){
					if(
						byFrame[n][0].frame.is(
							elements[i].frame,{
								stacked:settings.stacked,
								fast:fast,
								timeline:settings.timeline
							}
						)
					){
						byFrame[n].push(elements[i]);
						caught=true;
					}
				}
				if(!caught){
					var f=elements[i].frame;
					byFrame.push(new ext.Selection([elements[i]],this.options));
				}
			}
			return byFrame;
		},
		concat:function(){
			var c=new this.type(this,this.options);
			for(var i=0;i<arguments.length;i++){
				if(arguments[i] && arguments[i].constructor && arguments[i].constructor.name=='Array'){
					for(var n=0;n<arguments[i].length;n++){
						c.push(arguments[i][n]);
					}
				}
			}
			return c;
		},
		get boundingBox(){
			var boundingBox=new ext.Object();
			for(var i=0;i<this.length;i++){
				if(
					!boundingBox.hasOwnProperty('left') ||
					this[i].left<boundingBox.left
				){
					boundingBox.left=this[i].left;
				}
				if(
					!boundingBox.hasOwnProperty('top') ||
					this[i].top<boundingBox.top
				){
					boundingBox.top=this[i].top;
				}
				if(
					!boundingBox.hasOwnProperty('right') ||
					this[i].right>boundingBox.right
				){
					boundingBox.right=this[i].right;
				}
				if(
					!boundingBox.hasOwnProperty('bottom') ||
					this[i].bottom>boundingBox.bottom
				){
					boundingBox.bottom=this[i].bottom;
				}
			}
			if(!boundingBox.hasOwnProperty('left')){
				boundingBox.left=0;
			}
			if(!boundingBox.hasOwnProperty('top')){
				boundingBox.top=0;
			}
			if(!boundingBox.hasOwnProperty('right')){
				boundingBox.right=0;
			}
			if(!boundingBox.hasOwnProperty('bottom')){
				boundingBox.bottom=0;
			}
			return boundingBox;
		},
		set boundingBox(){},
		get width(){
			var boundingBox=this.boundingBox;
			return boundingBox.right-boundingBox.left;
		},
		set width(){},
		get height(){
			var boundingBox=this.boundingBox;
			return boundingBox.bottom-boundingBox.top;
		},
		set height(){}
	}
	ext.extend({
		Selection:Selection
	});
})(extensible)