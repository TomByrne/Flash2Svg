(function(ext){
	function ExtensibleContour(contour,options){
		if(contour instanceof Contour){
			this.$=contour;
		}else if(contour instanceof this.type){
			this.$=contour.$;
			ext.Object.apply(this,contour);
		}else{
			this.$=new Contour();
		}
		if(options.shape instanceof ext.Shape){
			this.shape=options.shape;
		}else if(options.shape instanceof Shape){
			this.shape=new ext.Shape(options.shape);
		}
		this.cache=new ext.Object({
			controlPoints:new ext.Array(),
			cubicSegmentPoints:new ext.Array()
		});
		return this;
	}
	ExtensibleContour.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensibleContour,
		getHalfEdge:function(){
			return new ext.HalfEdge(
				this.$.getHalfEdge(),
				{
					shape:this.shape
				}
			);
		},
		get edges(){
			if(this.cache['edges']){
				return this.cache.edges;
			}else{
				return this.getEdges();
			}
		},
		set edges(){
			return;
		},
		get fill(){return new ext.Fill(this.$.fill);},
		set fill(s){this.$.fill=s;},
		get interior(){return this.$.interior;},
		set interior(){},
		get orientation(){return this.$.orientation;},
		set orientation(){},
		get edgeIDs(){
			if(this.cache['edgeIDs']){return this.cache.edgeIDs;}
			return this.getEdgeIDs();
		},
		set edgeIDs(s){
			return;
		},
		get oppositeFill(){
			if(this.cache['oppositeFill']===undefined){
				this.cache.oppositeFill=this.getOppositeFill();
			}
			return this.cache.oppositeFill;
		},
		set oppositeFill(s){
			this.cache['oppositeFill']=s;
		},
		get oppositeContours(){
			if(this.cache['oppositeContours']===undefined){
				this.cache.oppositeContours=this.getOppositeContours();
			}
			return this.cache.oppositeContours;
		},
		set oppositeContours(s){
			this.cache.oppositeContours=s;
		},
		getEdgeIDs:function(){
			return this.getEdges(true);
		},
		getEdges:function(bIDs){
			var edges=new ext.Array();
			var edgeIDs=new ext.Array();
			var he=this.getHalfEdge();
			var prevPoints;
			var ctrlPoints=new ext.Array();
			var start=he.id;
			var id;
			while(id!=start){
				var e=he.getEdge();
				if(edges.indexOf(e.id)<0){
					edges.push(e);
					edgeIDs.push(e.id);
				}
				he=he.getNext();
				id=he.id;
			}
			edgeIDs.sort(function(a,b){return(a-b);});
			this['cache']['edgeIDs']=edgeIDs;
			this['cache']['edges']=edges;
			return bIDs?edgeIDs:edges;
		},
		getOppositeFill:function(){
			var edgeIDs=this.edgeIDs;
			var contours=this.shape.contours;
			for(var i=0;i<contours.length;i++){
				if(contours[i].edgeIDs.is(edgeIDs)){
					this.cache.oppositeFill=contours[i].fill;
					return contours[i].fill;
				}
			}
		},
		getOppositeContours:function(){
			var edgeIDs=this.edgeIDs;
			this.cache.oppositeContours=new ext.Array();
			var contours=this.shape.contours;
			for(var i=0;i<contours.length;i++){
				if(contours[i].fill.is(this.fill) && !contours[i].edgeIDs.intersect(edgeIDs).length==0){
					this.cache.oppositeContours.push(contours[i]);
				}
			}
			return this.cache.oppositeContours;
		},
		getControlPoints:function(options){
			var settings=new ext.Object({
				curveDegree:2, // quadratic ( 2 ) or cubic ( 3 )
				reversed:false,
				decimalPointPrecision:0,
				matrix:undefined
			});
			settings.extend(options);
			var controlPoints,edges;
			var useCache=false;
			var cacheID=settings.curveDegree==2?'controlPoints':'cubicSegmentPoints';
			if(this.cache && this.cache[cacheID] && this.cache[cacheID].length>0){
				useCache=true;
				controlPoints=this.cache[cacheID];
			}else{
				var points=new ext.Array();
				var strokes=new ext.Array();
				var edgs=new ext.Array();
				var edgeIDs=new ext.Array();
				var he=this.getHalfEdge();
				var used=[];
				var start=he.id;
				var id;
				if(ext.log){
					var timerCPL=ext.log.startTimer('Contour point lookup.');
				}
				while(id!=start){ // traverse the contour and acquire control point data.
					var e=he.getEdge();
					if(edgeIDs.indexOf(e.id)<0){
						edgeIDs.push(e.id);
					}else{
						he=he.getNext();
						id=he.id;
						continue;
					}
					var cp=new ext.Array();
					if(settings.curveDegree==3){
						if(e.isLine){
							var c0=e.getControl(0);
							if(c0){
								var c2=e.getControl(2);
								if(c2){
									cp.extend([c0,c2]);
								}
							}
						}else{
							if(e.cubicSegmentIndex){
								cp=this.shape.getCubicSegmentPoints(
									e.cubicSegmentIndex,
									{
										edge:e
									}
								);
							}else{
								var c0=e.getControl(0);
								if(c0){
									var c1=e.getControl(1);
									if(c1){
										var c2=e.getControl(2);
										if(c2){
											cp.extend([c0,c1,c2]);
										}
									}
								}
								if(cp.length){
									cp=new ext.Array([c0,c1,c2]);
								}else{
									var ohe=he.getOppositeHalfEdge();
									if(ohe){
										var ov=ohe.getVertex();
										if(ov){
											var v=he.getVertex();
											if(v){
												cp.extend([v,ov]);
											}
										}
									}
								}
							}
						}
					}else{
						var c0=e.getControl(0);
						if(c0){
							var c1=e.getControl(1);
							if(c1){
								var c2=e.getControl(2);
								if(c2){
									cp=new ext.Array([c0,c1,c2]);
								}
							}
						}
					}
					if(ext.progressbar){ext.progressbar.progress;}
					if(cp.length>0 && (points.length==0 || !cp.is(points[points.length-1]))){				
						cp.halfEdge=he;
						cp.edgeID=e.id;
						//cp.edge=e;
						points.push(cp);
						edgs.push(e);
					}
					he=he.getNext();
					id=he.id;
				}
				if(ext.log){
					ext.log.pauseTimer(timerCPL);
				}
				edgeIDs.sort(function(a,b){return(a-b);});
				this.cache['edgeIDs']=edgeIDs;
				if(points.length==0){return;}
				controlPoints=new ext.Array([]);
				points[points.length-1].remove();
				var deg=points[points.length-1].length-1;
				var edges=new ext.Array([]);
				if(ext.log){
						var timerPOC=ext.log.startTimer('Contour point order check.');
				}
				for(var i=0;i<points.length;i++){ // Check to make sure that all points are correctly ordered and do not overlap.
					var prev=i>0?i-1:points.length-1;
					var next=i<points.length-1?i+1:0;
					var prevdegree=deg;
					points[i].remove();
					deg=points[i].length-1;
					he=points[i].halfEdge;
					e=points[i].edge;
					var edgeID=points[i].edgeID;
					if(
						points[i].length<2 ||
						(
							points[i].length==2 &&
							points[i][0].is(points[i][1])
						)
					){
						continue;
					}
					if(settings.curveDegree==3){
						
						if(
							!points[i][0].is(points[prev][prevdegree])
						){
							if(
								points[i][deg].is(points[prev][0]) 
							){
								points[prev].reverse();
								points[i].reverse();
							}else if(
								points[i][0].is(points[prev][0])
							){
								points[prev].reverse();
							}else if(
								points[i][deg].is(points[prev][prevdegree])
							){
								points[i].reverse();
							}
							if(points[prev][prevdegree].indexOfClosestTo(points[i])==deg){
								points[i].reverse();
							}
							if(points[i][0].indexOfClosestTo(points[prev])==0){
								points[prev].reverse();
							}
						}
					}
					if(
						(
							(i==0) ||
							(
								!points[i].is(points[0]) &&
								!points[i].is(points[0].reversed)
							)
						)
					){
						if( // get rid of anomalies
							prevdegree<2&&
							(points[prev][prevdegree].indexOfClosestTo(points[i])!=0)							
						){
							controlPoints.pop();
							edges.pop();
						}
						if( // double check before adding control points
							deg>1||
							points[i][0].indexOfClosestTo(points[prev])==prevdegree
						){
							points[i].halfEdge=he;
							//points[i].edge=e;
							points[i].edgeID=edgeID;
							controlPoints.push(points[i]);
							edges.push(edgs[i]);
						}
					}
				}
				this.cache[cacheID]=controlPoints;
				this.cache.edges=edges;
			}
			if(ext.log){
				ext.log.pauseTimer(timerPOC);
			}
			if(settings.reversed!==false){
				controlPoints.reverse(true);
			}
			return controlPoints;
		},
		is:function(c){
			return(this.edgeIDs.is(c.edgeIDs) && this.fill.is(c.fill));
		}
	}
	ext.extend({Contour:ExtensibleContour});
})(extensible);
