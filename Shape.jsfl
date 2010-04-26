(function(dx){
	function ExtensibleShape(shape,options){
		if(shape instanceof Shape){
			this.$=shape;
		}else if(shape && shape.$ && shape.$ instanceof Shape){
			this.$=shape.$;
		}else{
			this.$=null;
		}
		this.parent=null;
		dx.Object.apply(this,[options]);
		if(!this.cache){this.cache=new dx.Object({});}
		this.cache.cubicSegmentPoints=new dx.Array();
		if(options && options.frame instanceof Frame){
			this.cache.frame=new dx.Frame(options.frame,{timeline:options.timeline});
		}else if(options && options.frame && options.frame.$ instanceof Frame){
			options.frame.timeline=options.timeline;
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
		set contours(c){this.cache.contours=c;},
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
		get center(){
			if(this.isGroup){
				return new dx.Point({x:this.matrix.tx,y:this.matrix.ty});
			}else{
				return new dx.Point({x:this.left+this.width/2,y:this.top+this.height/2});
			}
		},
		get isDrawingObject(){if(this.$){return this.$.isDrawingObject;}},
		set isDrawingObject(){},
		get isGroup(){if(this.$){return this.$.isGroup;}},set isGroup(){},
		get isOvalObject(){return this.$.isOvalObject;},
		set isOvalObject(){},
		get isRectangleObject(){if(this.$){return this.$.isRectangleObject;}},
		set isRectangleObject(){},
		get members(){
			if(this.$){
				var members = new dx.Selection(this.$.members,this.options);
				for(var i=0;i<members.length;i++){
					members[i].parent=this;	
				}
				return members;
			}
		},
		set members(){},
		get numCubicSegments(){if(this.$){return this.$.numCubicSegments;}},
		set numCubicSegments(){},
		get vertices(){if(this.$){return this.$.vertices;}},
		set vertices(){},
		//methods
		is:function(sh){
			if(!sh.$){sh=new this.type(sh);}
			if(this.numCubicSegments!=sh.numCubicSegments){return false;}
			if(!this.matrix.is(sh.matrix)){return false;}
			if(this.isGroup!=sh.isGroup){return false;}
			if(this.isGroup && !this.members.is(sh.members)){return false;}
			if(this.isDrawingObject!=sh.isDrawingObject){return false;}
			if(!this.contours.is(sh.contours)){return false;}
			return true;
		}
	}
	dx.extend({Shape:ExtensibleShape});
})(dx);
