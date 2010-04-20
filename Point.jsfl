(function(dx){
	function ExtensiblePoint(point,options){
		this.x=point.x;
		this.y=point.y;
		dx.Object.apply(this,[options]);
		return this;
	}
	ExtensiblePoint.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensiblePoint,
		x:null,
		y:null,
		t:null,
		distance:null,
		is:function(p){
			return(p.x==this.x && p.y==this.y);	
		}
	}
	dx.extend({Point:ExtensiblePoint});
})(dx)
