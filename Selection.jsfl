(function(dx){
	function Selection(s){
		if(!s || !(s instanceof Array)){s=[];}
		var sel=[];
		for(var i=0;i<s.length;i++){
			var e;
			if(s[i] instanceof Element){
				switch(s[i].elementType){
					case 'shape':
					case 'shapeObj':	
						sel.push(new dx.Shape(s[i]));
						break;
					case 'text':
						sel.push(new dx.Text(s[i]));
						break;
					case 'instance':
						switch(s[i].instanceType){
							case 'symbol':
								sel.push(new dx.SymbolInstance(s[i]));
								break;
							case 'bitmap':
								sel.push(new dx.BitmapInstance(s[i]));
								break;
							default:
								sel.push(new dx.Instance(s[i]));
						}
						break;
					default:
						sel.push(new dx.Element(s[i]));
				}
			}else if(s[i].$ &&  s[i].$ instanceof Element){
				sel.push(s[i]);
			}
		}
		Array.prototype.slice.call(this,sel);
		dx.Array.apply(this,[sel]);
		return this;
	}
	Selection.prototype={
		__proto__:dx.Array.prototype,
		type:Selection,
		getShapes:function(){
			var sh=new this.type();
			for(var e=0;e<this.length;e++){
				if(this[e].type==dx.Shape){
					sh.push(this[e]);
				}else if(this[e].$.constructor.name=='Shape'){
					sh.push(new dx.Shape(this[e]));
				}
			}
			return sh;
		},
		expand:function(){
			var expandedSel=new this.type();
			for(var i=0;i<this.length;i++){
				expandedSel.push(this[i]);
				if(this[i].type==dx.Shape && this[i].isGroup && ! this[i].isDrawingObject){
					var members=new this.type(this[i].members);
					expandedSel=expandedSel.concat(members.expand());
				}			
			}
			return expandedSel;
		},
		/*breakApart:function(){//not yet functional
			for(var i=0;i<this.length;i++){
				if(this[i].constructor.name=='SymbolInstance'){
					var clr=new Color(this[i]);
					dx.sel=[this[i]];
					dx.doc.breakApart();
					var sel=dx.sel.expandGroups();
					for(n=0;n<sel.length;n++){
						if (sel[n].constructor.name == 'Shape'){
							var contours=sel[n].contours.filter(
								function(element,index,array){
									return element.fill;
								}
							);
							for(var c=0;c<contours.length;c++){
								var fill=contours[c].fill;
								if (fill.style == 'solid'){
									var fillColor = new dx.Color(fill.color);
									for(var x=0;x<4;x++){
										fillColor[x]=((fillColor[x]/100)*clr.percent[x]+clr[x]);
									}
									fill.color=fillColor.hex;
								}
								if(fill.style.match(/Gradient$/) != null){
									for (var cc = 0; cc < fill.colorArray.length; cc++) {
										var fillColor = new dx.Color(fill.colorArray[cc]);
										for (var x = 0; x < 4; x++) {
											fillColor[x]=((fillColor[x] / 100) * clr.percent[x] + clr[x]);
										}
										fill.colorArray[cc] = fillColor.hex;
									}
								}
							}
						}
						else 
						if (sel[n].constructor.name == 'SymbolInstance'){
							//sel[n]
							//clr.fill();
						}
					}
					dx.doc.setCustomFill({color:clr.hex});
				}else{
					dx.sel=[this[i]];
					dx.doc.breakApart();
				}
			}
		},
		indexOf:function(element){
			for(var i=0;i<this.length;i++){
				if(
					this[i]==element || (
						this[i]['$'] && 
						element['$'] && (
							this[i]==element ||
							this[i].$==element.$
						)
					) || (
						this[i]['$'] && this[i].$==element
					) || (
						element['$'] && this[i]==element.$
					)
					
				){
					return i;
				}
			}
			return -1;
		},*/
		byFrame:function(){//returns an Array of Selections by frame.
			var frameElements=new dx.Selection();
			var elements=new dx.Selection(this);
			var byFrame=new dx.Array();
			for(var i=0;i<elements.length;i++){
				var caught=false;
				for(var n=0;n<frameElements.length;n++){
					if(frameElements[n].indexOf(elements[i])>-1){
						byFrame[n].push(elements[i]);
						caught=true;
					}
				}
				if(!caught){
					var f=elements[i].getFrame();
					//if(f){
						frameElements.push(f.elements);
						byFrame.push(new dx.Selection([elements[i]]));
					//}
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
		}
	}
	dx.extend({
		Selection:Selection
	});
})(dx)