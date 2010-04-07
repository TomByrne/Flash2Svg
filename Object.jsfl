(function(){
	function ExtensibleObject(){
		Object.apply(this,arguments);
		var args=Array.prototype.slice.call(arguments);
		if(args.length){
			for(i in args[0]){
				this[i]=args[0][i];
			}
		}
		return this;
	}
	ExtensibleObject.prototype={
		__proto__:Object.prototype,
		type:ExtensibleObject,
		clone:function(rlist){
			typ=this.type?this.type:ExtensibleObject;
			rlist=rlist?rlist:[];
			rlist.push(typ);
			var c=new typ();
			for(var i in this){
				if(rlist.indexOf(this[i])<0 && typeof(this[i])!='undefined'){
					if(this[i].clone){
						c[i]=this[i].clone(rlist);
					}
					else{
						c[i]=(this[i]);
					}
				}
			}
			if(this.length!=undefined)
				c.length=this.length;
			return c;

		},
		extend:function(obj){
			for(var n in obj){
				this[n]=obj[n];
			}
		}
	}
	dx.extend({Object:ExtensibleObject});
})()