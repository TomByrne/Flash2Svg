(function(dx){
	function ExtensibleTimeline(){
		Timeline.apply(this,arguments);
		var args=Array.prototype.slice.call(arguments);
		if(args.length){
			for(var i in args[0]){
				this[i]=args[0][i];
			}
		}
		return this;
	}
	ExtensibleTimeline.prototype={
		__proto__:dx.Object.prototype,
		type:ExtensibleTimeline,
		get elements(){
			var e=new dx.Selection();
			var keyframes=new dx.Array(this.keyframes);
			for(var k=0;k<keyframes.length;k++){
				e=e.concat(keyframes[k].elements);
			}
			return e;
		},
		set elements(){},
		get frames(){
			var f=new dx.Array();
			var layers=new dx.Array(this.layers);
			for(var l=0;l<layers.length;l++){
				f=f.concat(layers[l].frames);
			}
			return f;			
		},
		set frames(){},
		get keyframes(){
			var k=new rray();
			var layers=new dx.Array(this.layers);
			for(var l=0;l<layers.length;l++){
				var frames=layers[l].frames;
				for(var f=0;f<frames.length;f++){
					if(f==frames[f].startFrame){
						k.push(frames[f]);
					}
				}
			}
			return k;			
		},
		set keyframes(){},
		clone:function(rlist){
			return dx.Object.prototype.clone.call(this,rlist);
		}
	}
	dx.extend({Timeline:ExtensibleTimeline});
})(dx);
