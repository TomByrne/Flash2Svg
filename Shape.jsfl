(function(dx){
	function ExtensibleShape(shape,options){
		if(shape instanceof Shape){
			this.$=shape;
		}else if(shape && shape.$ && shape.$ instanceof Shape){
			this.$=shape.$;
		}else{
			this.$=null;
		}
		this.cache=new dx.Object({cubicSegmentPoints:new dx.Array()});
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame);
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			this.cache.frame=options.frame;	
		}
		return this;
	}
	ExtensibleShape.prototype={
		__proto__:dx.Element.prototype,
		$:Shape,
		type:ExtensibleShape,
		//built in methods
		beginEdit:function(){return this.$.beginEdit();},
		deleteEdge:function(index){return this.$.deleteEdge(index);},
		endEdit:function(){return this.$.endEdit();},
		getCubicSegmentPoints:function(cubicSegmentIndex){
			if(cubicSegmentIndex){
				if(this.cache.cubicSegmentPoints[cubicSegmentIndex]){
					return  this.cache.cubicSegmentPoints[cubicSegmentIndex];
				}
				var csp=this.$.getCubicSegmentPoints(cubicSegmentIndex);
				var points=new dx.Array();
				for(var i=0;i<csp.length;i++){
					points.push(new dx.Point(csp[i]));
				}
				this.cache.cubicSegmentPoints[cubicSegmentIndex]=points;
				return points;
			}else{
				return;
			}
		},
		//built-in properties
		get contours(){
			if(!this.$){return;}
			if(this.cache['contours']){return this.cache.contours;}
			var contours=new dx.Array();
			for(var i=0;i<this.$.contours.length;i++){
				var c=new dx.Contour(this.$.contours[i],{shape:this});
				var matched=false;
				for(var n=0;n<contours.length;n++){
					if(c.edgeIDs.is(contours[n].edgeIDs)){
						matched=true;
						if(c.interior){
							c.oppositeFill=contours[n].fill;
						}
						contours[n]=c;
						break;
					}
				}
				if(!matched){contours.push(c);}
			}
			this.cache.contours=contours;
			return contours;
		},
		set contours(){},
		get edges(){
			if(this.$){
				var edges=new dx.Array();
				var e=this.$.edges;
				for(i=0;i<e;i++){
					edges.push(new dx.Edge(this.$.edges[i]));
				}
				return edges;
			}
		},
		set edges(){},
		get isDrawingObject(){if(this.$){return this.$.isDrawingObject;}},
		set isDrawingObject(){},
		get isGroup(){if(this.$){return this.$.isGroup;}},set isGroup(){},
		get isOvalObject(){return this.$.isOvalObject;},
		set isOvalObject(){},
		get isRectangleObject(){if(this.$){return this.$.isRectangleObject;}},
		set isRectangleObject(){},
		get members(){if(this.$){return new dx.Selection(this.$.members);}},
		set members(){},
		get numCubicSegments(){if(this.$){return this.$.numCubicSegments;}},
		set numCubicSegments(){},
		get vertices(){if(this.$){return this.$.vertices;}},
		set vertices(){},
		//methods
		getSVG:function(options){
			var settings=new dx.Object({
				degree:2,
				matrix:dx.doc.viewMatrix,
			});
			settings.extend(options);
			var matrix;
			if(this.isDrawingObject){
				matrix=fl.Math.concatMatrix(settings.matrix,this.matrix);
			}else{
				matrix=fl.Math.concatMatrix(settings.matrix,{
					a:this.matrix.a,
					b:this.matrix.b,
					c:this.matrix.c,
					d:this.matrix.d,
					tx:this.x-this.transformX,
					ty:this.y-this.transformY,
				});
			}
			fl.showIdleMessage(false);
			var contours=this.contours;
			var svgArray=new dx.Array();
			var filled=new dx.Array();
			var tobeCut=null;
			for(var i=0;i<contours.length;i++){
				svgArray.push(new XMLList(contours[i].getSVG({degree:settings.degree})));
				if(contours[i].interior){
					if(filled.length>0 && contours[i].oppositeFill.style!='noFill' ){
						for(var n=filled.length-1;n>-1;n-=1){
							if(
								contours[i].oppositeFill.style!='noFill' &&
								contours[i].oppositeFill.is(contours[filled[n]].fill) &&
								!contours[i].fill.is(contours[filled[n]].fill)
							){
								var s=new XMLList(contours[i].getSVG({degree:settings.degree,reverse:true}));
								svgArray[filled[n]][0].@d+=/^.*?[Zz]/.exec(s[0].@d.trim())[0];
								//svgArray[filled[n]][0]['@fill-rule']="evenodd";
								//svgArray[filled[n]][0]['@clip-rule']="evenodd";
								break;
							}
						}
						if(contours[i].fill.style=='noFill'){
							for(n=0;n<svgArray[i].length();n++){
								if(svgArray[i][n].stroke.length()==0){
									delete svgArray[i][n];
								}
							}
						}
					}
					if(contours[i].fill.style!='noFill'){
						filled.push(i);
					}
				}
			}
			var svg=new XML('<g/>');
			svg.@transform='matrix('+matrix.a+' '+matrix.b+' '+matrix.c+' '+matrix.d+' '+matrix.tx+' '+matrix.ty+')';
			for(var i=0;i<svgArray.length;i++){
				if(svgArray[i].length()){//eliminate duplicate paths
					for(n in svgArray[i]){
						if(
							svgArray[i][n].localName()=='path' && 
							(!svgArray[i][n].@stroke.length() || svgArray[i][n].@stroke=='none' || svgArray[i][n].@stroke=='') && 
							(!svgArray[i][n].@fill.length() || svgArray[i][n].@fill=='none' || svgArray[i][n].@fill=='')
						){
							delete svgArray[i][n];
						}else if(svgArray[i][n].localName()=='path' && svgArray[i][n].@stroke.length()){
							var cs0=String(svgArray[i][n].@d).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
							var ca0=cs0.split(' ');
							if(ca0[ca0.length-1]==ca0[0]){
								ca0.pop();
								cs0=ca0.join(' ');
							}
							var index=0;
							for(s in svg){
								if(svg[s].localName()=='path' && svg[s].@stroke.length()){
									var cs1=String(svg[s].@d).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
									var ca1=cs1.split(' ');
									if(ca1[ca1.length-1]==ca1[0]){
										ca1.pop();
										cs1=ca1.join(' ');
									}
									if(ca1[0]!=ca0[0] && ca1[0]!=ca0[ca0.length-1]){
										ca1=cs1.split(ca0[0]+' '+ca0[1]+' '+ca0[2]);
										cs1=ca0[0]+' '+ca0[1]+' '+ca0[2]+' '+cs1[1].trim()+' '+cs1[0].trim();
										ca1=cs1.split(' ');
									}
									if(ca0[0]==ca1[ca1.length-1]){
										ca1=ca1.reverse()
										cs1=ca1.join(' ');
									}
									if(cs0==cs1){
										delete svg[s];
									}
								}
							}
						}
					}
					svg.appendChild(svgArray[i]);
				}
			}
			fl.showIdleMessage(true);
			if(this.isGroup && !this.isDrawingObject){
				var g=this.members;
				for(i=0;i<g.length;i++){fl.trace(g[i].toSource());	
					if(g[i].getSVG){
						svg.appendChild(new XML(g[i].getSVG({degree:settings.degree})));
					}
				}
			}
			return svg;
		},
		is:function(sh){
			if(this.numCubicSegments!=sh.numCubicSegments){return false;}
			if(!this.edges || !this.edges.is || !this.edges.is(sh.edges)){return false;}
			
			return true;
		},
		get svg(){
			return this.getSVG();
		},
		set svg(){}
	}
	dx.extend({Shape:ExtensibleShape});
})(dx);
