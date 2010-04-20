(function(dx){
	function ExtensibleContour(contour,options){
		if(contour instanceof Contour){
			this.$=contour;
		}else if(contour instanceof this.type){
			this.$=contour.$;
		}else{
			this.$=new Contour();
		}
		if(options.shape instanceof dx.Shape){
			this.shape=options.shape;
		}else if(options.shape instanceof Shape){
			this.shape=new dx.Shape(options.shape);
		}
		this.cache=new dx.Object({controlPoints:new dx.Array()});
		return this;
	}
	ExtensibleContour.prototype={
		__proto__:dx.Object.prototype,
		$:Contour,
		shape:null,
		type:ExtensibleContour,
		//built in methods
		getHalfEdge:function(){return new dx.HalfEdge(this.$.getHalfEdge(),{shape:this.shape});},
		//built in properties
		get fill(){return new dx.Fill(this.$.fill);},
		set fill(s){this.$.fill=s;},
		get interior(){return this.$.interior;},
		set interior(){},
		get orientation(){return this.$.orientation;},
		set orientation(){},
		//
		get edgeIDs(){
			if(this.cache && this.cache['edgeIDs']){return this.cache.edgeIDs;}
			return this.getEdgeIDs();
		},
		set edgeIDs(s){},
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
		//methods
		getSVG:function(options){
			var settings=new dx.Object({
				degree:2,
				matrix:dx.doc.viewMatrix,
				reversed:false
			});
			settings.extend(options);
			if(settings.degree!=3 && settings.degree!=2){settings.degree=2;}
			var controlPoints;
			var edges;
			if(this.cache && this.cache.controlPoints && this.cache.controlPoints.length>0){
				controlPoints=this.cache.controlPoints;
				edges=this.cache.edges;
			}else{
				var points=new dx.Array();
				var strokes=new dx.Array();
				var edgs=new dx.Array();
				var edgeIDs=new dx.Array();
				var he=this.getHalfEdge();
				var used=[];
				var start=he.id;
				var id;
				while(id!=start){//Traverse the contour and acquire control point data.
					var v=he.getVertex();
					var e=he.getEdge();
					if(edgeIDs.indexOf(e.id)<0){
						edgeIDs.push(e.id);
					}else{
						he=he.getNext();
						id=he.id;
						continue;
					}
					var cp;
					if(settings.degree==3){
						if(e.isLine){
							cp=new dx.Array([e.getControl(0),e.getControl(2)]);
						}else{
							if(e.cubicSegmentIndex){
								var csp=this.shape.getCubicSegmentPoints(e.cubicSegmentIndex);
								cp=new dx.Array(csp);
							}else{
								var c0=new dx.Point(e.getControl(0));
								var c1=new dx.Point(e.getControl(1));
								var c2=new dx.Point(e.getControl(2));
								if(c0 && c1 && c2){
									cp=new dx.Array([c0,c1,c2]);
								}else{
									var ohe=he.getOppositeHalfEdge();
									if(ohe){
										var ov=ohe.getVertex();
										if(ov){
											cp=new dx.Array([new dx.Point(v),new dx.Point(ov)]);
										}
									}
								}
							}
						}
					}else{
						cp=new dx.Array([e.getControl(0),e.getControl(1),e.getControl(2)]);
					}
					var direction=v.is(e.getHalfEdge(0).getVertex())?0:1;
					if(direction==1){cp=cp.reverse();}
					if(cp.length>0 && (points.length==0 || !cp.is(points[points.length-1]))){				
						points.push(cp);
						edgs.push(e);
					}
					he=he.getNext();
					id=he.id;
				}
				edgeIDs.sort(function(a,b){return(a-b);});
				this.cache['edgeIDs']=edgeIDs;
				if(points.length==0){return;}
				controlPoints=new dx.Array([points[0]]);
				var deg=points[0].length-1;
				var deg0=deg;
				var edges=new dx.Array([edgs[0]]);
				for(var i=1;i<points.length;i++){//Check to make sure that all points are correctly ordered and do not overlap.
					var prevdegree=deg;
					deg=points[i].length-1;
					if(settings.degree==3){
						if(!points[i][0].is(points[i-1][prevdegree])){
							if(points[i][0].is(points[i-1][0])){
								points[i-1]=points[i-1].reverse();
							}else if(points[i][deg].is(points[i-1][0])){
								points[i-1]=points[i-1].reverse();
								points[i]=points[i].reverse();
							}
							if(fl.Math.pointDistance(points[i][0],points[i-1][prevdegree])>fl.Math.pointDistance(points[i][deg],points[i-1][prevdegree])){
								points[i]=points[i].reverse();
							}
						}
					}
					var overlap=false;
					if(i==points.length-1){
						overlap=true;
						for(var n=0;n<=deg && n<=deg0;n++){
							if(
								(points[i][n].x!=points[0][n].x || points[i][n].y!=points[0][n].y)
							){
								overlap=false;
								break;
							}
						}
					}
					if(!overlap){
						controlPoints.push(points[i]);
						edges.push(edgs[i]);
					}
				}
				this.cache.controlPoints=controlPoints;
				this.cache.edges=edges;
			}
			var fills=new dx.Array();
			var paths=new dx.Array();
			var interior=false;
			if(this.interior){//Construct a curve for the enclosed shape if present.
				interior=true;
				var fill=this.fill.color||'none';
				var cdata;
				if(settings.reversed){
					var rcp=controlPoints.reverse();
					for(i=0;i<rcp.length;i++){
						rcp[i]=rcp[i].reverse();
					}
					cdata=this.svgCurveData(rcp,settings.degree,true);
				}else{
					cdata=this.svgCurveData(controlPoints,settings.degree,true);
				}
				paths.push('<path fill="'+fill+'" d="'+cdata+'" />\n');
			}
			if(edges.length>0 && !settings.reversed){//Create a contour for each length of contiguous edges w/ the same stroke attributes. Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new dx.Array([]);
				var stroke=null;
				if(edges[0].stroke && edges[0].stroke.style!='noStroke'){
					cp.push(controlPoints[0]);
					stroke=edges[0].stroke;
				}
				for(i=1;i<edges.length;i++){
					if(edges[i].stroke && edges[i].stroke.style!='noStroke'){
						if(stroke!==null && edges[i].stroke.is(stroke)){
							cp.push(controlPoints[i]);
						}else{
							if(stroke && cp.length>0){
								paths.push(
									'<path '+
									'fill="none" '+
									stroke.getSVG()+
									'd="'+this.svgCurveData(cp,settings.degree,true)+'" '+
									'/>\n'
								);
							}
							stroke=edges[i].stroke;
							cp=new dx.Array([controlPoints[i]]);
						}
					}else{
						if(stroke && cp.length>0){
							paths.push(
								'<path '+
								'fill="none" '+
								stroke.getSVG()+
								'd="'+this.svgCurveData(cp,settings.degree,true)+'" '+
								'/>\n'
							);
						}
						stroke=null;
						cp.clear();
					}
				}
				if(stroke && cp.length>0){//create the last stroke
					if(
						edges[0].stroke && edges[0].stroke.style!='noStroke' && stroke.is(edges[0].stroke)
						&& ((interior && paths.length>1) || (!interior && paths.length>0))
					){//if the stroke on the beginning of the contour matches that at the end, connect them
						var pathID=interior?1:0;
						var x=new XML(paths[pathID]);
						var cd1=this.svgCurveData(cp,settings.degree,false).trim();
						var cd2=x.@d.trim();
						var cd1Points=cd1.split(' ');
						var cd2Points=cd2.split(' ');
						var cd1ep=cd1Points.pop();
						var cd2sp=cd2Points.shift();
						if(cd1ep.replace(/[A-Za-z]/g,'')==cd2sp.replace(/[A-Za-z]/g,'')){
							x.@d=cd1Points.join(' ')+' '+cd1ep+' '+cd2Points.join(' ');
						}else{
							x.@d=cd1+' '+cd2;
						}
						if(cd1Points.shift().replace(/[A-Za-z]/g,'')==cd2Points.pop().replace(/[A-Za-z]/g,'')){
							x.@d+='z';
						}
						paths[pathID]=x.toXMLString()+'\n';
					}else{
						paths.push(
							'<path '+
							'fill="none" '+
							stroke.getSVG()+
							'd="'+this.svgCurveData(cp,settings.degree,true)+'" '+
							'/>\n'
						);
					}
				}
			}
			var xml='';
			for(var i=0;i<paths.length;i++){
				xml+=paths[i];
			}
			for(var i=0;i<fills.length;i++){
				xml+=fills[i];
			}
			return(xml);
		},
		svgCurveData:function(controlPoints,degree,close){
			close=close||true;
			var degPrefix=['M','L','Q','C'];
			var deg=controlPoints[0].length-1;
			var curveString=degPrefix[0]+controlPoints[0][0].x+","+controlPoints[0][0].y+" ";
			if(deg>0){curveString+=degPrefix[deg]+controlPoints[0][1].x+","+controlPoints[0][1].y+" ";}
			if(deg>1){curveString+=controlPoints[0][2].x+","+controlPoints[0][2].y+" ";}
			if(deg>2){curveString+=controlPoints[0][3].x+","+controlPoints[0][3].y+" ";}
			for(var i=1;i<controlPoints.length;i++){
				var prevdeg=deg;
				deg=controlPoints[i].length-1;
				if(deg!=prevdeg){curveString+=degPrefix[deg];}
				for(var n=1;n<=deg;n++){
					curveString+=controlPoints[i][n].x+","+controlPoints[i][n].y+(n==deg?"":" ");
				}
				if(close && controlPoints[i][deg].x==controlPoints[0][0].x && controlPoints[i][deg].y==controlPoints[0][0].y){//i==controlPoints.length-1 && 
					curveString+='z';
				}else{
					curveString+=" ";
				}
			}
			return curveString;
		},
		getEdgeIDs:function(){
			var edges=new dx.Array();
			var he=this.getHalfEdge();
			var prevPoints;
			var ctrlPoints=new dx.Array();
			var start=he.id;
			var id;
			while(id!=start){
				var e=he.getEdge();
				if(edges.indexOf(e.id)<0){
					edges.push(e.id);
				}
				he=he.getNext();
				id=he.id;
			}
			edges.sort(function(a,b){return(a-b);});
			this['cache']['edgeIDs']=edges;
			return edges;
		},
		getOppositeFill:function(){
			var edgeIDs=this.edgeIDs;
			var contours=this.shape.contours;
			for(var i=0;i<contours.length;i++){
				if(contours[i].edgeIDs.is(edgeIDs) ){//&& contours[i].fill.style!='noFill'
					this.cache.oppositeFill=contours[i].fill;
					return contours[i].fill;
				}
			}
			return null;
		},
		getOppositeContours:function(){
			var edgeIDs=this.edgeIDs;
			this.cache.oppositeContours=new dx.Array();
			var contours=this.shape.contours;
			for(var i=0;i<contours.length;i++){
				if(contours[i].fill.is(this.fill) && !contours[i].edgeIDs.intersect(edgeIDs).length==0){
					this.cache.oppositeContours.push(contours[i]);
				}
			}
			return this.cache.oppositeContours;
		},
		is:function(c){
			return(this.edgeIDs.is(c.edgeIDs) && this.fill.is(c.fill));
		},
		get svg(){
			return this.getSVG({degree:3});
		},
		set svg(s){},
		get controlPoints(){
			
		},
		set controlPoints(){}
	}
	dx.extend({Contour:ExtensibleContour});
})(dx);
