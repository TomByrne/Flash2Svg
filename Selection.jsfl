(function(dx){
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
							sel.push(new dx.OvalObject(s[i],options));
						}else if(s[i].isRectangleObject){
							sel.push(new dx.RectangleObject(s[i],options));								
						}else{
							sel.push(new dx.Shape(s[i],options));	
						}
						break;
					case 'tlfText':
						sel.push(new dx.TLFText(s[i],options));
						break;
					case 'text':
						sel.push(new dx.Text(s[i],options));
						break;
					case 'instance':
						switch(s[i].instanceType){
							case 'symbol':
								sel.push(new dx.SymbolInstance(s[i],options));
								break;
							case 'bitmap':
								sel.push(new dx.BitmapInstance(s[i],options));
								break;
							default:
								sel.push(new dx.Instance(s[i],options));
						}
						break;
					default:
						sel.push(new dx.Element(s[i],options));
				}
			}else if(s[i] instanceof dx.Element){
				dx.Object.apply(s[i],[options]);
				sel.push(s[i]);
			}
		}
		Array.prototype.slice.call(this,sel);
		dx.Array.apply(this,[sel]);
		this.options=options;
		return this;
	}
	Selection.prototype={
		__proto__:dx.Array.prototype,
		type:Selection,
		getElementsByType:function(type,matchObj){
			var match=new dx.Object({});//isGroup,isDrawingObject,instanceType,etc.
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
						dx.Object.call(this[e],this.options);
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
				if(this[i].type==dx.Shape && this[i].isGroup && ! this[i].isDrawingObject){
					var members=new this.type(this[i].members,this.options);
					expandedSel.extend(members.expandGroups());
				}			
			}
			return expandedSel;
		},
		byFrame:function(options){// returns an Array of Selections by frame
			var settings=new dx.Object({
				stacked:false, // true if each frame is known to be on a separate layer
				timeline:this.options?this.options.timeline:null
			});
			settings.extend(options);
			var frameElements=new dx.Selection([],this.options);
			var elements=new dx.Selection(this,this.options);
			var byFrame=new dx.Array();
			var frames=new dx.Array();
			for(var i=0;i<elements.length;i++){
				frames.push(elements[i].frame,{timeline:this});
			}
			var fast=false;
			if(settings.timeline){//check to see if we can use a faster method of identifying layers
				fast=true;
				var checklist=new dx.Array([
					'name','frameCount','layerType','locked','visible','color','height','outline'
				]);
				var layers=settings.timeline.layers;
				var falseMatch=false;
				while(layers.length>1){
					var l=layers.pop();
					for(var i=0;i<layers.length;i++){
						if(dx.Object.prototype.is.call(l,layers[i],{checklist:checklist})){
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
					byFrame.push(new dx.Selection([elements[i]],this.options));
				}
			}
			return byFrame;
		},
		concat:function(){
			var c=new this.type(this,this.options);
			for(var i=0;i<arguments.length;i++){
				if(arguments[i].constructor.name=='Array'){
					for(var n=0;n<arguments[i].length;n++){
						c.push(arguments[i][n]);
					}
				}
			}
			return c;
		}
	}
	dx.extend({
		Selection:Selection
	});
})(dx)