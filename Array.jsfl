(function(dx){
	var ExtensibleArray=function(){
		if(arguments.length==1 && arguments[0].constructor.name=='Array')
			Array.prototype.splice.apply(this,[0,0].concat(Array.prototype.slice.call(arguments[0])));
		else if(arguments.length>1)
			Array.prototype.splice.apply(this,[0,0].concat(Array.prototype.slice.call(arguments)));	
		else
			this.length=0;	
		return this;
	}
	ExtensibleArray.prototype={
		__proto__:Array.prototype,
		type:ExtensibleArray,
		ccJoin:function(capitalize){//[camel,casing] >> camelCasing
			output="";
			for(var i=0;i<this.length;i++){
				var n=String(this[i]);
				output+=i==0 && !capitalize ? n : n[0].toUpperCase()+n.slice(1);
			}
			return output;
		},
		extend:function(ilist){
			if(arguments.length==0) return this.clone();
			if(arguments.length==1 && arguments[0].constructor.name=='Array'){
				ilist=arguments[0];
			}else{
				ilist=Array.prototype.slice.call(arguments);
			}
			if(ilist.length==0) return this.clone();
			ilist=ilist.filter(function(element,index,array){
					return(this.indexOf(element)<0);
			},this);
			if(ilist.length) return this.concat(ilist);
			else return this.clone();
		},
		clear:function(nlist){
			if(nlist) this.splice(0,this.length,nlist);
			else this.splice(0,this.length);
			return this;
		},
		clone:function(rlist){
			return dx.Object.prototype.clone.call(this,rlist);
		},
		intersect:function(ilist){
			if(arguments.length==0) return this.clone().clear();
			if(arguments.length==1 && arguments[0].constructor.name=='Array'){
				ilist=arguments[0];
			}else{
				ilist=Array.prototype.slice.call(arguments);
			}
			if(ilist.length==0) return this.clone().clear();
			return this.filter(function(element,index,array){
				return(ilist.indexOf(element)>=0);
			},this);
		},
		remove:function(rlist){
			if(arguments.length==1 && arguments[0].constructor.name=='Array'){
				rlist=arguments[0];
			}else{
				rlist=Array.prototype.slice.call(arguments);
			}
			return this.filter(function(element,index,array){
				return(rlist.indexOf(element)<0);
			},this);
		},
		concat:function(){
			var c=this.clone();
			for(var i=0;i<arguments.length;i++){
				if(arguments[i].constructor.name=='Array'){
					for(var n=0;n<arguments[i].length;n++){
						c.push(arguments[i][n]);				
					}
				}
			}
			return c;
		},
		filter:function(){
			var args=Array.prototype.slice.call(arguments);
			return(
				this.length?
				new this.type(Array.prototype.filter.apply(this,args)):
				new this.type()
			);
		}
	}
	dx.extend({Array:ExtensibleArray});
})(dx)