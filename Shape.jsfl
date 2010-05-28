(function(ext){
	function ExtensibleShape(shape,options){
		ext.Element.apply(this,arguments);
		this.cache.cubicSegmentPoints=this.cache.cubicSegmentPoints||new ext.Array();
		this.cache.gapFilled=this.cache.gapFilled||new ext.Array([]);
		return this;
	}
	ExtensibleShape.prototype={
		__proto__:ext.Element.prototype,
		type:ExtensibleShape,
		beginEdit:function(){return this.$.beginEdit();},
		deleteEdge:function(index){return this.$.deleteEdge(index);},
		endEdit:function(){return this.$.endEdit();},
		getCubicSegmentPoints:function(cubicSegmentIndex,options){
			if(cubicSegmentIndex){
				if(ext.log){
					var timerCSPL=ext.log.startTimer('Cubic segment point lookup.');	
				}
				var settings=new ext.Object({
					shape:this,
					edge:undefined
				});
				settings.extend(options);
				var cachePoints;
				var useCache=true;
				if(useCache){
					cachePoints=this.cache.cubicSegmentPoints[cubicSegmentIndex];
					if(cachePoints && cachePoints.length){
						return this.cache.cubicSegmentPoints[cubicSegmentIndex];
					}
				}
				var csp=this.$.getCubicSegmentPoints(cubicSegmentIndex);
				var points=new ext.Array();
				for(var i=0;i<csp.length;i++){
					points.push(
						new ext.Point(csp[i],settings)
					);
				}
				if(useCache){
					this.cache.cubicSegmentPoints[cubicSegmentIndex]=new ext.Array(points);
				}
				if(ext.log){
					ext.log.pauseTimer(timerCSPL);
				}
				return points;
			}else{
				return;
			}
		},
		get contours(){
			if(!this.$){return;}
			if(this.cache['contours']){return this.cache.contours;}
			var contours=new ext.Array();
			for(var i=0;i<this.$.contours.length;i++){
				var c=new ext.Contour(this.$.contours[i],{shape:this});
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
				var edges=new ext.Array();
				var e=this.$.edges;
				for(var i=0;i<e.length;i++){
					edges.push(new ext.Edge(this.$.edges[i]));
				}
				return edges;
			}
		},
		set edges(){return;},
		get isDrawingObject(){if(this.$){return this.$.isDrawingObject;}},
		set isDrawingObject(){return;},
		get isGroup(){if(this.$){return this.$.isGroup;}},set isGroup(){},
		get isOvalObject(){return this.$.isOvalObject;},
		set isOvalObject(){},
		get isRectangleObject(){if(this.$){return this.$.isRectangleObject;}},
		set isRectangleObject(){},
		get members(){
			if(this.$){
				var members = new ext.Selection(this.$.members,this.options);
				for(var i=0;i<members.length;i++){
					members[i].parent=this;	
				}
				return members;
			}
		},
		set members(s){return;},
		get numCubicSegments(){
			if(this.$){
				return this.$.numCubicSegments;
			}
		},
		set numCubicSegments(){},
		get vertices(){if(this.$){return this.$.vertices;}},
		set vertices(s){return;},
		get objectSpaceBounds(){
			return new ext.Object(this.$.objectSpaceBounds);
		},
		set objectSpaceBounds(s){
			this.$.objectSpaceBounds=s;
		},
		is:function(element,options){
			var settings=new ext.Object({
				checklist:[
					'objectSpaceBounds',
					'numCubicSegments',
					'isGroup',
					'isDrawingObject',
					'contours'
				]		
			});
			settings.extend(options,true);
			return ext.Element.prototype.is.call(this,element,settings);
		}
	}
	ext.extend({Shape:ExtensibleShape});
})(extensible);
