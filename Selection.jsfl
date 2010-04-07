(function(dx){
	function Selection(){
		dx.Array.apply(this,arguments);
		return this;
	}
	Selection.prototype={
		__proto__:dx.Array.prototype,
		type:Selection,
		getShapes:function(){
			var sh=new this.type();
			for(var e=0;e<this.length;e++){
				if(this[e].constructor.name=='Shape'){
					sh.push(this[e]);
				}
			}
			this.shapes=sh;
			return sh;
		},
		expand:function(sel){
			var sel=sel?sel:this.clone();
			var expandedSel=new this.type();
			for(var i=0;i<sel.length;i++){
				expandedSel.push(sel[i]);
				if(sel[i].constructor.name=="Shape" && sel[i].isGroup && ! sel[i].isDrawingObject){
					var ex=this.expand(sel[i].members);
					for(var e=0;e<ex.length;e++) ex.parent=sel[i];
					expandedSel=expandedSel.concat(ex);
				}			
			}
			return expandedSel;
		},
		breakApart:function(){
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