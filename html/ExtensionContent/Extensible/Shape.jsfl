(function(ext){
	function ExtensibleShape(shape,options){
		ext.Element.apply(this,arguments);
		this._cubicSegmentPoints = this._cubicSegmentPoints||{};
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
				if(ext.log)var timerCSPL=ext.log.startTimer('Extensible.Shape.getCubicSegmentPoints()');
				var settings=new ext.Object({
					shape:this,
					edge:undefined
				});
				settings.extend(options);
				var cachePoints = this._cubicSegmentPoints[cubicSegmentIndex];
				if(cachePoints){
					if(ext.log)ext.log.pauseTimer(timerCSPL);
					return cachePoints;
				}

				var csp = this.$.getCubicSegmentPoints(cubicSegmentIndex);
				var points=new ext.Curve();
				for(var i=0;i<csp.length;i++){
					points.push(
						new ext.Point(csp[i],settings)
					);
				}
				this._cubicSegmentPoints[cubicSegmentIndex] = points;

				if(ext.log)ext.log.pauseTimer(timerCSPL);

				return points;
			}else{
				return;
			}
		},
		get contours(){
			if(!this.$){return;}
			if(this.cache['contours']){
				return this.cache.contours;
			}else{
				return this.getContours();
			}
		},
		getContours:function(){
			var contours=new ext.Array();
			for(var i=0;i<this.$.contours.length;i++){
				var c=new ext.Contour(this.$.contours[i],{shape:this});
				var matched=false;
				for(var n=0;n<contours.length;n++){
					if(c.edgeIDs.is(contours[n].edgeIDs)){
						matched=true;
						if(c.interior){
							c.oppositeFill=contours[n].fill;
							//contours[n].oppositeFill=c.fill;
						}
						contours[n]=c;
						break;
					}
				}
				if(!matched){
					contours.push(c);
				}
			}
			this.cache.contours=contours;
			return contours;
		},
		set contours(c){this.cache.contours=c;},
		get edges(){
			if(this.$){
				if(this.cache.edges){
					return this.cache.edges;
				}
				var edges=new ext.Array();
				var e=this.$.edges;
				for(var i=0;i<e.length;i++){
					edges.push(new ext.Edge(this.$.edges[i]));
				}
				this.cache.edges=edges;
				return edges;
			}
		},
		set edges(edges){
			this.cache.edges=edges;
		},
		get isDrawingObject(){
			if(this.$){
				return this.$.isDrawingObject;
			}
		},
		set isDrawingObject(){},
		get isGroup(){
			if(this.$){
				return(this.$.isGroup);
			}
		},
		set isGroup(){},
		get isOvalObject(){
			return this.$.isOvalObject;
		},
		set isOvalObject(){},
		get isRectangleObject(){
			if(this.$){
				return this.$.isRectangleObject;
			}
		},
		set isRectangleObject(){},
		get members(){
			if(this.$){
				var members=new ext.Selection(
					this.$.members,
					( // ! - important ( bugfix )
						this.hasOwnProperty('parent') ?
						{ 
							parent:new this.type(this)
						}:{ 
							parent:this
						}
					)
				);
				return members;				
			}
		},
		set members(s){},
		get numCubicSegments(){
			if(this.cache.numCubicSegments){
				return this.cache.numCubicSegments;
			}
			if(this.$){
				this.cache.numCubicSegments=this.$.numCubicSegments;
				return this.cache.numCubicSegments;
			}
		},
		set numCubicSegments(numCubicSegments){
			this.cache.numCubicSegments=numCubicSegments;
		},
		get vertices(){
			if(this.$){
				return this.$.vertices;
			}
		},
		set vertices(){},
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
