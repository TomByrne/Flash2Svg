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
		//properties
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
		}
	}
	dx.extend({Contour:ExtensibleContour});
})(dx);
