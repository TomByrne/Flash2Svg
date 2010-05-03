(function(dx){
	var ExtensibleArray=function(){
		if(arguments.length==1 && arguments[0] instanceof Array){
			Array.prototype.splice.apply(this,[0,0].concat(Array.prototype.slice.call(arguments[0])));
		}else if(arguments.length>1){
			Array.prototype.splice.apply(this,[0,0].concat(Array.prototype.slice.call(arguments)));	
		}else{
			this.length=0;
		}
		return this;
	}
	ExtensibleArray.prototype={
		__proto__:Array.prototype,
		type:ExtensibleArray,
		get $(){
			return Array.prototype.slice.call(this);
		},
		ccJoin:function(capitalize){//[camel,casing] >> camelCasing
			output="";
			for(var i=0;i<this.length;i++){
				var n=String(this[i]);
				output+=i==0 && !capitalize ? n : n[0].toUpperCase()+n.slice(1);
			}
			return output;
		},
		extend:function(array,recursive){
			for(var i=0;i<array.length;i++){
				this.push(array[i]);
			}
			return this;
		},
		clear:function(nlist){
			if(nlist){
				this.splice(0,this.length,nlist);
			}else{
				this.splice(0,this.length);
			}
			return this;
		},
		intersect:function(ilist){
			if(!ilist || ilist.constructor.name!='Array'){return new this.type();}
			if(ilist.length==0) return new this.type();
			ilist=new this.type(ilist);
			return this.filter(function(element,index,array){
				return(ilist.indexOf(element)>=0);
			},this);
		},
		remove:function(rlist){
			if(arguments.length==1 && arguments[0] instanceof Array){
				rlist=arguments[0];
			}else{
				rlist=Array.prototype.slice.call(arguments);
			}
			return this.filter(function(element,index,array){
				return(rlist.indexOf(element)<0);
			},this);
		},
		concat:function(){
			var c=new this.type(this);
			for(var i=0;i<arguments.length;i++){
				if(arguments[i].constructor.name=='Array'){
					for(var n=0;n<arguments[i].length;n++){
						c.push(arguments[i][n]);
					}
				}
			}
			return c;
		},
		indexOf:function(element){
			for(var i=0;i<this.length;i++){
				if( 
					this[i]==element ||
					( this[i]['is'] && this[i].is(element))
				){
					return i;
				}
			}
			return -1;
		},
		filter:function(){
			var args=Array.prototype.slice.call(arguments);
			return(
				this.length?
				new this.type(Array.prototype.filter.apply(this,args)):
				new this.type()
			);
		},
		is:function(a){
			if(this.length!=a.length){return false;}
			for(var i=0;i<this.length;i++){
				if(this[i]!=a[i] && !(this[i]['is'] && a[i]['is'] && this[i].is(a[i]))){
					return false;
				}
			}
			return true;
		}
	}
	dx.extend({Array:ExtensibleArray});
})(dx)