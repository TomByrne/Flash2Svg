(function(ext){
	/**
	 * @this extensible.Object
	 * @extends Object
	 * @constructor
	 * @parameter {Object} obj A native object.
	 * @parameter {Number,Boolean} recursive If true, converts descendant Objects
	 * to class extensible.Object, and converts descendant Arrays to class extensible.Array.
	 * If a Number is passed, converts descendants up to the [recursive] generation. 
	 */
	function ExtensibleObject(obj,recursive){
		if(obj){
			for(var i in obj){
				if(obj.hasOwnProperty(i)){
					var element=obj[i];
					if(recursive && element && !element.type){
						switch(element.constructor.name){
							case 'Array':
								this[i]=new ext.Array(
									obj[i],
									(
										typeof(recursive)=='number'?
										recursive-1:
										recursive
									)
								);
								break;
							case 'Object':
								this[i]=new this.type(
									obj[i],
									(
										typeof(recursive)=='number'?
										recursive-1:
										recursive
									)
								);
								break;
							default:
								this[i]=obj[i];
						}
					}else{
						this[i]=element;
					}
				}
			}
		}
		return this;
	}
	ExtensibleObject.prototype={
		__proto__:Object.prototype,
		/**
		 * Provides a reference to the class constructor.
		 * @see extensible.Object
		 * @property
		 */
		type:ExtensibleObject,
		all:function(){
			var result={};
			for(var k in this){
				if(
					this.hasOwnProperty(k)
				){
					result[k]=this[k];
				}
			}
			return result;
		},
		clear:function(keys){
			keys=keys||this.keys;
			for(var i=0;i<keys.length;i++){
				delete this[keys[i]];
			}
		},
		each:function(iterator,context,args){
			var empty=new this.type();
			context=context || this;
			args=args||[];
			for(var k in this){
				if(this.hasOwnProperty(k)){
					var a=args;
					a.splice(0,0,this[k],k);
					iterator.apply(context,a);
				}	
			}
			return all;
		},
		extend:function(obj,recursive){
			if(!obj){return;}
			for(var n in obj){
				if(
					obj.hasOwnProperty(n) &&
					obj[n]!==null &&
					obj[n]!==undefined
				){
					if(
						recursive  
						&& typeof(this[n])==typeof(obj[n])
					){
						if(typeof(recursive)=='number'){
							recursive-=1;
						}
						if(obj[n] instanceof Array){
							this[n]=new ext.Array(this[n]);
							this[n].extend(obj[n],recursive);
						}else if(obj[n] instanceof Object){
							this[n]=new ext.Object(this[n]);
							this[n].extend(obj[n],recursive);
						}else if(obj[n]!==null){
							this[n]=obj[n];
						}
					}else{
						this[n]=obj[n];	
					}
				}
			}
		},
		/**
		 * @parameter element An element to search for.
		 * @see Array.indexOf
		 * @return {String} The key corresponding the the given element.
		 */
		indexOf:function(element){
			for(k in this){
				if(
					this.hasOwnProperty(k)&& (
						this[k]==element || ( 
							this[k]['is'] && 
							this[k].is(element)
						)
					)
				){
					return k;
				}
			}
		},
		/**
		 * @parameter {Object} object
		 * @return {Boolean} true if the object is equivalent to [this].
		 */
		is:function(object,options){
			if(typeof(object)!='object'){return;}
			if(!(object instanceof this.type)){
				object=new this.type(object);
			}
			var settings=new ext.Object({
				ignore:null,//list of attributes to ignore, defaults to none
				checklist:null//list of attributes to check, defaults to all
			});
			settings.extend(options);
			if(settings.ignore && !(settings.ignore instanceof ext.Array)){
				settings.ignore=new ext.Array(settings.ignore)
			}
			if(settings.checklist && !(settings.checklist instanceof ext.Array)){
				settings.checklist=new ext.Array(settings.checklist)
			}
			var keys=settings.checklist||object.keys;
			for(var i=0;i<keys.length;i++){
				var k=keys[i];
				if(
					(!settings.ignore || settings.ignore.indexOf(k)<0) && (
						!(object[k] instanceof Function) && (
							(Boolean(object[k]) != Boolean(this[k])) || (
								this[k]!=object[k] && 
								!(this[k]['is'] && this[k].is(object[k]))
							)
						)
					)
				){
					return false;
				}
			}
			return true;
		},
		/**
		 * A list of the properties belonging to this object ( not it's prototype ).
		 * @property
		 */
		get keys(){
			var keys=new ext.Array();
			for(k in this){
				if(
					this.hasOwnProperty(k)
				){
					keys.push(k);
				}
			}
			return keys;
		},
		/*
		 * Deletes specified keys.
		 * @parameter {Array,String} keys A key or array of keys.
		 */
		remove:function(keys){
			if(typeof(keys)=='string'){
				keys=[keys];
			}else if(typeof(keys)!='array'){
				return;
			}
			for(var i=0;i<keys.length;i++){
				if(this[keys[i]]){
					delete this[keys[i]];
				}
			}
		},
		/*
		 * @parameter {String} key
		 * @return {String} If key is unique, returns key, otherwise appends or increments
		 * an integer suffix and returns a unique key.
		 */
		uniqueKey:function(key){
			if(typeof(key)!='string'){return;}
			if(this[key]!==undefined){
				if(/[\d]*$/.test(key)){
					return this.uniqueKey(key.replace(/[\d]*$/,String(Number(/[\d]*$/.exec(key)[0])+1)));
				}else{
					return  this.uniqueKey(key+"1");
				}
			}
			return key;
		},
		/*
		 * @see Object.toSource()
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
			var keys=this.keys;
			for(var i=0;i<keys.length;i++){
				if(this[keys[i]]!==undefined && this[keys[i]]!==null){
					var str=String(keys[i])+':';
					if(typeof this[keys[i]]=='number'){
						str+=String(this[keys[i]]);
					}else if(typeof this[keys[i]]=='string'){
						str+='"'+String(this[keys[i]])+'"';
					}else{
						if(maxRecursions>0){
							str+=this[keys[i]].toSource(maxRecursions-1,tabs+1);
						}else{
							str+=String(this[keys[i]]);
						}
					}
					result.push(str);
				}
			}
			return '{\n\t'+tabString+result.join(',\n\t'+tabString)+'\n'+tabString+'}';
		},
		toString:this.toSource
	};
	ext.extend({Object:ExtensibleObject});
})(extensible)