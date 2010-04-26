(function(dx){
	function Selection(s,options){
		if(!s || !(s instanceof Array)){s=[];}
		var sel=[];
		if(s instanceof Array){
			for(var i=0;i<s.length;i++){
				var e;
				if(s[i] instanceof Element){
					switch(s[i].elementType){
						case 'shape':
						case 'shapeObj':	
							sel.push(new dx.Shape(s[i],options));
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
				}else if(s[i].$ &&  s[i].$ instanceof Element){
					dx.Object.apply(s[i],[options]);
					sel.push(s[i]);
				}
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
		getShapes:function(){
			var sh=new this.type();
			for(var e=0;e<this.length;e++){
				if(this[e].type==dx.Shape){
					dx.Object.apply(this[e],this.options);
					sh.push(this[e]);
				}else if(this[e].$.constructor.name=='Shape'){
					sh.push(new dx.Shape(this[e],this.options));
				}
			}
			return sh;
		},
		expand:function(){
			var expandedSel=new this.type();
			for(var i=0;i<this.length;i++){
				expandedSel.push(this[i]);
				if(this[i].type==dx.Shape && this[i].isGroup && ! this[i].isDrawingObject){
					var members=new this.type(this[i].members,this.options);
					expandedSel=expandedSel.concat(members.expand());
				}			
			}
			return expandedSel;
		},
		byFrame:function(fast){//returns an Array of Selections by frame.
			var frameElements=new dx.Selection([],this.options);
			var elements=new dx.Selection(this,this.options);
			var byFrame=new dx.Array();
			for(var i=0;i<elements.length;i++){
				var caught=false;
				for(var n=0;n<byFrame.length;n++){
					if(byFrame[n][0].frame.is(elements[i].frame)){
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
		clone:function(rlist){
			return dx.Object.prototype.clone.call(this,rlist);
		},
		concat:function(){
			return dx.Array.prototype.concat.apply(this,arguments);	
		},
		filter:function(){
			return dx.Array.prototype.filter.apply(this,arguments);	
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
		},
	}
	dx.extend({
		Selection:Selection
	});
})(dx)