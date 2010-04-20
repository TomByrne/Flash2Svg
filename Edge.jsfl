(function(dx){
	function ExtensibleEdge(edge,options){//extends Edge
		if(edge instanceof Edge){
			this.$=edge;
		}else if(edge instanceof this.type){
			this.$=edge.$;
		}else{
			this.$=new Edge();
		}
		dx.Object.apply(this,[options]);
		if(this.shape instanceof Shape){
			this.shape=new dx.Shape(this.shape);
		}
		return this;
	}
	ExtensibleEdge.prototype={
		__proto__:dx.Object.prototype,
		$:Edge,
		shape:null,
		type:ExtensibleEdge,
		//built in methods
		getControl:function(i){return new dx.Point(this.$.getControl(i));},
		getHalfEdge:function(index){return new dx.HalfEdge(this.$.getHalfEdge(index),{shape:this.shape});},
		setControl:function(index, x, y){return this.$.setControl(index, x, y);},
		splitEdge:function(t){return this.$.splitEdge(t);},
		//built in properties
		get cubicSegmentIndex(){return this.$.cubicSegmentIndex;},
		get id(){return this.$.id;},
		set id(s){this.$.id=s;},
		get isLine(){return this.$.isLine;},
		set isLine(s){this.$.isLine=s;},
		get stroke(){
			if(this.$.stroke){
				return new dx.Stroke(this.$.stroke);
			}else{
				return;
			}
		},
		set stroke(s){this.$.stroke=s;},
		is:function(e){
			var c0=this.getControl(0);
			var c1=this.getControl(1);
			var c2=this.getControl(2);
			var cp0,cp1;
			if(c0&&c1&&c2){
				cp0=new dx.Array([c0,c1,c2]);
				cp1=new dx.Array([e.getControl(0),e.getControl(1),e.getControl(2)]);
			}else{
				cp0=new dx.Array([this.getHalfEdge(0).getVertex(),this.getHalfEdge(1).getVertex()]);
				cp1=new dx.Array([e.getHalfEdge(0).getVertex(),e.getHalfEdge(1).getVertex()]);
			}
			return cp0.is(cp1);
		}
	}
	dx.extend({Edge:ExtensibleEdge});
})(dx)
