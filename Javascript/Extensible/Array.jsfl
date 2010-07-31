(function(ext){
	/*
	 * extensible.Array
	 * @this {extensible.Array}
	 * @extends Array
	 * @constructor
	 * @parameter {Array} array
	 */
	var ExtensibleArray=function(array,recursive){
		if(
			(arguments.length==1 && array instanceof Array) || 
			(arguments.length==2 && array instanceof Array && typeof(recursive)=='number' )
		){
			Array.prototype.splice.apply(
				this,[0,0].concat(
					Array.prototype.slice.call(array)
				)
			);
			this.attributes=array.attributes;
			if(recursive){
				for(var i=0;i<this.length;i++){
					if(!this[i].type){
						switch(this[i].constructor.name){
							case 'Array':
								this[i]=new this.type(
									this[i],
									(
										typeof(recursive)=='number'?
										recursive-1:
										recursive
									)
								);
								break;
							case 'Object':
								this[i]=new ext.Object(
									this[i],
									(
										typeof(recursive)=='number'?
										recursive-1:
										recursive
									)
								);
						}
					}
				}
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
		/**
		 * @return {Array} a native javascript Array.
		 */
		get $(){
			return Array.prototype.slice.call(this);
		},
		/**
		 * @parameter {Number} index A positive or negative integer.
		 * @return The element at the specified index if positive, 
		 * or the element at this.length-index if negative.
		 */
		at:function(index){
			if(index<0){
				return this[this.length+index];
			}else{
				return this[index];	
			}
		},
		/**
		 * @property {Object} An Object containing the non-enumerable properties of the Array object. 
		 */
		get attributes(){
			var attributes={};
			for(attr in this){
				if(
					this.hasOwnProperty(attr) &&
					typeof(attr)=='string' &&
					attr!='length' &&
					!/^\d*\d$/.test(attr) 
				){
					try{
						attributes[attr]=this[attr];
					}catch(e){
						ext.warn(
							'extensible.Array.attibutes - 1 - could not retrieve value for '+
							attr+'\n'+String(e)+'\n'+this.toSource()
						);
					}
				}
			}
			return attributes;
		},
		set attributes(attributes){
			if(!attributes){
				return;
			}
			for(attr in attributes){
				if(
					attributes.hasOwnProperty(attr) &&
					typeof(attr)=='string' &&
					attr!='length' &&
					!/^\d*\d$/.test(attr) 
				){
					this[attr]=attributes[attr];
				}
			}
		},
		/**
		 * @parameter {Boolean} capitalize If true, the first letter will be capitalized.
		 * @return {String} A joined string in camelCase format. 
		 */
		ccJoin:function(capitalize){ // [camel,casing] >> camelCasing
			output="";
			for(var i=0;i<this.length;i++){
				var n=String(this[i]);
				if(n.length){
					output+=i==0 && !capitalize ? n : n[0].toUpperCase()+n.slice(1);
				}
			}
			return output;
		},
		/**
		 * Clears all enumberable elements and (optionally) populates the Array with new elements.
		 * @parameter {Array} newElements An array of elements to add after clearing the array.
		 */
		clear:function(newElements){
			if(newElements){
				newElements.unshift(0,this.length);
				if(newElements instanceof this.type){
					newElements=newElements.$;
				}
				Array.prototype.splice.apply(this,newElements);
			}else{
				this.splice(0,this.length);
			}
			return this;
		},
		/**
		 * @return A concatenated array of class [this.type].
		 */
		concat:function(){
			try{ // catch recursion
				var c=new this.type(this);
			}catch(e){
				return;
			}
			for(var i=0;i<arguments.length;i++){
				if(arguments[i].constructor.name=='Array'){
					for(var n=0;n<arguments[i].length;n++){
						c.push(arguments[i][n]);
					}
				}
			}
			return c;
		},
		/**
		 * @parameter {Array} array Extends this with the elements of array.
		 * @parameter {Boolean} noDuplicates Prevents the addition of redundant
		 * elements. Does not remove existing redundancies.
		 */
		extend:function(array,noDuplicates){
			if(noDuplicates){
				for(var i=0;i<array.length;i++){
					if(this.indexOf(array[i])<0){
						this.push(array[i]);
					}
				}
			}else{
				if(array instanceof this.type){
					this.push.apply(this,array.$);
				}else{
					this.push.apply(this,array);
				}
			}
			return this;
		},
		/**
		 * Works like the native javascript method Array.filter(), but returns an object of class [this.type].
		 * @see Array.filter
		 */
		filter:function(){
			var filtered=new this.type(this);
			var a=Array.prototype.filter.apply(this,arguments);
			filtered.clear(a);
			return(filtered);
		},
		/**
		 * @parameter {Boolean} recursive If true, reverses child Arrays.
		 * @return A copy of [this], in reversed order.
		 */
		getReversed:function(recursive){
			try{ // catch recursion
				var r=new this.type(this);
			}catch(e){
				return;
			}
			r.reverse();
			if(recursive){
				for(var i=0;i<r.length;i++){
					if(r[i] instanceof Array){
						try{ // catch recursion
							r[i]=(new this.type(r[i])).getReversed(recursive);
						}catch(e){
							return;
						}
					}
				}
			}
			return r;
		},
		/**
		 * Works like the native javascript method Array.indexOf(), but return an object of class [this.type].
		 * @see Array.indexOf
		 */
		indexOf:function(element){
			for(var i=0;i<this.length;i++){
				try{
					if(
						(
							this[i]==element && this[i]!==undefined && this[i]!==null
						)||(
							this[i]===element
						)||( 
							this[i]!==undefined && 
							this[i]!==null && 
							this[i]['is'] && 
							this[i].is(element)
						)
					){
						return i;
					}
				}catch(e){
					ext.warn(
						'extensible.Array.indexOf() - 1 - '+String(element)+'\n'+
						String(this)+'\n'+String(e)
					);	
				}
			}
			return -1;
		},
		/**
		 * @parameter {Array} array An array with which to compare [this].
		 * @return An Array object of type this.type containing the elements
		 * present in this and present in array, in the order they appear in [this].
		 */
		intersect:function(array){
			if(!array instanceof Array){
				return new this.type();
			}
			if(array.length==0){
				return new this.type();
			}
			try{ // catch recursion
				if(!(array instanceof this.type)){
					array=new this.type(array);
				}
			}catch(e){
				return;
			}
			var filtered=this.filter(function(element,index){
				return(this.indexOf(element)>=0);
			},array);
			return filtered;
		},
		/**
		 * @parameter {Array} array An Array object with which to compare [this].
		 * @return {Boolean} Returns true if the elements of [this] match the elements of array.
		 */
		is:function(array,options){
			if(this.length!=array.length){
				return false;
			}
			if(ext.log){
				var timer=ext.log.startTimer('extensible.Array.is');
			}
			for(var i=0;i<this.length;i++){
				try{
					if(this[i]!=array[i] && !(this[i]['is'] && this[i].is(array[i],options))){
						if(ext.log){
							ext.log.pauseTimer(timer);
						}
						return false;
					}
				}catch(e){
					ext.warn(
						'extensible.Array.is() - 1 - '+String(e)
					);	
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return true;
		},
		/**
		 * @parameter array
		 * @parameter noDuplicates
		 */
		prepend:function(array,noDuplicates){
			if(noDuplicates){
				for(var i=0;i<array.length;i++){
					if(this.indexOf(array[i])<0){
						this.unshift(array[i]);
					}
				}
			}else{
				Array.prototype.unshift.apply(this,array.$||array);
			}
			return this;
		},
		removeDuplicates:function(){
			for(var i=0;i<this.length;i++){
				if(this.slice(0,i).indexOf(this[i])>-1){
					this.splice(i,1);	
				}
			}
			return this;
		},
		/**
		 * @parameter elements An element, or an array of elements, to remove from [this].
		 * @return An Array object of class [this.type] with elements matching any in [array]
		 * removed.
		 */
		remove:function(){
			var args=Array.prototype.slice.call(arguments);
			if(args.length==1 && args[0] instanceof Array){
				rlist=args[0];
			}else if(args.length>0){
				rlist=Array.prototype.slice.call(args);
			}else{
				rlist=[undefined];
			}
			if(!(rlist instanceof this.type)){
				rlist=new this.type(rlist);
			}
			var filtered=this.filter(function(element,index,array){
				return rlist.indexOf(element)<0 ;
			});
			return filtered;
		},
		/**
		 * Reverses the order of the enumerable elements in [this].
		 * @parameter {Boolean} recursive If true, child Array elements are also reversed.
		 */
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
		/**
		 * @parameter {Number} i A positive or negative integer.
		 * @return An object of class [this.type] whith the element at index i removed.
		 */
		removeAt:function(i){
			return this.filter(function(element,index,array){
				return(index!=i);
			});
		},
		/**
		 * A copy of [this], in reversed order.
		 */
		get reversed(){
			return this.getReversed();
		},
		set reversed(){
			return;
		},
		/**
		 * @see Array.toSource()
		 * @addon
		 */
		toSource:function(maxRecursions){
			maxRecursions=maxRecursions!==undefined?maxRecursions:3;
			var args=Array.prototype.slice.call(arguments);
			var tabs=args.length>1?args[1]:0;
			var result=[];
			var tabString='';
			for(var i=0;i<tabs;i++){
				tabString+='\t';	
			}
			for(var i=0;i<this.length;i++){
				if(this[i]!==undefined && this[i]!==null){
					if(typeof this[i]=='number'){
						var str=String(this[i]);
					}else if(typeof this[i]=='string'){
						var str='"'+String(this[i])+'"';
					}else{
						if(maxRecursions>0){
							var str=this[i].toSource(maxRecursions-1,tabs+1);
						}else{
							var str=String(this[i]);
						}
					}
					result.push(str);
				}
			}
			return '[\n\t'+tabString+result.join(',\n\t'+tabString)+'\n'+tabString+']';
		}
	}
	ext.extend({Array:ExtensibleArray});
})(extensible)