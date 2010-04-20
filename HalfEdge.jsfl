(function(dx){
	function ExtensibleHalfEdge(halfedge,options){//extends HalfEdge
		if(halfedge instanceof HalfEdge){
			this.$=halfedge;
		}else if(halfedge instanceof this.type){
			this.$=halfedge.$;
		}else{
			this.$=new HalfEdge();
		}
		dx.Object.apply(this,[options]);
		if(this.shape instanceof Shape){
			this.shape=new dx.Shape(this.shape);
		}
		return this;
	}
	ExtensibleHalfEdge.prototype={
		__proto__:dx.Object.prototype,
		$:HalfEdge,
		shape:null,
		type:ExtensibleHalfEdge,
		//built in methods
		getEdge:function(){return new dx.Edge(this.$.getEdge(),{shape:this.shape});},
		getNext:function(){return new dx.HalfEdge(this.$.getNext(),{shape:this.shape});},
		getOppositeHalfEdge:function(){return new dx.HalfEdge(this.$.getOppositeHalfEdge(),{shape:this.shape});},
		getPrev:function(){return new dx.HalfEdge(this.$.getPrev(),{shape:this.shape});},
		getVertex:function(){return new dx.Point(this.$.getVertex());},
		//built in properties
		get id(){return this.$.id;},
		set id(s){this.$.id=s;},
		get index(){return this.$.index;},
		set index(s){this.$.index=s;}
	}
	dx.extend({HalfEdge:ExtensibleHalfEdge});
})(dx)
