(function(ext){
	function ExtensiblePoint(point){
		point=point||{};
		if(typeof(point)=='string'){
			point=point.match(/[\d\.\-]*[\d\.]/g);
		}
		if(point instanceof Array){
			this.x=point[0]!==undefined?Number(point[0]):0.0;
			this.y=point[1]!==undefined?Number(point[1]):0.0;	
		}else{
			this.x=point.x!==undefined?Number(point.x):0.0;
			this.y=point.y!==undefined?Number(point.y):0.0;
		}
		return this;
	}
	ExtensiblePoint.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensiblePoint,
		is:function(p){
			return(p.x==this.x && p.y==this.y);
		},
		transform:function(mx){
			mx=new ext.Matrix(mx);
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
		set length(length){
			var l=this.length;
			this.x=(this.x/l)*length;
			this.y=(this.y/l)*length;
		},
		get normalized(){
			var length=this.length;
			return new ext.Point({
				x:this.x/length,
				y:this.y/length
			});
		},
		closestTo:function(points,bGetIndex){
			if(!points || !points.length){
				return;	
			}
			var closest=0;
			var closestDistance=this.distanceTo(points[0]);
			for(var i=1;i<points.length;i++){
				var distance=this.distanceTo(points[i]);
				if(distance<closestDistance){
					closest=i;
					closestDistance=distance;
				}
			}
			if(bGetIndex){
				return closest;
			}else{
				return points[closest];
			}
		},
		indexOfClosestTo:function(points){
			return this.closestTo(points,true);
		},
		roundTo:function(decimalPlaces){
			if(decimalPlaces===undefined || decimalPlaces===null){return this;}
			var multiplier=Math.pow(10,decimalPlaces);
			return new this.type({
				x:Math.round(this.x*multiplier)/multiplier,
				y:Math.round(this.y*multiplier)/multiplier
			});
		}
	}
	ext.extend({Point:ExtensiblePoint});
})(extensible)
