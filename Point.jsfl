(function(ext){
	function ExtensiblePoint(point,options){		
		var settings=new ext.Object({
			//halfEdge:undefined,
			//edge:undefined,
			//id:undefined
		});
		settings.extend(options);
		ext.Object.apply(this,[settings]);
		point=point!==undefined?point:{};
		if(typeof(point)=='string'){
			point=point.match(/[\d\.\-]*[\d\.]/g);
		}
		if(point instanceof Array){
			this.x=point[0]!==undefined?Number(point[0]):0.0;
			this.y=point[1]!==undefined?Number(point[1]):0.0;	
		}else if(typeof(point)=='number'){
			this.x=point;
			if(typeof(options)=='number'){
				this.y=options;
				delete options;
			}
		}else{
			this.x=point.x!==undefined?Number(point.x):0.0;
			this.y=point.y!==undefined?Number(point.y):0.0;
		}
		if(isNaN(this.x)){this.x=0;}
		if(isNaN(this.y)){this.y=0;}
		if(settings.edge instanceof Edge){
			settings.edge=new ext.Edge(
				edge,
				{
					shape:settings.shape	
				}
			);	
		}
		return this;
	}
	ExtensiblePoint.prototype={
		__proto__:ext.Object.prototype,
		type:ExtensiblePoint,
		is:function(p,options){
			var settings=new ext.Object({
				tolerance:0.1
			});
			settings.extend(options);
			if(p){
				if(settings.tolerance){
					return(this.distanceTo(p)<=settings.tolerance);
				}else{
					return(
						p.x==this.x && 
						p.y==this.y
					);
				}
			}
		},
		set:function(p){
			var p=new this.type(p);
			this.x=p.x;
			this.y=p.y;
		},
		transform:function(mx){
			mx=new ext.Matrix(mx);
			var mx=new this.type({
				x:this.x*mx.a+this.y*mx.c+mx.tx,
				y:this.x*mx.b+this.y*mx.d+mx.ty
			},this);
			return mx;
		},
		difference:function(p){
			return new this.type({x:this.x-p.x,y:this.y-p.y},this);
		},
		add:function(p){
			return new this.type(
				{x:this.x+p.x,y:this.y+p.y},this
			);
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
			var p=new this.type(this);
			p=p.normalized;
			this.x=p.x*length;
			this.y=p.y*length;
		},
		getTangent:function(p){
			return p.difference(this).normalized;
		},
		rotate:function(angle){
			angle=-angle*(Math.PI/180);
			return new this.type({
				x:Math.roundTo(this.x*Math.cos(angle)-this.y*Math.sin(angle),10),
				y:Math.roundTo(this.x*Math.sin(angle)+this.y*Math.cos(angle),10)
			},this);
		},
		get normalized(){
			var length=this.length;
			return new this.type({
				x:this.x/length,
				y:this.y/length
			},this);
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
			},this);
		}
	};
	ext.extend({Point:ExtensiblePoint});
})(extensible)
