(function(dx){
	function ExtensiblePoint(point){
		this.x=point && point.x ? point.x : 0.0;
		this.y=point && point.y ? point.y : 0.0;
		//dx.Object.apply(this,[point]);
		return this;
	}
	ExtensiblePoint.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensiblePoint,
		t:null,
		is:function(p){
			return(p.x==this.x && p.y==this.y);	
		},
		transform:function(matrix){
			matrix=new dx.Matrix(matrix);
			var pointMatrix=new dx.Matrix({a:1,b:0,c:0,d:1,tx:this.x,ty:this.y});
			var transformed=pointMatrix.concat(matrix);
			return new this.type({x:transformed.tx,y:transformed.ty});
		},
		difference:function(p){
			return new this.type({x:this.x-p.x,y:this.y-p.y});
		},
		distanceTo:function(p){
			return fl.Math.pointDistance(this,p);
		}
	}
	dx.extend({Point:ExtensiblePoint});
})(dx)
