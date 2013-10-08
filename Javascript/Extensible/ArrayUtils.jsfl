(function(ext){
	ArrayUtils = {};
	ext.ArrayUtils = ArrayUtils;

	/**
	 * @parameter {Number} index A positive or negative integer.
	 * @return The element at the specified index if positive, 
	 * or the element at this.length-index if negative.
	 */
	ArrayUtils.at = function(array, index){
		if(index==null){
			return array[array.length-1];
		}else if(index<0){
			return array[array.length+index];
		}else{
			return array[index];	
		}
	}
	/**
	 * Clears all enumberable elements and (optionally) populates the Array with new elements.
	 * @parameter {Array} newElements An array of elements to add after clearing the array.
	 */
	ArrayUtils.clear = function(array, newElements){
		if(newElements){
			newElements.unshift(0,array.length);
			if(newElements instanceof array.type){
				newElements=newElements.$;
			}
			Array.prototype.splice.apply(array,newElements);
		}else{
			array.splice(0,array.length);
		}
		return array;
	}

	/**
	 * @parameter {Array} array Extends this with the elements of array.
	 * @parameter {Boolean} noDuplicates Prevents the addition of redundant
	 * elements. Does not remove existing redundancies.
	 */
	ArrayUtils.extend = function(array1, array2, noDuplicates){
		if(noDuplicates){
			for(var i=0;i<array2.length;i++){
				if(array1.indexOf(array2[i])<0){
					array1.push(array2[i]);
				}
			}
		}else{
			if(array2 instanceof array1.type){
				array1.push.apply(array1,array2.$);
			}else{
				array1.push.apply(array1,array2);
			}
		}
		return array1;
	}

	/**
	 * Works like the native javascript method Array.filter(), but returns an object of class [this.type].
	 * @see Array.filter
	 */
	ArrayUtils.filter = function(array){
		return new array.type(Array.prototype.filter.apply(array,arguments));
	}
	/**
	 * @parameter {Boolean} recursive If true, reverses child Arrays.
	 * @return A copy of [this], in reversed order.
	 */
	ArrayUtils.getReversed = function(array, recursive){
		try{ // catch recursion
			var r=new array.type(array);
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
	}

	/**
	 * @parameter {Array} array An Array object with which to compare [this].
	 * @return {Boolean} Returns true if the elements of [this] match the elements of array.
	 */
	ArrayUtils.is=function(array1, array2, options){
		if(array1.length!=array2.length){
			return false;
		}
		for(var i=0;i<array1.length;i++){
			var val1 = array1[i];
			var val2 = array2[i]
			if(val1!=val2 && 
				!(val1['is'] && val1.is(val2,options)) &&
				!((val1 instanceof Array) && (val2 instanceof Array) && ArrayUtils.is(val1, val2))){
				return false;
			}
		}
		return true;
	}
	/**
	 * @parameter elements An element, or an array of elements, to remove from [this].
	 * @return An Array object of class [this.type] with elements matching any in [array]
	 * removed.
	 */
	ArrayUtils.remove=function(array, item){
		var args=Array.prototype.slice.call(arguments);
		if(args.length==1 && args[0] instanceof Array){
			rlist=args[0];
		}else if(args.length>0){
			rlist=Array.prototype.slice.call(args);
		}else{
			rlist=[];
		}
		if(rlist.length==0){
			return array;
		}
		if(!(rlist instanceof ext.Array)){
			rlist=new ext.Array(rlist);
		}
		var f=array.filter(function(element,index,array){
			return array.indexOf(element)<0;
		},rlist);
		return f;
	}
	/**
	 * Reverses the order of the enumerable elements in [this].
	 * @parameter {Boolean} recursive If true, child Array elements are also reversed.
	 */
	ArrayUtils.reverse = function(array, recursive){
			array.isReversed=array.isReversed?false:true;
			Array.prototype.reverse.apply(array,arguments);
			if(recursive){
				for(var i=0;i<array.length;i++){
					if(array[i] instanceof Array){
						array[i]=array[i].reverse(recursive);
					}
				}
			}
			return array;
		}
})(extensible)
