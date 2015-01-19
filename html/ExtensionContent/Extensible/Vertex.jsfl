(function(ext){
	function ExtensibleVertex(point,options){
		var settings=new ext.Object({
			//halfEdge:undefined,
			//edge:undefined,
			//index:undefined,
			//shape:undefined
		});
		settings.extend(options);
		if(point instanceof Vertex){
			this.$=point;
		}else if(point instanceof this.type){
			this.$=point.$;
		}else{
			this.$=new Vertex();
		}
		if(settings.shape instanceof Shape){
			settings.shape=new ext.Shape(this.shape);
		}
		ext.Point.apply(this,[settings]);
		return this;
	}
	ExtensibleVertex.prototype={
		__proto__:ext.Point.prototype,
		type:ExtensibleVertex,
		getHalfEdge:function(){
			if(this.$){
				return new ext.HalfEdge(
					this.$.getHalfEdge(),
					{
						shape:this.shape
					}
				);
			}
		},
		get halfEdge(){
			return this.getHalfEdge();
		},
		set halfEdge(){
			return;
		},
		get edge(){
			return this.getHalfEdge().getEdge();
		},
		set edge(){
			return;
		},
		setLocation:function(x,y){
			var args=Array.prototype.slice.call(arguments);
			var location=new this.type(x,y);
			if(this.$){
				return this.$.setLocation(location.x,location.y);
			}
		},
		get id(){
			return this.halfEdge.id;
		},
		set id(s){
			this.halfEdge.id=s;
		},
		get index(){
			return this.halfEdge.index;
		},
		set index(s){
			this.halfEdge.index=s;
		}
	};
	ext.extend({Vertex:ExtensibleVertex});
})(extensible)
