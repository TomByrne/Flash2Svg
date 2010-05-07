(function(dx){
	function ExtensiblePoint(point){
		this.x=point && point.x ? point.x : 0.0;
		this.y=point && point.y ? point.y : 0.0;
		return this;
	}
	ExtensiblePoint.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensiblePoint,
		is:function(p){
			return(p.x==this.x && p.y==this.y);	
		},
		transform:function(mx){
			mx=new dx.Matrix(mx);
			return new this.type({
				x:this.x*mx.a+this.y*mx.c+mx.tx,
				y:this.x*mx.b+this.y*mx.d+mx.ty
			});
		},
		difference:function(p){
			return new this.type({x:this.x-p.x,y:this.y-p.y});
		},
		distanceTo:function(p){
			return fl.Math.pointDistance(this,p);
		},
		midPoint:function(p,weight){
			weight=weight||.5;
			var mp=new this.type();
			mp.x=(weight*p.x)+((1-weight)*this.x);
			mp.y=(weight*p.y)+((1-weight)*this.y);
			return mp;			
		},
		reflect:function(mp){
			return mp.difference(this.difference(mp));
		},
		get length(){
			return Math.sqrt(Math.pow(this.x,2)+Math.pow(this.y,2));
		},
		get normalized(){
			var length=this.length;
			return new dx.Point({
				x:this.x/length,
				y:this.y/length
			});
		},
	}
	dx.extend({Point:ExtensiblePoint});
})(dx)
