(function(ext){
	var ExtensibleArray=function(array){
		if(arguments.length==1 && array instanceof Array){
			Array.prototype.splice.apply(
				this,[0,0].concat(
					Array.prototype.slice.call(array)
				)
			);
			if(array instanceof this.type){
				ext.Object.apply(this,[array]);
			}
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
				if(n.length){
					output+=i==0 && !capitalize ? n : n[0].toUpperCase()+n.slice(1);
				}
			}
			return output;
		},
		extend:function(array,noDuplicates){
			for(var i=0;i<array.length;i++){
				if(!noDuplicates || this.indexOf(array[i])<0){
					this.push(array[i]);
				}
			}
			return this;
		},
		prepend:function(array,noDuplicates){
			for(var i=0;i<array.length;i++){
				if(!noDuplicates || this.indexOf(array[i])<0){
					this.unshift(array[i]);
				}
			}
			return this;
		},
		clear:function(nlist){
			if(nlist){
				nlist.unshift(0,this.length);
				if(nlist instanceof this.type){
					nlist=nlist.$;
				}
				Array.prototype.splice.apply(this,nlist);
			}else{
				this.splice(0,this.length);
			}
			return this;
		},
		intersect:function(ilist){
			if(!ilist || ilist.constructor.name!='Array'){return new this.type();}
			if(ilist.length==0){return new this.type();}
			ilist=new this.type(ilist);
			var filtered=this.filter(function(element,index){
				return(ilist.indexOf(element)>=0);
			});
			return filtered;
		},
		remove:function(rlist){
			if(arguments.length==1 && arguments[0] instanceof Array){
				rlist=arguments[0];
			}else if(rlist){
				rlist=Array.prototype.slice.call(arguments);
			}else{
				rlist=[undefined];
			}
			return this.filter(function(element,index,array){
				return(rlist.indexOf(element)<0);
			});
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
		reverse:function(recursive){
			this.isReversed=this.isReversed?false:true;
			Array.prototype.reverse.apply(this,arguments);
			if(recursive){
				for(var i=0;i<this.length;i++){
					if(this[i] instanceof Array){
						this[i].reverse(recursive);
					}
				}
			}
			return this;
		},
		getReversed:function(recursive){
			var r=new this.type(this);
			r.reverse();
			if(recursive){
				for(var i=0;i<r.length;i++){
					if(r[i] instanceof Array){
						r[i]=(new this.type(r[i])).getReversed(recursive);
					}
				}
			}
			return r;
		},
		at:function(index){
			if(index<0){
				return this[this.length+index];
			}else{
				return this[index];	
			}
		},
		removeAt:function(i){
			return this.filter(function(element,index,array){
				return(index!=i);
			});
		},
		get reversed(){
			return this.getReversed();
		},
		set reversed(){
			return;
		},
		filter:function(){
			var filtered=new this.type(this);
			var a=Array.prototype.filter.apply(this,arguments);
			filtered.clear(a);
			return(filtered);
		},
		is:function(a,options){
			if(this.length!=a.length){return false;}
			for(var i=0;i<this.length;i++){
				if(this[i]!=a[i] && !(this[i]['is'] && this[i].is(a[i],options))){
					return false;
				}
			}
			return true;
		}
	}
	ext.extend({Array:ExtensibleArray});
})(extensible)