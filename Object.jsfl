(function(){
	function ExtensibleObject(obj){
		Object.apply(this,arguments);
		var args=Array.prototype.slice.call(arguments);
		if(obj){
			for(var i in obj){
				this[i]=obj[i];
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
				if(rlist.indexOf(this[i])<0 && typeof(this[i])!=undefined){
					if(!c.__lookupGetter__(i)){
						if(this[i] && this[i].clone){
							c[i]=this[i].clone(rlist);
						}
						else if(this[i]){
							c[i]=(this[i]);
						}
					}
				}
			}
			if(this.length!=undefined){
				c.length=this.length;
			}
			return c;

		},
		extend:function(obj){
			for(var n in obj){
				this[n]=obj[n];
			}
		},
		is:function(o){
			for(var i in o){
				if(this[i]!=o[i] && !(this[i]['is'] && o[i]['is'] && this[i].is(o[i]))){
					return false;
				}
			}
			return true;
		}
	}
	dx.extend({Object:ExtensibleObject});
})()