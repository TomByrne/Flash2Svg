(function(ext){
	function ExtensibleObject(obj){
		if(obj){
			for(var i in obj){
				if(obj.hasOwnProperty(i)){
					var element=obj[i];
					if(element && !element.type){
						switch(element.constructor.name){
							case 'Array':
								this[i]=new ext.Array(obj[i]);
								break;
							case 'Object':
								this[i]=new this.type(obj[i]);
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
		type:ExtensibleObject,
		each:function(iterator,context,args){
			var empty=new this.type();
			context=context || this;
			args=args||[];
			for(k in this){
				if(this.hasOwnProperty(k)){
					var a=args;
					a.splice(0,0,this[k],k);
					iterator.apply(context,a);
				}	
			}
			return all;
		},
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
		clear:function(keys){
			keys=keys||this.keys;
			for(var i=0;i<keys.length;i++){
				delete this[keys[i]];
			}
		},
		extend:function(obj,recursive){
			for(var n in obj){
				if(obj.hasOwnProperty(n)){
					if(
						recursive && 
						typeof(this[n])==typeof(obj[n])
					){
						if(this[n].constructor.name=='Object'){
							this[n]=new ext.Object(this[n]);
							this[n].extend(obj[n],recursive);
						}else if(this[n].constructor.name=='Array'){
							this[n]=new ext.Array(this[n]);
							this[n].extend(obj[n],recursive);
						}else{
							this[n]=obj[n];
						}
					}else{
						this[n]=obj[n];	
					}
				}
			}
		},
		remove:function(r){
			if(typeof(r)=='string'){
				r=[r];
			}else if(typeof(r)!='array'){
				return;
			}
			for(var i=0;i<r.length;i++){
				if(this[r[i]]){
					delete this[r[i]];
				}	
			}
		},
		uniqueKey:function(k){
			if(typeof(k)!='string'){return;}
			if(this[k]!==undefined){
				if(/\_[\d]*?$/.test(k)){
					return this.uniqueKey(k.replace(/[\d]*?$/,String(Number(/[\d]*?$/.exec(k)[0])+1)));
				}else{
					return  this.uniqueKey(k+"_1");
				}
			}
			return k;
		},
		is:function(o,options){
			if(typeof(o)!='object'){return;}
			if(!(o instanceof this.type)){
				o=new ext.Object(o);	
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
			var keys=settings.checklist||o.keys;
			for(var i=0;i<keys.length;i++){
				var k=keys[i];
				if(
					(!settings.ignore || settings.ignore.indexOf(k)<0) && (
						!(o[k] instanceof Function) && (
							(Boolean(o[k]) != Boolean(this[k])) || (
								this[k]!=o[k] && 
								!(this[k]['is'] && this[k].is(o[k]))
							)
						)
					)
				){
					return false;
				}
			}
			return true;
		}
	}
	ext.extend({Object:ExtensibleObject});
})(extensible)