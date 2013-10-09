(function(ext){
	function Curve(points){
		ext.Array.apply(this,arguments);
		for(var i=0;i<this.length;i++){
			if(!this[i] instanceof ext.Point){
							fl.trace("new ext.Point");
				this[i]=new ext.Point(this[i]);
			}
		}
		return this;
	}
	Curve.prototype={
		__proto__:ext.Array.prototype,
		type:Curve,
		get isLine(){
			this.removeDuplicates();
			if(this.length<3){
				return true;
			}
			var sorted=(new this.type(this)).sort(
				function(a,b){
					return a.length-b.length;
				}
			);
			var directionVector=this[1].difference(this[0]).normalized;
			for(var i=2;i<sorted.length;i++){
				if(
					!this[i].difference(this[i-1]).normalized.is(
						directionVector
					)
				){
					return false;	
				}
			}
			return true;
		},
		set isLine(){},
		push:function(){
			var args=Array.prototype.slice.call(arguments);
			for(var i=0;i<args.length;i++){
				if(!args[i] instanceof ext.Point){
					args[i]=new ext.Point(args[i]);
				}
			}
			Array.prototype.push.apply(this,args);	
		},
		unshift:function(){
			var args=Array.prototype.slice.call(arguments);
			for(var i=0;i<args.length;i++){
				if(!args[i] instanceof ext.Point){
					args[i]=new ext.Point(args[i]);
				}
			}
			Array.prototype.unshift.apply(this,args);
		},
		simplify:function(){
			if(this.isLine){
				this.splice(1,this.length-2);
			}	
		}
	}
	ext.extend({
		Curve:Curve
	});
})(extensible)