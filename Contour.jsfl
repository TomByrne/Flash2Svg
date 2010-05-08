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
		this.cache=new ext.Object({controlPoints:new ext.Array()});
		return this;
	}
	ExtensibleContour.prototype={
		__proto__:ext.Object.prototype,
		$:Contour,
		type:ExtensibleContour,
		getHalfEdge:function(){return new ext.HalfEdge(this.$.getHalfEdge(),{shape:this.shape});},
		get fill(){return new ext.Fill(this.$.fill);},
		set fill(s){this.$.fill=s;},
		get interior(){return this.$.interior;},
		set interior(){},
		get orientation(){return this.$.orientation;},
		set orientation(){},
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
		getEdgeIDs:function(){
			var edges=new ext.Array();
			var he=this.getHalfEdge();
			var prevPoints;
			var ctrlPoints=new ext.Array();
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
		is:function(c){
			return(this.edgeIDs.is(c.edgeIDs) && this.fill.is(c.fill));
		}
	}
	ext.extend({Contour:ExtensibleContour});
})(extensible);
