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
		if(!this.cache){
			this.cache=new ext.Object({
				controlPoints:new ext.Array(),
				cubicSegmentPoints:new ext.Array()
			});
		}
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
		},set edges(){},
		get fill(){
			return new ext.Fill(this.$.fill);
		},
		set fill(s){
			this.$.fill=s;
		},
		get interior(){return this.$.interior;},
		get orientation(){
			return this.$.orientation;
		},set orientation(){},	
		get edgeIDs(){
			if(this.cache['edgeIDs']){
				return this.cache.edgeIDs;
			}
			return this.getEdgeIDs();
		},set edgeIDs(){},					
		get oppositeFill(){
			if(this.cache['oppositeFill']==undefined){
				this.cache.oppositeFill=this.getOppositeFill();
			}
			return this.cache.oppositeFill;
		},
		set oppositeFill(fill){
			this.cache.oppositeFill=fill;
		},
		get oppositeFills(){
			if(this.cache['oppositeFill']===undefined){
				this.cache.oppositeFill=this.getOppositeFill();
			}
			return this.cache.oppositeFill;
		},set oppositeFills(){},
		getEdgeIDs:function(){
			return this.getEdges(true);
		},
		getEdges:function(getIDs){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.Contour.getEdges()');	
			}
			var edges=new ext.Array();
			var edgeIDs=new ext.Array();
			var he=this.getHalfEdge();
			var prevPoints;
			var ctrlPoints=new ext.Array();
			var start=he.id;
			var id;
			while(id!=start){
				var e=he.getEdge();
				if(edgeIDs.indexOf(e.id)<0){
					edges.push(e);
					edgeIDs.push(e.id);
				}
				he=he.getNext();
				id=he.id;
			}
			edgeIDs.sort(function(a,b){return(a-b);});
			this.cache['edgeIDs']=edgeIDs;
			this.cache['edges']=edges;
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return getIDs?edgeIDs:edges;
		},
		/**
		 * Retrieve adjacent fill(s).
		 * @return {extensible.Fill,extensible.Array} A fill or array of
		 * fills adjacent to [this].
		 */
		getOppositeFill:function(all){
			var edgeIDs=this.edgeIDs;
			if(all){
				this.cache.oppositeFills=new ext.Array();
				var opposites=new ext.Array();
			}
			var contours=this.shape.contours;
			for(var i=0;i<contours.length;i++){
				if(all){
					if(contours[i].edgeIDs.intersect(edgeIDs).length>0){
						this.cache.oppositeFills.push(contours[i].fill);
						opposites.push(contours[i].fill);
					}
				}else if(contours[i].edgeIDs.is(edgeIDs)){
					this.cache.oppositeFill=contours[i].fill;
					return contours[i].fill;
				}
			}
		},
		/**
		 * Retrieves a complete list of control points and/or cubic segment points, 
		 * grouped in ordered arrays. When options.degree==3, cubic segment points 
		 * are used where available. On rare occasions, cubic segment points are out 
		 * of sync with a contour's quadratic control points used for display, but are 
		 * still retrievable, and therefore are used in this output. This usually only
		 * occurs when migrating from an earlier version of flash, so in the future we
		 * may want to check the documents metadata ( RDF.Description.CreatorTool )
		 * to determine if there is need to cross-check the cubic segment points.
		 * @param {Object} options
		 * @param {Number} options.curveDegree 2 (Quadratic) or 3 (Cubic). Default:2. 2 is faster, but not as sexy.
		 * @param {Boolean} options.reversed If true, points are returned in reverse order.
		 * @result {extensible.Array} An array of arrays, each child array containing an ordered point list.
		 */
		getControlPoints:function(options){
			var settings=new ext.Object({
				curveDegree:2, // quadratic ( 2 ) or cubic ( 3 )
				reversed:false
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
				var edgeIDs=new ext.Array();
				var he=this.getHalfEdge();
				var start=he.id;
				var id;
				if(ext.log){
					var timer=ext.log.startTimer('extensible.Contour.getControlPoints() >> Point Lookup');
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
					var cp;
					if(e.isLine){
						cp=new ext.Curve([e.getControl(0),e.getControl(2)]);
						/*var c0=e.getControl(0);
						if(c0){
							var c2=e.getControl(2);
							if(c2){
								cp=new ext.Curve([c0,c2]);
							}
						}*/
					}else{//if(cp.length<2)
						if(settings.curveDegree==3){
							if(e.cubicSegmentIndex){
								cp=this.shape.getCubicSegmentPoints(
									e.cubicSegmentIndex,
									{
										edge:e
									}
								);
							}else{
								cp=new ext.Curve([e.getControl(0),e.getControl(1),e.getControl(2)]);
								/*var c0=e.getControl(0);
								if(c0){
									var c1=e.getControl(1);
									if(c1){
										var c2=e.getControl(2);
										if(c2){
											cp.extend([c0,c1,c2]);
										}
									}
								}
								if(!cp.length)
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
								}*/
							}
						}else{
							cp=new ext.Curve([e.getControl(0),e.getControl(1),e.getControl(2)]);
							/*var c0=e.getControl(0);
							if(c0){
								var c1=e.getControl(1);
								if(c1){
									var c2=e.getControl(2);
									if(c2){
										cp=new ext.Array([c0,c1,c2]);
									}
								}
							}*/
						}
					}
					if(cp.length>0 && (points.length==0 || !cp.is(points[points.length-1]))){				
						cp.edge=e;
						points.push(cp);
					}
					he=he.getNext();
					id=he.id;
				}
				if(ext.log){
					ext.log.pauseTimer(timer);
				}
				edgeIDs.sort(function(a,b){return(a-b);});
				this.cache['edgeIDs']=edgeIDs;
				if(points.length==0){return;}
				controlPoints=new ext.Array([]);
				points[points.length-1].remove();
				var deg=points[points.length-1].length-1;
				var edges=new ext.Array([]);
				if(ext.log){
					var timer2=ext.log.startTimer('extensible.Contour.getControlPoints() >> Order Check');
				}
				var removeNum=0;
				var isLine,nextIsLine,prevIsLine;
				for(var i=0;i<points.length;i++){ // Check to make sure that all points are correctly ordered and do not overlap.
					var prev=i>0?i-1-removeNum:points.length-1;
					var next=i<points.length-1?i+1:0;
					var prevdegree=points[prev].length-1;
					var nextdegree=points[next].length-1;
					points[i].remove();
					deg=points[i].length-1;
					if( // an edge needs 2 points !
						points[i].length<2 ||
						(
							points[i].length==2 &&
							points[i][0].is(points[i][1])
						)
					){
						continue;
					}
					if( // ! important 
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
					if(i<points.length){
						prevIsLine=(i>0 && !removeNum)?isLine:points[prev].isLine;			
						isLine=i>0?nextIsLine:points[i].isLine;
						nextIsLine=points[next].isLine;
						var folded=(
							i>0 &&
							points[i].is(points[prev].reversed) || 
							(
								isLine && 
								prevIsLine && 
								points[i][deg].is(points[prev][0]) &&
								points[i][0].is(points[prev][prevdegree])
							)
						);
						var overlapped=(
							points[i].is(points[next]) || 
							(
								isLine && 
								nextIsLine && 
								points[i][deg].is(points[next][nextdegree]) &&
								points[i][0].is(points[next][0])
							)
						);
						var removeLast=false;
						if( // ... ! important
							folded || (
								!overlapped &&
								prevIsLine &&
								isLine &&
								points[prev][0].is(points[i][0])
							)
						){
							if(removeNum==0){
								removeNum=1;
							}
							removeLast=true;
						}
						if( // ... ! important
							!folded && 
							!overlapped
						){
							controlPoints.push(points[i]);
							edges.push(points[i].edge);
							removeNum=0;
						}else{
							removeNum+=1;
						}
						if(removeLast){
							if(i==0){
								points.pop();
							}else{
								controlPoints.pop();
								edges.pop();
							}	
						}						
					}
				}
				if( // When < 3 edges are present, re-ordering can reverse the contour, so double check.
					controlPoints.length<3 && controlPoints.length>0 &&
					[-1,1][Number(Boolean(controlPoints[0].isReversed))]==this.orientation
				){
					controlPoints.reverse(true);	
				}
				this.cache[cacheID]=controlPoints;
				this.cache.edges=edges;
			}
			if(ext.log){
				ext.log.pauseTimer(timer2);
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
